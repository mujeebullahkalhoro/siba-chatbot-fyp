# rag/llm/groq_llm.py
from langchain_groq import ChatGroq

def get_groq_llm():
    return ChatGroq(
        model="openai/gpt-oss-20b",
        temperature=0.2,
        max_tokens=1024
    )
