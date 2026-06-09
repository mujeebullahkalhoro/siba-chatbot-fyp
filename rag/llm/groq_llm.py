# rag/llm/groq_llm.py
# pyrefly: ignore [missing-import]
from langchain_groq import ChatGroq

def get_groq_llm():
    """Main LLM for generating responses — high quality, fast on Groq."""
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=4096,
    )

def get_groq_llm_fast():
    """Lightweight LLM for classification — ultra low latency."""
    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0,
        max_tokens=32,
    )
