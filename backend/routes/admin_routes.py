# backend/routes/admin_routes.py
from __future__ import annotations

import os
import asyncio
import threading
from datetime import datetime
import urllib.parse
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError

from config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_TOKEN_SECRET,
    FRONTEND_URL,
    MAINTENANCE_INTERNAL_TOKEN,
)
from database import admins_collection
from utils.email_utils import send_admin_reset_email
from passlib.hash import bcrypt
import secrets

router = APIRouter(prefix="/api/admin", tags=["admin"])
security = HTTPBearer()

# ── Data directory paths ─────────────────────────────────
RAG_DATA_ROOT = Path(__file__).parent.parent.parent / "rag" / "data"
SCHEMAS_INDEX_PATH = RAG_DATA_ROOT / "schemas_index.txt"

# ── Dynamic category discovery ──────────────────────────
def get_category_dirs() -> dict[str, Path]:
    """Dynamically discover category directories in RAG_DATA_ROOT."""
    # Special mappings: API key -> OS folder path
    dirs = {
        "faculty":       RAG_DATA_ROOT / "faculty",
        "policies":      RAG_DATA_ROOT / "policies",
        "programs":      RAG_DATA_ROOT / "programs",
        "schemas":       RAG_DATA_ROOT / "schema",
        "scholarships":  RAG_DATA_ROOT / "scholarships",
        "introduction":  RAG_DATA_ROOT / "introduction",
        "fyp":           RAG_DATA_ROOT / "FYP",
    }
    
    # Explicitly exclude folders handled by automation or internal systems
    EXCLUDED = {"events", "timetable", "__pycache__", "embeddings", ".git", "vector_db", "vectorstores"}

    if RAG_DATA_ROOT.exists():
        for item in os.listdir(RAG_DATA_ROOT):
            item_path = RAG_DATA_ROOT / item
            if not item_path.is_dir() or item.lower() in EXCLUDED:
                continue
            
            # If not already mapped via the special mappings above
            if all(not item_path.samefile(p) for p in dirs.values() if p.exists()):
                dirs[item.lower()] = item_path
                
    return dirs

# ── Global maintenance state ─────────────────────────────
_maintenance_mode = False
_rebuild_status = {"running": False, "message": "", "success": None}
_last_rebuild_at = None  # ISO timestamp of last successful rebuild


# ── Auth helpers ─────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class FileUpdateRequest(BaseModel):
    content: str


class MaintenanceToggleRequest(BaseModel):
    maintenance: bool
    reason: Optional[str] = None


class CategoryCreateRequest(BaseModel):
    name: str


def _create_admin_token() -> str:
    from controllers.auth_controller import create_token
    return create_token({"sub": ADMIN_EMAIL, "role": "admin"}, expires_seconds=604800)  # 7 days


def _verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency: verify the bearer token is a valid admin JWT."""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not an admin token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")


# ── Login ────────────────────────────────────────────────
@router.post("/login")
async def admin_login(body: LoginRequest):
    # 1. Try finding in DB
    admin = await admins_collection.find_one({"email": body.email})
    
    if not admin:
        # Fallback to .env for initial setup/migration
        if body.email == ADMIN_EMAIL and body.password == ADMIN_PASSWORD:
            # First time login with .env credentials - seed the DB
            await admins_collection.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {
                    "email": ADMIN_EMAIL,
                    "hashed_password": bcrypt.hash(ADMIN_PASSWORD),
                    "created_at": datetime.utcnow()
                }},
                upsert=True
            )
            token = _create_admin_token()
            return {"token": token, "email": ADMIN_EMAIL}
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 2. Check hashed password
    if not bcrypt.verify(body.password, admin.get("hashed_password")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _create_admin_token()
    return {"token": token, "email": body.email}


@router.post("/forgot-password")
async def admin_forgot_password(body: ForgotPasswordRequest):
    # Only allow for the configured admin email
    if body.email.lower() != ADMIN_EMAIL.lower():
        # Security: Don't reveal if email exists or not, but for admin we can be stricter or just silent
        return {"message": "If this email is registered, a reset link will be sent."}

    # Ensure admin exists in DB (might need migration if they never logged in)
    admin = await admins_collection.find_one({"email": body.email.lower()})
    if not admin:
        # Seed it now if matched with .env
        await admins_collection.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {
                "email": ADMIN_EMAIL,
                "hashed_password": bcrypt.hash(ADMIN_PASSWORD),
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )

    # Generate token
    from datetime import timedelta, timezone
    payload = {
        "sub": body.email.lower(),
        "purpose": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=20)
    }
    token = jwt.encode(payload, ADMIN_TOKEN_SECRET, algorithm=JWT_ALGORITHM)
    
    # Send email
    reset_link = f"{FRONTEND_URL}/admin/reset-password?token={token}"
    try:
        send_admin_reset_email(to_email=body.email.lower(), reset_link=reset_link)
    except Exception as e:
        print(f"[ADMIN] Failed to send reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reset email")

    return {"message": "Reset link sent successfully"}


@router.post("/reset-password")
async def admin_reset_password(body: ResetPasswordRequest):
    try:
        payload = jwt.decode(body.token, ADMIN_TOKEN_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("purpose") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token purpose")
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Update password in DB
    res = await admins_collection.update_one(
        {"email": email},
        {"$set": {"hashed_password": bcrypt.hash(body.new_password)}}
    )
    
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Admin account not found")

    return {"message": "Password reset successful"}


# ── Dashboard overview ───────────────────────────────────
@router.get("/overview", dependencies=[Depends(_verify_admin)])
async def admin_overview():
    """Return file counts per category."""
    overview = {}
    categories = get_category_dirs()
    for cat, dirpath in categories.items():
        if dirpath.exists():
            files = [f for f in os.listdir(dirpath) if not f.startswith("~$")]
            overview[cat] = {"count": len(files), "path": str(dirpath)}
        else:
            overview[cat] = {"count": 0, "path": str(dirpath)}
    return {"categories": overview, "last_rebuild_at": _last_rebuild_at}


@router.post("/categories", dependencies=[Depends(_verify_admin)])
async def create_category(body: CategoryCreateRequest):
    """Create a new category folder in rag/data."""
    # Simple sanitization
    name = body.name.strip().replace(" ", "_").lower()
    if not name:
        raise HTTPException(status_code=400, detail="Category name cannot be empty")
    
    EXCLUDED = {"events", "timetable", "__pycache__", "embeddings", ".git", "vector_db", "vectorstores"}
    if name in EXCLUDED:
        raise HTTPException(status_code=400, detail=f"Category name '{name}' is reserved")
    
    dirpath = RAG_DATA_ROOT / name
    if dirpath.exists():
         raise HTTPException(status_code=400, detail="Category already exists")
    
    try:
        dirpath.mkdir(parents=True, exist_ok=True)
        return {"message": f"Category '{name}' created successfully", "key": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create directory: {str(e)}")


@router.delete("/categories/{category}", dependencies=[Depends(_verify_admin)])
async def delete_category(category: str):
    """Delete a category folder from rag/data."""
    # Restricted categories that are managed by automation (Events & Timetable)
    AUTOMATED_FOLDERS = {"events", "timetable"}
    
    if category.lower() in [c.lower() for c in AUTOMATED_FOLDERS]:
        raise HTTPException(status_code=403, detail=f"Category '{category}' is managed by automated scripts and cannot be manually deleted.")

    categories = get_category_dirs()
    dirpath = categories.get(category)
    
    if not dirpath or not dirpath.exists():
        raise HTTPException(status_code=404, detail="Category not found")
        
    try:
        import shutil
        # Safety: Verify the target is actually inside RAG_DATA_ROOT
        target_abs = dirpath.absolute()
        root_abs = RAG_DATA_ROOT.absolute()
        if not str(target_abs).startswith(str(root_abs)):
             raise HTTPException(status_code=403, detail="Unsafe directory operation")

        shutil.rmtree(dirpath)
        return {"message": f"Category '{category}' deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete category: {str(e)}")


# ── List files in a category ─────────────────────────────
def _parse_department_from_faculty(filepath: Path) -> str:
    """Extract department from a faculty .txt file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("Department:"):
                    return line.strip().replace("Department:", "").strip()
    except Exception:
        pass
    return "Other"


@router.get("/categories/{category}/files", dependencies=[Depends(_verify_admin)])
async def list_files(category: str):
    dirpath = get_category_dirs().get(category)
    if not dirpath or not dirpath.exists():
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    files = []
    for f in sorted(os.listdir(dirpath)):
        if f.startswith("~$"):
            continue
        fpath = dirpath / f
        stat = fpath.stat()
        entry = {
            "name": f,
            "size": stat.st_size,
            "modified": stat.st_mtime,
            "type": "pdf" if f.lower().endswith(".pdf") else "txt",
        }
        # For faculty files, add department
        if category == "faculty" and f.endswith(".txt"):
            entry["department"] = _parse_department_from_faculty(fpath)
        files.append(entry)

    return {"category": category, "files": files}


# ── Read file content ────────────────────────────────────
@router.get("/categories/{category}/files/{filename}", dependencies=[Depends(_verify_admin)])
async def read_file(category: str, filename: str):
    dirpath = get_category_dirs().get(category)
    if not dirpath:
        raise HTTPException(status_code=404, detail="Category not found")

    decoded = urllib.parse.unquote(filename)
    filepath = dirpath / decoded

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if decoded.lower().endswith(".txt"):
        content = filepath.read_text(encoding="utf-8")
        return {"name": decoded, "type": "txt", "content": content}
    else:
        # For PDFs, return download URL
        return {
            "name": decoded,
            "type": "pdf",
            "content": None,
            "download_url": f"/api/admin/categories/{category}/download/{urllib.parse.quote(decoded)}",
        }


# ── Download file (for PDFs) ─────────────────────────────
@router.get("/categories/{category}/download/{filename}", dependencies=[Depends(_verify_admin)])
async def download_file(category: str, filename: str):
    from fastapi.responses import FileResponse
    dirpath = get_category_dirs().get(category)
    if not dirpath:
        raise HTTPException(status_code=404, detail="Category not found")
    decoded = urllib.parse.unquote(filename)
    filepath = dirpath / decoded
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(filepath), filename=decoded)


# ── Update file content (txt only) ───────────────────────
@router.put("/categories/{category}/files/{filename}", dependencies=[Depends(_verify_admin)])
async def update_file(category: str, filename: str, body: FileUpdateRequest):
    if category == "schemas":
        raise HTTPException(status_code=400, detail="Schema files cannot be edited — upload a replacement instead")

    dirpath = get_category_dirs().get(category)
    if not dirpath:
        raise HTTPException(status_code=404, detail="Category not found")

    decoded = urllib.parse.unquote(filename)
    filepath = dirpath / decoded

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not decoded.lower().endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files can be edited in-place. For PDFs, upload a replacement.")

    filepath.write_text(body.content, encoding="utf-8")
    return {"message": f"File '{decoded}' updated successfully"}


# ── Delete file ──────────────────────────────────────────
@router.delete("/categories/{category}/files/{filename}", dependencies=[Depends(_verify_admin)])
async def delete_file(category: str, filename: str):
    dirpath = get_category_dirs().get(category)
    if not dirpath:
        raise HTTPException(status_code=404, detail="Category not found")

    decoded = urllib.parse.unquote(filename)
    filepath = dirpath / decoded

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    os.remove(filepath)

    # If schema was deleted, regenerate schemas_index.txt
    if category == "schemas":
        _regenerate_schemas_index()

    return {"message": f"File '{decoded}' deleted successfully"}


# ── Upload file ──────────────────────────────────────────
@router.post("/categories/{category}/upload", dependencies=[Depends(_verify_admin)])
async def upload_file(category: str, file: UploadFile = File(...)):
    dirpath = get_category_dirs().get(category)
    if not dirpath:
        raise HTTPException(status_code=404, detail="Category not found")

    dirpath.mkdir(parents=True, exist_ok=True)
    filepath = dirpath / file.filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # If schema was uploaded, regenerate schemas_index.txt
    if category == "schemas":
        _regenerate_schemas_index()

    return {"message": f"File '{file.filename}' uploaded successfully", "name": file.filename}


# ── Replace file (upload new version) ────────────────────
@router.post("/categories/{category}/files/{filename}/replace", dependencies=[Depends(_verify_admin)])
async def replace_file(category: str, filename: str, file: UploadFile = File(...)):
    dirpath = get_category_dirs().get(category)
    if not dirpath:
        raise HTTPException(status_code=404, detail="Category not found")

    decoded = urllib.parse.unquote(filename)
    filepath = dirpath / decoded

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Remove old file
    os.remove(filepath)

    # Save new file (use original name or new name)
    new_filepath = dirpath / file.filename
    content = await file.read()
    with open(new_filepath, "wb") as f:
        f.write(content)

    if category == "schemas":
        _regenerate_schemas_index()

    return {"message": f"File replaced successfully", "old_name": decoded, "new_name": file.filename}


# ── Regenerate schemas_index.txt ─────────────────────────
def _regenerate_schemas_index():
    """Auto-regenerate schemas_index.txt from the schema directory."""
    schema_dir = get_category_dirs()["schemas"]
    lines = [
        "Available Course Schemas (Downloadable PDFs)",
        "=" * 50,
        "",
        "Below are the official course schemas for various programs at Sukkur IBA University.",
        "Click on the download link to access the PDF.",
        "",
    ]

    for f in sorted(os.listdir(schema_dir)):
        if f.lower().endswith(".pdf") and not f.startswith("~$"):
            display_name = f.replace(".pdf", "").replace("-", " ").replace("_", " ")
            encoded = urllib.parse.quote(f)
            lines.append(f"- {display_name}: [Download Schema](/api/schemas/download/{encoded})")
            lines.append("")

    SCHEMAS_INDEX_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"[ADMIN] schemas_index.txt regenerated with {len([f for f in os.listdir(schema_dir) if f.lower().endswith('.pdf') and not f.startswith('~$')])} entries")


# ── Vector Store Rebuild ─────────────────────────────────
def _do_rebuild():
    """Run vector store rebuild in a background thread."""
    global _maintenance_mode, _rebuild_status, _last_rebuild_at
    _maintenance_mode = True
    _rebuild_status = {"running": True, "message": "Rebuilding vector store...", "success": None}

    try:
        import sys
        rag_path = str(Path(__file__).parent.parent.parent / "rag")
        if rag_path not in sys.path:
            sys.path.insert(0, rag_path)

        from vectorstores.universal_vectorStore import build_universal_vectorstore
        build_universal_vectorstore()

        # Reload the retriever in main_graph
        from graph.main_graph import _get_universal_retriever
        import graph.main_graph as mg
        mg._universal_retriever = None  # Force reload on next request

        _last_rebuild_at = datetime.utcnow().isoformat() + "Z"
        _rebuild_status = {
            "running": False, 
            "message": "Vector database rebuilt successfully!", 
            "success": True, 
            "last_rebuild_at": _last_rebuild_at
        }
    except Exception as e:
        print(f"[ADMIN] Rebuild failed: {e}")
        _rebuild_status = {
            "running": False, 
            "message": f"Rebuild failed: {str(e)}", 
            "success": False
        }
    finally:
        _maintenance_mode = False
        # Double check that running is False here just in case of unexpected errors
        _rebuild_status["running"] = False


@router.post("/rebuild", dependencies=[Depends(_verify_admin)])
async def trigger_rebuild():
    global _rebuild_status
    if _rebuild_status.get("running"):
        raise HTTPException(status_code=409, detail="Rebuild already in progress")

    thread = threading.Thread(target=_do_rebuild, daemon=True)
    thread.start()
    return {"message": "Vector store rebuild started"}


@router.get("/rebuild/status", dependencies=[Depends(_verify_admin)])
async def rebuild_status():
    return _rebuild_status


# ── Maintenance mode ─────────────────────────────────────
@router.get("/maintenance")
async def get_maintenance():
    """Public endpoint — no auth required. Frontend polls this."""
    return {"maintenance": _maintenance_mode}


@router.post("/maintenance/internal")
async def set_maintenance_internal(
    body: MaintenanceToggleRequest,
    x_maintenance_token: Optional[str] = Header(None),
):
    """Internal endpoint used by automation scripts (e.g., email ingestion)."""
    global _maintenance_mode
    if not MAINTENANCE_INTERNAL_TOKEN:
        raise HTTPException(status_code=503, detail="Internal maintenance token is not configured")
    if x_maintenance_token != MAINTENANCE_INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized internal maintenance request")

    _maintenance_mode = body.maintenance
    return {
        "ok": True,
        "maintenance": _maintenance_mode,
        "reason": body.reason or "unspecified",
    }


# ── Analytics ────────────────────────────────────────────
@router.get("/analytics", dependencies=[Depends(_verify_admin)])
async def admin_analytics():
    """Return analytics data for the admin dashboard."""
    from database import chat_messages_collection, feedback_collection
    from datetime import datetime, timedelta
    import traceback

    try:
        # Daily query counts (last 7 days)
        now = datetime.utcnow()
        daily_counts = []
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            count = await chat_messages_collection.count_documents({
                "sender": "user",
                "created_at": {"$gte": day_start, "$lt": day_end}
            })
            daily_counts.append({
                "date": day_start.strftime("%b %d"),
                "count": count,
            })

        # Total queries
        total_queries = await chat_messages_collection.count_documents({"sender": "user"})

        # Feedback stats
        total_feedback = await feedback_collection.count_documents({})
        thumbs_up = await feedback_collection.count_documents({"rating": "up"})
        thumbs_down = await feedback_collection.count_documents({"rating": "down"})

        # Recent feedback (last 20)
        cursor = feedback_collection.find().sort("created_at", -1).limit(20)
        recent = []
        async for doc in cursor:
            # Safer date handling
            created_at = doc.get("created_at")
            if isinstance(created_at, datetime):
                created_at_str = created_at.isoformat()
            elif created_at:
                created_at_str = str(created_at)
            else:
                created_at_str = None

            recent.append({
                "rating": doc.get("rating"),
                "query": doc.get("query", "")[:100] if doc.get("query") else "",
                "response_text": doc.get("response_text", "")[:150] if doc.get("response_text") else "",
                "created_at": created_at_str,
            })

        return {
            "daily_counts": daily_counts,
            "total_queries": total_queries,
            "feedback": {
                "total": total_feedback,
                "thumbs_up": thumbs_up,
                "thumbs_down": thumbs_down,
                "satisfaction_rate": round((thumbs_up / total_feedback * 100)) if total_feedback > 0 else 0,
            },
            "recent_feedback": recent,
        }
    except Exception as e:
        print(f"Analytics Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analytics failed: {str(e)}")

