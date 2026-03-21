# rag/ingestion/email_handler.py

import os
import sys
import imaplib
import email
from email.header import decode_header
import xmltodict
import json
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

TIMETABLE_DIR = RAG_DIR / "data" / "timetable"
EVENTS_DIR = RAG_DIR / "data" / "events"

# Ensure directories exist
TIMETABLE_DIR.mkdir(parents=True, exist_ok=True)
EVENTS_DIR.mkdir(parents=True, exist_ok=True)

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
    subject_lower = subject.lower()
    if "timetable" in subject_lower or "updated" in subject_lower:
        return "timetable"
    
    # Use LLM for event classification
    print("🤖 Calling LLM for classification...")
    llm = get_groq_llm_fast()
    prompt = f"""Classify this email into one of these categories: 'event', 'scholarship', 'workshop', 'other'.
    Respond with ONLY the category name.
    
    Subject: {subject}
    Body snippet: {body[:300]}
    """
    try:
        response = llm.invoke(prompt)
        category = response.content.strip().lower()
        if any(c in category for c in ['event', 'scholarship', 'workshop']):
            return "event"
    except Exception as e:
        print(f"⚠️ LLM classification failed: {e}")
        # Fallback to keyword search
        if any(k in subject_lower for k in ["event", "scholarship", "workshop"]):
            return "event"
    
    return "other"

def process_timetable(msg, subject):
    xml_str = extract_xml_content(msg)
    if not xml_str:
        print("⚠️ No XML timetable found in email")
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
            print(f"📦 Backing up old timetable: {old_file.name}")
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
        print(f"✅ New timetable saved: {filename}")
        return True
    except Exception as e:
        print(f"⚠️ Failed to process XML: {e}")
        return False

def process_event(msg, subject, body):
    filename = f"event_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    save_path = EVENTS_DIR / filename
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(f"Subject: {subject}\nDate: {datetime.now().isoformat()}\n\n{body}")
    print(f"✅ New event saved: {filename}")
    
    # Rebuild vector store
    print("🔄 Rebuilding universal vector store...")
    try:
        build_universal_vectorstore()
        print("✅ Vector store rebuilt successfully")
    except Exception as e:
        print(f"⚠️ Vector store rebuild failed: {e}")
        return False
    return True

def fetch_and_process_emails():
    print(f"Connecting to {IMAP_SERVER}...")
    if not EMAIL_USER or not EMAIL_PASS:
        print("❌ EMAIL_USER or EMAIL_PASS not set in environment!")
        return

    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("inbox")
        
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            print("⚠️ Failed to search unseen emails")
            return
            
        email_ids = messages[0].split()
        print(f"📩 Found {len(email_ids)} unread emails")
        
        for eid in email_ids:
            _, msg_data = mail.fetch(eid, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            subject = clean_subject(msg["Subject"])
            body = extract_email_body(msg)
            
            print(f"\n--- Processing: {subject} ---")
            
            email_type = classify_email_type(subject, body)
            print(f"📂 Category: {email_type}")
            
            if email_type == "timetable":
                process_timetable(msg, subject)
            elif email_type == "event":
                process_event(msg, subject, body)
            else:
                print("⏭ Skipped (Irrelevant category)")
                
        mail.logout()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fetch_and_process_emails()
