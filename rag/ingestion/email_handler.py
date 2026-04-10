# rag/ingestion/email_handler.py

import os
import sys
import imaplib
import email
from email.header import decode_header
from email.utils import parsedate_to_datetime
import xmltodict
import json
from urllib import request as urllib_request
from datetime import datetime
from bs4 import BeautifulSoup
import re
from pathlib import Path
from dotenv import load_dotenv

# Add rag directory to path to import other modules
RAG_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(RAG_DIR))

from llm.groq_llm import get_groq_llm_fast
from vectorstores.universal_vectorStore import build_universal_vectorstore

# Load environment variables from rag/.env
load_dotenv(RAG_DIR / ".env")

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
IMAP_SERVER = os.getenv("IMAP_SERVER", "imap.gmail.com")
IMAP_PORT = int(os.getenv("IMAP_PORT", 993))
BACKEND_API_BASE = os.getenv("BACKEND_API_BASE", "http://localhost:8000")
MAINTENANCE_INTERNAL_TOKEN = os.getenv("MAINTENANCE_INTERNAL_TOKEN", "")

TIMETABLE_DIR = RAG_DIR / "data" / "timetable"
EVENTS_DIR = RAG_DIR / "data" / "events"
EMAIL_CLASSIFICATION_PROMPT_PATH = RAG_DIR / "prompts" / "email_classification.txt"
MAX_RECENT_EMAILS = int(os.getenv("EMAIL_MAX_RECENT", "10"))
PROCESS_TODAY_ONLY = os.getenv("EMAIL_PROCESS_TODAY_ONLY", "true").lower() == "true"

# Ensure directories exist
TIMETABLE_DIR.mkdir(parents=True, exist_ok=True)
EVENTS_DIR.mkdir(parents=True, exist_ok=True)


def log(message):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {message}")


def contains_any(text, words):
    return any(w in text for w in words)


def load_email_classification_prompt():
    try:
        return EMAIL_CLASSIFICATION_PROMPT_PATH.read_text(encoding="utf-8")
    except Exception as e:
        log(f"WARNING: failed to load email prompt, using fallback: {e}")
        return (
            "Classify email into exactly one: timetable, event, other. "
            "Exams and admin notices are other. Return one lowercase word only."
        )


def set_backend_maintenance(active, reason):
    """Toggle backend maintenance mode via internal protected API."""
    if not MAINTENANCE_INTERNAL_TOKEN:
        log("WARNING: MAINTENANCE_INTERNAL_TOKEN missing; cannot toggle maintenance mode")
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

def clean_subject(subject):
    if not subject: return ""
    decoded = decode_header(subject)[0]
    if isinstance(decoded[0], bytes):
        return decoded[0].decode(decoded[1] if decoded[1] else "utf-8", errors="ignore")
    return decoded[0]

def extract_email_body(msg):
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in disposition:
                charset = part.get_content_charset() or "utf-8"
                payload = part.get_payload(decode=True)
                if payload:
                    body += payload.decode(charset, errors="ignore")
    else:
        charset = msg.get_content_charset() or "utf-8"
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode(charset, errors="ignore")
    return body.strip()

def extract_xml_content(msg):
    xml_str = None
    # Search for XML attachment
    for part in msg.walk():
        filename = part.get_filename()
        content_type = part.get_content_type()
        if content_type == "application/xml" or (filename and filename.endswith(".xml")):
            xml_bytes = part.get_payload(decode=True)
            if xml_bytes:
                xml_str = xml_bytes.decode("utf-8", errors="ignore")
                break
    
    # If no attachment, check body for <Timetable tags
    if not xml_str:
        body = extract_email_body(msg)
        if "<Timetable" in body:
            try:
                xml_str = "<Timetable" + body.split("<Timetable", 1)[1]
            except IndexError:
                pass
    return xml_str

def classify_email_type(subject, body):
    text = f"{subject}\n{body}".lower()

    # Keep timetable detection strict to timetable/xml only.
    if "timetable" in text or "<timetable" in text:
        return "timetable"

    # Hard exclusions: do not ingest these categories.
    excluded_keywords = [
        "exam", "examination", "midterm", "final term", "quiz", "assignment",
        "result", "grades", "marksheet", "paper", "hostel", "admission",
        "fee", "dues", "transport", "holiday", "internship", "job"
    ]
    if contains_any(text, excluded_keywords):
        return "other"

    # Fast path positive hint for obvious cases, then validate via LLM.
    allowed_event_keywords = ["event", "workshop", "seminar", "seminor"]
    looks_event_like = contains_any(text, allowed_event_keywords)
    looks_timetable_like = "timetable" in text or "<timetable" in text

    prompt = load_email_classification_prompt()
    llm = get_groq_llm_fast()
    llm_input = (
        f"{prompt}\n\n"
        f"Subject:\n{subject[:500]}\n\n"
        f"Body (truncated):\n{body[:2000]}\n\n"
        f"Return label:"
    )
    try:
        response = llm.invoke(llm_input)
        label = (response.content or "").strip().lower()
        label = re.sub(r"[^a-z]", "", label)
        if label in {"timetable", "event", "other"}:
            return label
        log(f"WARNING: Unexpected LLM label '{response.content}', fallback to rules")
    except Exception as e:
        log(f"WARNING: Email LLM classification failed, fallback to rules: {e}")

    # Fallback if LLM fails/unexpected output.
    if looks_timetable_like:
        return "timetable"
    if looks_event_like:
        return "event"

    return "other"

def process_timetable(msg, subject):
    xml_str = extract_xml_content(msg)
    if not xml_str:
        log("WARNING: No XML timetable found in email")
        return False
    
    # Cleanup malformed XML using BeautifulSoup
    try:
        soup = BeautifulSoup(xml_str, "xml")
        fixed_xml = str(soup)
        
        # Verify it's still valid XML-ish
        if "<Timetable" not in fixed_xml:
            # Try manual cleanup fix if soup failed to keep structure
            xml_str = re.sub(r'<([A-Za-z0-9_]+)([^>/]*)/>', r'<\1\2></\1>', xml_str)
            xml_str = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;)', '&amp;', xml_str)
            fixed_xml = xml_str

        # Backup previous timetable files instead of deleting
        BACKUP_DIR = TIMETABLE_DIR / "backup"
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        
        xml_files = list(TIMETABLE_DIR.glob("*.xml"))
        for old_file in xml_files:
            log(f"Backing up old timetable: {old_file.name}")
            backup_path = BACKUP_DIR / f"{old_file.stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{old_file.suffix}"
            try:
                old_file.replace(backup_path)
            except Exception:
                old_file.unlink() # Fallback if replace fails
        
        # Save new timetable
        filename = f"timetable_updated_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xml"
        save_path = TIMETABLE_DIR / filename
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(fixed_xml)
        log(f"New timetable saved: {filename}")

        return True
    except Exception as e:
        log(f"WARNING: Failed to process XML: {e}")
        return False

def process_event(msg, subject, body):
    # --- TC-17: Duplicate Event Handling ---
    # Check if this event already exists to prevent duplicates
    for existing_file in EVENTS_DIR.glob("*.txt"):
        try:
            content = existing_file.read_text(encoding="utf-8")
            if f"Subject: {subject}" in content and body[:500] in content:
                log(f"TC-17: Duplicate detected. Ignoring repeated event: {subject}")
                return False
        except Exception:
            continue
    # ---------------------------------------

    filename = f"event_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    save_path = EVENTS_DIR / filename
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(f"Subject: {subject}\nDate: {datetime.now().isoformat()}\n\n{body}")
    log(f"New event saved: {filename}")
    
    return True

def fetch_and_process_emails():
    log(f"Connecting to {IMAP_SERVER}...")
    if not EMAIL_USER or not EMAIL_PASS:
        log("ERROR: EMAIL_USER or EMAIL_PASS not set in environment")
        return 1

    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("inbox")
        
        # Pull most recent emails from current day (or last 10 unread if disabled).
        if PROCESS_TODAY_ONLY:
            imap_day = datetime.now().strftime("%d-%b-%Y")
            status, messages = mail.search(None, "SINCE", imap_day)
            search_desc = f"today since {imap_day}"
        else:
            status, messages = mail.search(None, "UNSEEN")
            search_desc = "UNSEEN"
        if status != "OK":
            log(f"WARNING: Failed to search emails for {search_desc}")
            mail.logout()
            return 1
            
        email_ids = messages[0].split()
        email_ids = email_ids[-MAX_RECENT_EMAILS:]
        log(f"Found {len(email_ids)} candidate emails ({search_desc}), scanning latest {MAX_RECENT_EMAILS}")
        
        processed_count = 0
        skipped_by_date = 0
        for eid in reversed(email_ids):
            _, msg_data = mail.fetch(eid, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            subject = clean_subject(msg["Subject"])
            body = extract_email_body(msg)

            if PROCESS_TODAY_ONLY:
                msg_date = msg.get("Date")
                try:
                    parsed = parsedate_to_datetime(msg_date) if msg_date else None
                    if not parsed or parsed.date() != datetime.now().date():
                        skipped_by_date += 1
                        log(f"Skipped (not current day): {subject}")
                        continue
                except Exception:
                    skipped_by_date += 1
                    log(f"Skipped (invalid date header): {subject}")
                    continue
            
            log(f"Processing: {subject}")
            
            email_type = classify_email_type(subject, body)
            log(f"Category: {email_type}")
            
            if email_type == "timetable":
                if process_timetable(msg, subject):
                    processed_count += 1
            elif email_type == "event":
                if process_event(msg, subject, body):
                    processed_count += 1
            else:
                log("Skipped (Irrelevant category)")
                
        if skipped_by_date:
            log(f"Skipped by date filter: {skipped_by_date}")

        # Rebuild once after all relevant extractions.
        if processed_count > 0:
            set_backend_maintenance(True, "email_rebuild")
            log("Rebuilding universal vector store (single batch run)...")
            try:
                build_universal_vectorstore()
                log("Vector store rebuilt successfully")
            except Exception as e:
                log(f"WARNING: Vector store rebuild failed: {e}")
                mail.logout()
                set_backend_maintenance(False, "email_rebuild_failed")
                return 1
            finally:
                set_backend_maintenance(False, "email_rebuild_complete")

        mail.logout()
        log(f"Run complete. Updated items: {processed_count}")
        return 0
    except imaplib.IMAP4.error as e:
        log(f"ERROR: IMAP authentication/login failed: {e}")
        return 1
    except Exception as e:
        log(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    raise SystemExit(fetch_and_process_emails())
