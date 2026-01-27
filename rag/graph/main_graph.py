# rag/graph/main_graph.py
from pathlib import Path
from typing import Dict
import os

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from dotenv import load_dotenv

from retrievers.faculty_retrievers import get_faculty_ensemble_retriever
from llm.groq_llm import get_groq_llm

# Get the directory of the current file (rag/graph)
current_dir = Path(__file__).parent
# Load .env from rag directory
load_dotenv(current_dir.parent / ".env")

# Go up one level to rag, then to prompts/system.txt
system_prompt_path = current_dir.parent / "prompts" / "system.txt"
SYSTEM_PROMPT = system_prompt_path.read_text()


prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "Context:\n{context}\n\nQuestion: {question}")
])

retriever = get_faculty_ensemble_retriever(k=6)
llm = get_groq_llm()

# Store for chat histories
store: Dict[str, BaseChatMessageHistory] = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    print(f"DEBUG: get_session_history called with session_id={session_id}")
    if session_id not in store:
        print(f"DEBUG: Creating new history for {session_id}")
        store[session_id] = ChatMessageHistory()
    else:
        print(f"DEBUG: Found existing history for {session_id}: {store[session_id].messages}")
    return store[session_id]

def faculty_chat(query: str, session_id: str) -> str:
    docs = retriever.get_relevant_documents(query)
    context = "\n\n".join([d.page_content for d in docs])

    chain = prompt | llm
    
    with_message_history = RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="question",
        history_messages_key="chat_history",
    )

    response = with_message_history.invoke(
        {
            "context": context,
            "question": query
        },
        config={"configurable": {"session_id": session_id}}
    )

    return response.content  # type: ignore
