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

# Common Roman Urdu words to detect Roman Urdu vs English
_ROMAN_URDU_WORDS = {
    # ── Question words ──
    "kiya", "kya", "kia", "kon", "kaun", "kaise", "kese", "kahan", "kaha",
    "kab", "kitna", "kitne", "kitni", "kyun", "kyu", "kiun", "kis", "kin",
    "kidhar", "kidar", "kaisa", "kaisi", "kesy", "konsa", "konsi", "konse",

    # ── Auxiliary / to-be verbs ──
    "hai", "hain", "hy", "hen", "ho", "hua", "hui", "hue",
    "tha", "thi", "the", "hoga", "hogi", "honge", "hoge",
    "hota", "hoti", "hote",

    # ── Common verbs ──
    "bata", "batao", "btao", "bataiye", "bataye", "bataen", "batana",
    "karo", "kro", "karein", "karain", "karna", "krna", "karega", "karegi",
    "karta", "karti", "karte",
    "chahiye", "chahte", "chahti", "chaiye", "chahia",
    "milta", "milti", "milte", "mil", "milay", "milega", "milegi", "milenge",
    "dena", "dein", "den", "dia", "diya", "dijiye", "dijie",
    "lena", "lein", "len", "lia", "liya", "lijiye", "lijie",
    "ana", "aana", "aao", "aayen", "ayen", "aaya", "aayi",
    "jana", "jao", "jayein", "jayen", "jaye", "gaya", "gayi", "gaye",
    "rakhna", "rakho", "rakhein", "rakha", "rakhi",
    "dekho", "dekhna", "dekha", "dekhi", "dekhen",
    "suno", "sunna", "suna", "suni", "sunen", "sunao", "sunaye",
    "socho", "sochna", "socha", "sochi",
    "samjho", "samajhna", "samjha", "samjhi", "samajh",
    "padho", "parhna", "parho", "parha", "parhi",
    "likho", "likhna", "likha", "likhi", "likhen",
    "bolo", "bolna", "bola", "boli", "bolen",
    "chalo", "chalna", "chala", "chali", "chalen", "chalo",
    "ruko", "rukna", "ruka", "ruki", "ruken", "ruko",
    "kholo", "kholna", "khola", "kholi", "kholen",
    "bhejo", "bhejna", "bheja", "bheji", "bhejen",
    "pocho", "poocho", "poochna", "puchna", "pucha", "puchi", "puchen",
    "chahta", "chahti", "chahte",
    "sakta", "sakti", "sakte", "sakein",
    "mangta", "mangti", "mangte", "mango", "manga", "mangi",
    "rok", "roken", "roko",
    "chor", "choro", "chorna", "chora", "chori",
    "laga", "lagi", "lagay", "lagta", "lagti", "lagte",
    "ata", "aata", "aati", "ate", "aate",
    "jata", "jaata", "jaati", "jate", "jaate",

    # ── Pronouns & particles ──
    "ka", "ki", "ke", "ky", "ko", "se", "sy", "ne",
    "mein", "ma", "mai", "me",
    "par", "pe", "pr", "upar", "neeche", "nichay",
    "ya", "aur", "or",
    "ye", "yeh", "wo", "woh", "is", "us", "in", "un",
    "iss", "uss",
    "mujhe", "mujhy", "muje", "muj",
    "humein", "humen", "hamein", "hum", "ham",
    "aap", "ap", "tum", "tu", "tumhein", "tumhen",
    "iska", "iski", "iske", "uska", "uski", "uske",
    "unka", "unki", "unke", "inka", "inki", "inke",
    "mera", "meri", "mere", "hamara", "hamari", "hamare",
    "tera", "teri", "tere", "tumhara", "tumhari", "tumhare",
    "apna", "apni", "apne", "khud",
    "sb", "sab", "koi", "kisi",

    # ── Negation / affirmation ──
    "nahi", "nahin", "nhi", "ni", "mat", "na",
    "haan", "han", "ji", "jee",
    "bilkul", "zaroor", "zarur",
    "theek", "thek", "thik", "acha", "achha", "accha",
    "sahi", "sahih", "galat",

    # ── Connectors & conjunctions ──
    "lekin", "magar", "lkin", "mgar",
    "bhi", "bhe",
    "toh", "to",
    "phir", "fir", "fer",
    "warna", "wrna",
    "isliye", "islye", "islie",
    "kyunke", "kyuki", "kyunki", "kionke", "chunke",
    "agar", "agr",
    "jab", "tab", "jaise", "jese", "waise", "wese",
    "taake", "taky", "taki",

    # ── Time & place words ──
    "abhi", "abi", "ab",
    "pehle", "phle", "pehlay", "pahle",
    "baad", "bad", "baadme", "badme",
    "kal", "aaj", "aj",
    "subah", "dopahar", "shaam", "raat",
    "yahan", "yaha", "wahan", "waha", "idhar", "udhar",
    "andar", "bahar",
    "sath", "saath",
    "agay", "aage", "peechay", "piche",
    "jaldi", "dheere", "dhire",
    "hamesha", "kabhi", "kabhr",

    # ── Adjectives & adverbs ──
    "bohot", "bohat", "bahut", "bhot", "bht",
    "acha", "achi", "ache",
    "bura", "buri", "bure",
    "bara", "bari", "bare", "bary", "bada", "badi", "bade",
    "chota", "choti", "chote", "chhota", "chhoti",
    "naya", "nayi", "naye", "nae",
    "purana", "purani", "purane",
    "zyada", "ziada", "zyda",
    "kam", "kum",
    "sasta", "sasti", "saste",
    "mehnga", "mehngi", "mehnge",
    "mushkil", "asan", "asaan",
    "zaroori", "zaruri", "lazmi", "lazimi",
    "khas", "aam",
    "alag", "mukhtalif",
    "kuch", "kch", "thora", "thoda", "thodi",

    # ── Nouns (common) ──
    "log", "banda", "bandi", "admi", "aadmi", "aurat", "larki", "larka",
    "bachay", "bachey", "bacha", "bachi",
    "ghar", "kamra", "makaan",
    "paisa", "paise", "paisay", "rupay", "rupee",
    "waqt", "waqat", "time",
    "kaam", "kam",
    "baat", "bat",
    "jagah", "jaga",
    "taraf", "janib",
    "naam", "nam",
    "din", "mahina", "saal", "hafta",

    # ── Academic / university ──
    "sukkur", "iba",
    "dakhla", "dakhlay",
    "tarika", "tariqa",
    "imtihan", "imtehaan", "exam",
    "marksheet", "result", "nateeja",
    "professor", "ustad", "teacher",
    "student", "talib",
    "class", "jamat",
    "semester",
    "degree", "sanad",
    "course", "courses",
    "department", "dept",
    "faculty",
    "university", "uni",
    "college",
    "admission",
    "fee", "fees",
    "hostel",
    "scholarship",
    "library", "kutub",
    "lab",
    "campus",
    "schedule", "waqfay",

    # ── Greetings & common phrases ──
    "assalam", "salam", "walaikum", "alaikum", "assalamualaikum",
    "khuda", "allah", "hafiz", "khudahafiz",
    "hal", "haal", "chal",
    "bhai", "yaar", "dost",
    "shukriya", "meherbani", "mashallah", "inshallah", "inshaallah",
    "muaf", "maaf", "maafi",

    # ── Prepositions / postpositions ──
    "wala", "wali", "wale", "walay", "waly",
    "liye", "lye",
    "baare", "baaray", "baray",
    "zariye", "zariay",
    "beghair", "baghair", "bina",
    "mutabiq", "mutabik",
    "khilaf",
    "darmiyan",

    # ── Polite / formal ──
    "please", "plz", "pls",
    "thank", "thanks",
    "sorry",
    "karam", "nawazi",
}

def detect_language_script(text: str) -> str:
    """Detect whether query is urdu_script, roman_urdu, or english."""
    # Check for Urdu/Arabic script characters
    urdu_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]', text))
    if urdu_chars > 2:
        return "urdu_script"
    
    # Check for Roman Urdu by looking for common Urdu words written in English
    words = set(text.lower().split())
    roman_urdu_matches = words.intersection(_ROMAN_URDU_WORDS)
    if len(roman_urdu_matches) >= 2:
        return "roman_urdu"
    
    return "english"

_RESPONSE_LANGUAGE_INSTRUCTIONS = {
    "english": "Respond in English.",
    "urdu_script": "Respond entirely in Urdu script (اردو). Do NOT use English or Roman Urdu.",
    "roman_urdu": "Respond in Roman Urdu (Urdu words written in English letters, e.g. 'Sukkur IBA ki attendance policy ke mutabiq...'). Do NOT use Urdu script or pure English.",
}

_translate_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a query translator. Your ONLY job is to translate the user's text into proper English.\n\n"
     "Rules:\n"
     "- If the text is already in proper English, output it exactly as-is.\n"
     "- If the text is in Urdu script, Roman Urdu (Urdu written in English letters), Hindi, or Sindhi, translate it to proper English.\n"
     "- Output ONLY the English translation. No explanations, no extra text, no quotes.\n\n"
     "Examples:\n"
     "Input: حاضری کی پالیسی کیا ہے؟\n"
     "Output: What is the attendance policy?\n\n"
     "Input: کمپیوٹر سائنس ڈیپارٹمنٹ کے ہیڈ کون ہیں؟\n"
     "Output: Who is the head of the Computer Science department?\n\n"
     "Input: attendance policy kiya hai sukkur iba ke\n"
     "Output: What is the attendance policy of Sukkur IBA?\n\n"
     "Input: kiya hal hai\n"
     "Output: How are you?\n\n"
     "Input: admission ka tarika kiya hai\n"
     "Output: What is the admission process?\n\n"
     "Input: CS department mein konse professors hain\n"
     "Output: Which professors are in the CS department?\n\n"
     "Input: fee structure bata do\n"
     "Output: Tell me the fee structure\n\n"
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

# Get the directory of the current file (rag/graph)
current_dir = Path(__file__).parent
# Load .env from rag directory
load_dotenv(current_dir.parent / ".env")

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
    print(f"\n{'='*60}")
    print(f"[DEBUG] Original query (repr): {repr(query)}")
    print(f"[DEBUG] Detected language: {detected_lang}")
    print(f"[DEBUG] Retrieval query (translated): {retrieval_query}")

    # Always use universal retriever — classification only used for auth check now
    retriever = _get_universal_retriever()
    
    # Use the single universal prompt for everything
    active_prompt = universal_prompt

    docs = await retriever.ainvoke(retrieval_query)
    print(f"[DEBUG] Documents retrieved: {len(docs)}")
    for i, d in enumerate(docs):
        print(f"[DEBUG] Doc {i+1}: {d.page_content[:100]}...")
    print(f"{'='*60}\n")

    context = ""
    for d in docs:
        source_info = f"[Source: {d.metadata.get('source', 'Unknown')}, Link: {d.metadata.get('source_link', 'N/A')}]"
        context += f"{source_info}\n{d.page_content}\n\n"

    # Always include schemas index so LLM can provide download links
    if SCHEMAS_INDEX_CONTENT:
        context = f"[Schema Download Links]\n{SCHEMAS_INDEX_CONTENT}\n\n{context}"

    chain = active_prompt | _get_llm()

    with_message_history = RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )

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
    print(f"\n{'='*60}")
    print(f"[DEBUG-STREAM] Original query (repr): {repr(query)}")
    print(f"[DEBUG-STREAM] Detected language: {detected_lang}")
    print(f"[DEBUG-STREAM] Retrieval query (translated): {retrieval_query}")

    # Always use universal retriever
    retriever = _get_universal_retriever()
    active_prompt = universal_prompt

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

    # Always include schemas index so LLM can provide download links
    if SCHEMAS_INDEX_CONTENT:
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

