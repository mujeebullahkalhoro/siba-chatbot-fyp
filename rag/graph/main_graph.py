# rag/graph/main_graph.py
from pathlib import Path
from typing import Dict, AsyncGenerator
import os

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage
from dotenv import load_dotenv

from langchain_core.output_parsers import StrOutputParser

from retrievers.universal_retriever import get_universal_ensemble_retriever
from llm.groq_llm import get_groq_llm, get_groq_llm_fast

from graph.classifier import classify_query
from graph.timetable_lookup import search_timetable


# ── Query translation for multilingual support ──────────
from langchain_groq import ChatGroq
import re

_translate_llm = None

def _get_translate_llm():
    global _translate_llm
    if _translate_llm is None:
        _translate_llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0,
            max_tokens=128,
        )
    return _translate_llm

def detect_language_script(text: str) -> str:
    """Detect whether query is urdu_script or english."""
    # Check for Urdu/Arabic script characters
    urdu_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]', text))
    if urdu_chars > 2:
        return "urdu_script"
    
    return "english"

_RESPONSE_LANGUAGE_INSTRUCTIONS = {
    "english": "Respond in English.",
    "urdu_script": "Respond entirely in Urdu script (اردو). Do NOT use English.",
}

_translate_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a query translator. Your ONLY job is to translate the user's text into proper English.\n\n"
     "Rules:\n"
     "- If the text is already in proper English, output it exactly as-is.\n"
     "- If the text is in Urdu script, Hindi, or Sindhi, translate it to proper English.\n"
     "- Output ONLY the English translation. No explanations, no extra text, no quotes.\n\n"
     "Examples:\n"
     "Input: حاضری کی پالیسی کیا ہے؟\n"
     "Output: What is the attendance policy?\n\n"
     "Input: کمپیوٹر سائنس ڈیپارٹمنٹ کے ہیڈ کون ہیں؟\n"
     "Output: Who is the head of the Computer Science department?\n\n"
     "Input: What scholarships are available?\n"
     "Output: What scholarships are available?"),
    ("human", "{text}")
])

async def translate_query_for_retrieval(query: str, detected_lang: str) -> str:
    """Translate non-English queries to English for vector retrieval."""
    # Skip translation for plain English queries
    if detected_lang == "english":
        return query
    
    chain = _translate_prompt | _get_translate_llm() | StrOutputParser()
    try:
        translated = await chain.ainvoke({"text": query})
        translated = translated.strip()
        if translated:
            print(f"[TRANSLATE] Translated to: '{translated}'")
        return translated or query
    except Exception as e:
        print(f"[TRANSLATE] Error: {e}, using original query")
        return query

def normalize_retrieval_query(query: str) -> str:
    """Expand common university terms and acronyms to improve retrieval."""
    # Replace hod/HoD/Head of Department with "HOD" (since documents use "HOD")
    query = re.sub(r'\b(?i:hod)\b', 'HOD', query)
    query = re.sub(r'\b(?i:hods)\b', 'HODs', query)
    query = re.sub(r'(?i:head of (the )?department)', 'HOD', query)
    
    # Replace VC with "Vice Chancellor" (already correct)
    query = re.sub(r'\b(?i:vcs?)\b', 'Vice Chancellor', query)
    return query

# Get the directory of the current file (rag/graph)
current_dir = Path(__file__).parent
# Load .env from rag directory
load_dotenv(current_dir.parent / ".env")

# ── Role-based faculty lookup ────────────────────────────
_faculty_roles = None

def _load_faculty_roles():
    """Scan faculty files once and build a role→document mapping.
    Stores only essential fields (Name, Designation, Department, Email)
    to keep LLM context compact.
    """
    global _faculty_roles
    if _faculty_roles is not None:
        return _faculty_roles

    roles = {}
    hod_entries = []
    faculty_dir = current_dir.parent / "data" / "faculty"

    for f in faculty_dir.glob("*.txt"):
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue

        # Extract only the essential header (Name, Designation, Dept, Email)
        lines = text.split("\n")
        essential_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(("Name:", "Designation:", "Department:", "Email:")):
                essential_lines.append(stripped)
        essential_text = "\n".join(essential_lines)

        for line in lines:
            stripped = line.strip()
            if not stripped.lower().startswith("designation"):
                continue

            line_lower = stripped.lower()

            # HOD detection
            if "hod" in line_lower or "head of" in line_lower:
                m = re.search(r'(?:hod|head)\s+(?:of\s+)?(.+)', stripped, re.IGNORECASE)
                if m:
                    dept = m.group(1).strip().rstrip(" Department").strip()
                    dept_key = dept.lower().replace("(", "").replace(")", "").strip()
                    roles[f"hod_{dept_key}"] = essential_text
                    hod_entries.append(essential_text)
                    print(f"[ROLES] Indexed HOD: '{dept}' → {f.name}")

            # Dean detection
            if "dean" in line_lower and "pro vice" not in line_lower:
                m = re.search(r'dean\s+(?:of\s+)?(.+)', stripped, re.IGNORECASE)
                if m:
                    dept = m.group(1).strip()
                    dept_key = dept.lower().replace("(", "").replace(")", "").strip()
                    roles[f"dean_{dept_key}"] = essential_text
                    print(f"[ROLES] Indexed Dean: '{dept}' → {f.name}")
                else:
                    roles["dean_general"] = essential_text
                    print(f"[ROLES] Indexed Dean (general) → {f.name}")

            # Vice Chancellor detection
            if "vice chancellor" in line_lower:
                if "pro" in line_lower:
                    roles["pro_vice_chancellor"] = essential_text
                    print(f"[ROLES] Indexed Pro Vice Chancellor → {f.name}")
                else:
                    roles["vice_chancellor"] = essential_text
                    print(f"[ROLES] Indexed Vice Chancellor → {f.name}")
            break  # only check Designation line

    # Combined entry for "all HODs" / "list HODs" queries
    if hod_entries:
        roles["all_hods"] = "\n\n".join(hod_entries)

    _faculty_roles = roles
    print(f"[ROLES] Total role entries indexed: {len(roles)}")
    return roles

# Eagerly load roles at module import time (avoids first-query latency)
_load_faculty_roles()


def find_role_documents(query: str) -> str:
    """If query is about a specific role (HOD/VC/Dean), return matching docs.
    Returns empty string if no role match detected."""
    roles = _load_faculty_roles()
    q = query.lower()
    matched_docs = []

    # Detect HOD queries
    hod_match = re.search(r'(?:hod|head of (?:the )?department)(?:\s+(?:of\s+)?(.+?))?(?:\?|$)', q)
    if hod_match:
        dept_query = (hod_match.group(1) or "").strip().rstrip("?").strip()

        if not dept_query or "all" in q or "list" in q or "every" in q:
            # "list all HODs" / "who are the HODs"
            if "all_hods" in roles:
                matched_docs.append(roles["all_hods"])
                print(f"[ROLES] Matched: all HODs")
        else:
            # Try to find matching department
            dept_query_clean = dept_query.lower().replace("(", "").replace(")", "").strip()
            for key, doc in roles.items():
                if key.startswith("hod_"):
                    dept_key = key[4:]
                    # Fuzzy match: check if query dept appears in key or vice versa
                    if (dept_query_clean in dept_key or
                        dept_key in dept_query_clean or
                        any(w in dept_key for w in dept_query_clean.split() if len(w) > 2)):
                        matched_docs.append(doc)
                        print(f"[ROLES] Matched HOD: {key}")

    # Detect Vice Chancellor queries
    if re.search(r'\b(?:vice chancellor|pro vice chancellor)\b', q):
        if "pro" in q and "pro_vice_chancellor" in roles:
            matched_docs.append(roles["pro_vice_chancellor"])
            print(f"[ROLES] Matched: Pro Vice Chancellor")
        elif "vice_chancellor" in roles:
            matched_docs.append(roles["vice_chancellor"])
            print(f"[ROLES] Matched: Vice Chancellor")
        elif "pro_vice_chancellor" in roles:
            # Fallback: if no VC but PVC exists
            matched_docs.append(roles["pro_vice_chancellor"])
            print(f"[ROLES] Matched: Pro Vice Chancellor (fallback)")

    # Detect Dean queries
    if re.search(r'\bdean\b', q) and "vice" not in q:
        for key, doc in roles.items():
            if key.startswith("dean_"):
                matched_docs.append(doc)
                print(f"[ROLES] Matched Dean: {key}")

    if matched_docs:
        return "[Direct Faculty Role Lookup — HIGH PRIORITY CONTEXT]\n" + "\n\n---\n\n".join(matched_docs) + "\n\n"
    return ""

# ── Prompts ──────────────────────────────────────────────
UNIVERSAL_SYSTEM_PROMPT = (current_dir.parent / "prompts" / "universal_system.txt").read_text(encoding="utf-8")

# ── Schema index (always included in context) ───────────
_SCHEMAS_INDEX_PATH = current_dir.parent / "data" / "schemas_index.txt"
SCHEMAS_INDEX_CONTENT = _SCHEMAS_INDEX_PATH.read_text(encoding="utf-8") if _SCHEMAS_INDEX_PATH.exists() else ""

universal_prompt = ChatPromptTemplate.from_messages([
    ("system", UNIVERSAL_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "Context:\n{context}\n\nQuestion: {question}\n\nRESPONSE LANGUAGE INSTRUCTION: {response_language}")
])


# ── Lazy singletons ─────────────────────────────────────
_universal_retriever = None
_llm = None

def _get_universal_retriever():
    global _universal_retriever
    if _universal_retriever is None:
        print("[INFO] Loading universal retriever...")
        _universal_retriever = get_universal_ensemble_retriever(k=10)
        print("[OK] Universal retriever loaded")
    return _universal_retriever

def _get_llm():
    global _llm
    if _llm is None:
        _llm = get_groq_llm()
    return _llm

# ── Chat history store ───────────────────────────────────
store: Dict[str, BaseChatMessageHistory] = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]


# ── Non-streaming chat ───────────────────────────────────
async def faculty_chat(query: str, session_id: str, is_authenticated: bool = False) -> str:
    category = await classify_query(query)
    print(f"DEBUG: Query classified as: {category}, Authenticated: {is_authenticated}")

    if category in ["Timetable", "Events"] and not is_authenticated:
        return "LOGIN_REQUIRED"

    # Detect language/script of the query
    detected_lang = detect_language_script(query)
    response_lang_instruction = _RESPONSE_LANGUAGE_INSTRUCTIONS[detected_lang]
    print(f"[LANG] Detected: {detected_lang}")

    # Translate query to English for retrieval (documents are in English)
    retrieval_query = await translate_query_for_retrieval(query, detected_lang)
    retrieval_query = normalize_retrieval_query(retrieval_query)
    
    print(f"\n{'='*60}")
    print(f"[DEBUG] Original query (repr): {repr(query)}")
    print(f"[DEBUG] Detected language: {detected_lang}")
    print(f"[DEBUG] Retrieval query (translated & normalized): {retrieval_query}")

    # Always use universal retriever — skip for Timetable (timetable data is injected directly)
    retriever = _get_universal_retriever()
    active_prompt = universal_prompt

    if category == "Timetable":
        docs = []  # skip retriever — timetable context injected below
        print(f"[DEBUG] Timetable query: skipping retriever")
    else:
        docs = await retriever.ainvoke(retrieval_query)
        print(f"[DEBUG] Documents retrieved: {len(docs)}")
        for i, d in enumerate(docs):
            print(f"[DEBUG] Doc {i+1}: {d.page_content[:100]}...")
    print(f"{'='*60}\n")

    context = ""
    for d in docs:
        source_info = f"[Source: {d.metadata.get('source', 'Unknown')}, Link: {d.metadata.get('source_link', 'N/A')}]"
        context += f"{source_info}\n{d.page_content}\n\n"

    # Inject role-based documents for HOD/VC/Dean queries
    role_context = find_role_documents(retrieval_query)
    if role_context:
        context = role_context + context

    # Inject timetable data if applicable
    if category == "Timetable":
        tt_context = search_timetable(retrieval_query)
        if tt_context:
            context = tt_context + context

    # Include schemas index only for non-timetable queries
    if SCHEMAS_INDEX_CONTENT and category != "Timetable":
        context = f"[Schema Download Links]\n{SCHEMAS_INDEX_CONTENT}\n\n{context}"

    chain = active_prompt | _get_llm()

    with_message_history = RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )

    # Final debug of the context being sent to LLM
    print(f"\n[LLM CONTEXT] --- START ---\n{context[:500]}...\n[LLM CONTEXT] --- END ---\n")

    response = await with_message_history.ainvoke(
        {
            "context": context,
            "question": query,
            "response_language": response_lang_instruction
        },
        config={"configurable": {"session_id": session_id}}
    )

    return response.content  # type: ignore


# ── Streaming chat ───────────────────────────────────────
async def faculty_chat_stream(
    query: str, session_id: str, is_authenticated: bool = False
) -> AsyncGenerator[str, None]:
    """Stream LLM response chunks for SSE."""
    category = await classify_query(query)
    print(f"DEBUG: Query classified as: {category}, Authenticated: {is_authenticated}")

    if category in ["Timetable", "Events"] and not is_authenticated:
        yield "LOGIN_REQUIRED"
        return

    # Detect language/script of the query
    detected_lang = detect_language_script(query)
    response_lang_instruction = _RESPONSE_LANGUAGE_INSTRUCTIONS[detected_lang]
    print(f"[LANG] Detected: {detected_lang}")

    # Translate query to English for retrieval (documents are in English)
    retrieval_query = await translate_query_for_retrieval(query, detected_lang)
    retrieval_query = normalize_retrieval_query(retrieval_query)
    
    print(f"\n{'='*60}")
    print(f"[DEBUG-STREAM] Original query (repr): {repr(query)}")
    print(f"[DEBUG-STREAM] Detected language: {detected_lang}")
    print(f"[DEBUG-STREAM] Retrieval query (translated & normalized): {retrieval_query}")

    # Always use universal retriever — skip for Timetable (timetable data is injected directly)
    retriever = _get_universal_retriever()
    active_prompt = universal_prompt

    if category == "Timetable":
        docs = []  # skip retriever — timetable context injected below
        print(f"[DEBUG-STREAM] Timetable query: skipping retriever")
    else:
        docs = await retriever.ainvoke(retrieval_query)
        print(f"[DEBUG-STREAM] Documents retrieved: {len(docs)}")
        for i, d in enumerate(docs):
            print(f"[DEBUG-STREAM] Doc {i+1}: {d.page_content[:100]}...")
    print(f"{'='*60}\n")

    # Include source metadata in streaming context (matching non-streaming path)
    context = ""
    for d in docs:
        source_info = f"[Source: {d.metadata.get('source', 'Unknown')}]"
        context += f"{source_info}\n{d.page_content}\n\n"

    # Inject role-based documents for HOD/VC/Dean queries
    role_context = find_role_documents(retrieval_query)
    if role_context:
        context = role_context + context

    # Inject timetable data if applicable
    if category == "Timetable":
        tt_context = search_timetable(retrieval_query)
        if tt_context:
            context = tt_context + context

    # Include schemas index only for non-timetable queries
    if SCHEMAS_INDEX_CONTENT and category != "Timetable":
        context = f"[Schema Download Links]\n{SCHEMAS_INDEX_CONTENT}\n\n{context}"

    # Get chat history for the session
    history = get_session_history(session_id)
    chat_history = history.messages

    # Format the prompt with history
    formatted = await active_prompt.ainvoke({
        "chat_history": chat_history,
        "context": context,
        "question": query,
        "response_language": response_lang_instruction,
    })

    # Stream the response
    full_response = ""
    async for chunk in _get_llm().astream(formatted):
        token = chunk.content
        if token:
            full_response += token
            yield token

    # Save to chat history after streaming completes
    history.add_message(HumanMessage(content=query))
    history.add_message(AIMessage(content=full_response))

