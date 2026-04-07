from pathlib import Path
import re
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from llm.groq_llm import get_groq_llm_fast

# Load environment variables
current_dir = Path(__file__).parent
load_dotenv(current_dir.parent / ".env")

# ── Pre-LLM keyword heuristics ───────────────────────────────────────────────
# Patterns that unambiguously indicate a Timetable query even when a teacher
# name is present (which would otherwise be mis-classified as Faculty).
_TIMETABLE_PATTERNS = [
    # "classes of Dr. X" / "class of Prof. Y" / "classes Dr. X"
    r'\bclasses?\s+(?:of|for)?\s*(?:dr|prof|engr|mr|ms|sir)?\s*\w+\b',
    # "schedule of Dr. X" / "schedule Dr. X"
    r'\bschedule\s+(?:of|for)?\s*(?:dr|prof|engr|mr|ms|sir)?\s*\w+\b',
    # "timetable of Dr. X" / "timetable Dr. X"
    r'\btime\s*table\s+(?:of|for)?\s*(?:dr|prof|engr|mr|ms|sir)?\s*\w+\b',
    # "where is Dr. X class" / "where is Prof. Y class" / "where is Prof. Y"
    r'\bwhere\s+is\b.{0,30}\b(?:class|teach|timetable)\b',
    # "(whose) class is it"
    r'\b(?:whose|who)\b.{0,20}\bclass\b',
    # "any classes today" / "any class tomorrow" / "any classes"
    r'\bany\s+classes?\b',
    # "show (me) (the) timetable / schedule / routine"
    r'\bshow\b.{0,20}\b(?:timetable|schedule|routine)\b',
    # "when does … teach" / "when does … have class" / "when does … take"
    r'\bwhen\s+does\b.{0,40}\b(?:teach|have\s+class|took|take)\b',
    # "does Dr. X teach on …" / "does Prof. Y have class …"
    r'\bdoes\b.{0,30}\b(?:teach|have\s+(?:a\s+)?class)\b',
    # "what does Dr. X teach"
    r'\bwhat\b.{0,20}\b(?:teach)\b',
    # Mentioning a title + class keywords (any order, within 30 chars)
    r'\b(?:dr|prof|engr|mr|ms|miss)\.?\s+\w+.{0,30}\b(?:class|schedule|timetable|routine|teach)\b',
    r'\b(?:class|schedule|timetable|routine|teach).{0,30}\b(?:dr|prof|engr|mr|ms|miss)\.?\s+\w+',
]
_TIMETABLE_RE = re.compile("|".join(_TIMETABLE_PATTERNS), re.IGNORECASE)


def _pre_classify(query: str) -> str | None:
    """Fast keyword-based pre-classification. Returns a category or None."""
    if _TIMETABLE_RE.search(query):
        return "Timetable"
    return None

# Load classification prompt
prompt_path = current_dir.parent / "prompts" / "classification.txt"
CLASSIFICATION_PROMPT = prompt_path.read_text()

# Valid categories with canonical names
VALID_CATEGORIES = {"Faculty", "Policies", "Events", "Scholarships", "Timetable", "Academic", "General"}

# Map common LLM output variations to canonical category names
CATEGORY_ALIASES = {
    "faculty": "Faculty",
    "professor": "Faculty",
    "professors": "Faculty",
    "teacher": "Faculty",
    "teachers": "Faculty",
    "policies": "Policies",
    "policy": "Policies",
    "rules": "Policies",
    "admission": "Policies",
    "grading": "Policies",
    "events": "Events",
    "event": "Events",
    "scholarships": "Scholarships",
    "scholarship": "Scholarships",
    "financial aid": "Scholarships",
    "timetable": "Timetable",
    "schedule": "Timetable",
    "class schedule": "Timetable",
    "academic": "Academic",
    "academics": "Academic",
    "general": "General",
    "greeting": "General",
    "greetings": "General",
    "chitchat": "General",
    "other": "General",
}

# Cached classifier LLM instance
_classifier_llm = None

def _get_classifier_llm():
    global _classifier_llm
    if _classifier_llm is None:
        _classifier_llm = get_groq_llm_fast()
    return _classifier_llm


def _normalize_category(raw: str) -> str | None:
    """Normalize LLM output to a valid canonical category name."""
    cleaned = raw.strip().strip(".'\"").strip().lower()
    
    # Direct match
    if cleaned in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[cleaned]
    
    # Check if any valid category is contained in the output
    # (handles cases like "The category is Faculty" or "Faculty.")
    for alias, canonical in CATEGORY_ALIASES.items():
        if alias in cleaned:
            return canonical
    
    return None


async def classify_query(query: str, last_category: str = None) -> str:
    """
    Classifies the user query into one of the predefined categories.
    Returns the canonical category name as a string.
    If last_category is provided, it helps the LLM with context-aware classification
    (e.g., a teacher's name alone after a Timetable query remains Timetable).
    """
    # 1. Fast pre-LLM heuristic check (catches obvious Timetable queries)
    pre_cat = _pre_classify(query)
    if pre_cat:
        print(f"[CLASSIFIER] Pre-classified (regex): '{query}' → {pre_cat}")
        return pre_cat

    # 2. LLM-based classification
    llm = _get_classifier_llm()
    
    messages = [("system", CLASSIFICATION_PROMPT)]
    if last_category:
        messages.append(("system", f"CONTEXT: The previous query was classified as '{last_category}'. "
                                    f"If the current query is a follow-up (like just a name or a room number), "
                                    f"it should likely stay in the same category."))
    messages.append(("human", "{query}"))
    
    prompt = ChatPromptTemplate.from_messages(messages)
    chain = prompt | llm | StrOutputParser()
    
    # Attempt 1
    try:
        raw_output = await chain.ainvoke({"query": query})
        category = _normalize_category(raw_output)
        
        if category:
            print(f"[CLASSIFIER] Query: '{query}' → {category} (raw: '{raw_output.strip()}')")
            return category
        
        # Attempt 2: retry with a stricter prompt if first attempt failed validation
        print(f"[CLASSIFIER] Invalid output '{raw_output.strip()}' for query: '{query}'. Retrying...")
        
        retry_prompt = ChatPromptTemplate.from_messages([
            ("system", "Classify this query into exactly one of: Faculty, Policies, Events, Scholarships, Timetable, Academic, General. Reply with ONLY one word."),
            ("human", "{query}")
        ])
        retry_chain = retry_prompt | llm | StrOutputParser()
        raw_output = await retry_chain.ainvoke({"query": query})
        category = _normalize_category(raw_output)
        
        if category:
            print(f"[CLASSIFIER] Retry successful: '{query}' → {category}")
            return category
        
        # Final fallback
        print(f"[CLASSIFIER] Retry also failed ('{raw_output.strip()}'). Falling back to General.")
        return "General"
        
    except Exception as e:
        print(f"[CLASSIFIER] Error during classification: {e}. Falling back to General.")
        return "General"
