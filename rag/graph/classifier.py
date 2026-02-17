from pathlib import Path
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from llm.groq_llm import get_groq_llm_fast

# Load environment variables
current_dir = Path(__file__).parent
load_dotenv(current_dir.parent / ".env")

# Load classification prompt
prompt_path = current_dir.parent / "prompts" / "classification.txt"
CLASSIFICATION_PROMPT = prompt_path.read_text()

# Cached classifier LLM instance
_classifier_llm = None

def _get_classifier_llm():
    global _classifier_llm
    if _classifier_llm is None:
        _classifier_llm = get_groq_llm_fast()
    return _classifier_llm

async def classify_query(query: str) -> str:
    """
    Classifies the user query into one of the predefined categories.
    Returns the category name as a string.
    """
    llm = _get_classifier_llm()
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", CLASSIFICATION_PROMPT),
        ("human", "{query}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        category = await chain.ainvoke({"query": query})
        return category.strip()
    except Exception as e:
        print(f"Error during classification: {e}")
        return "Academic" # Default fallback
