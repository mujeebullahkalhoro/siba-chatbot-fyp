import os
import sys
import json
from datetime import datetime
from pathlib import Path
from urllib import request as urllib_request

from dotenv import load_dotenv


RAG_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(RAG_DIR))

from vectorstores.universal_vectorStore import build_universal_vectorstore


load_dotenv(RAG_DIR / ".env")

BACKEND_API_BASE = os.getenv("BACKEND_API_BASE", "http://localhost:8000")
MAINTENANCE_INTERNAL_TOKEN = os.getenv("MAINTENANCE_INTERNAL_TOKEN", "")


def log(message):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {message}")


def set_backend_maintenance(active, reason):
    if not MAINTENANCE_INTERNAL_TOKEN:
        log("WARNING: MAINTENANCE_INTERNAL_TOKEN missing; skipping maintenance toggle")
        return False
    url = f"{BACKEND_API_BASE}/api/admin/maintenance/internal"
    payload = json.dumps({"maintenance": bool(active), "reason": reason}).encode("utf-8")
    req = urllib_request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Maintenance-Token": MAINTENANCE_INTERNAL_TOKEN,
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                log(f"Maintenance mode set to {active} ({reason})")
                return True
            log(f"WARNING: maintenance toggle returned status {resp.status}")
            return False
    except Exception as e:
        log(f"WARNING: failed to toggle maintenance mode: {e}")
        return False


def main():
    log("Starting manual vector store rebuild")
    set_backend_maintenance(True, "manual_rebuild_script")
    try:
        build_universal_vectorstore()
        log("SUCCESS: Vector store rebuilt")
        return 0
    except Exception as e:
        log(f"ERROR: Rebuild failed: {e}")
        return 1
    finally:
        set_backend_maintenance(False, "manual_rebuild_script_complete")


if __name__ == "__main__":
    raise SystemExit(main())
