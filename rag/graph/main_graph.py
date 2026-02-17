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

from retrievers.faculty_retrievers import get_faculty_ensemble_retriever
from retrievers.policies_retrievers import get_policies_ensemble_retriever
from llm.groq_llm import get_groq_llm

from graph.classifier import classify_query

# Get the directory of the current file (rag/graph)
current_dir = Path(__file__).parent
# Load .env from rag directory
load_dotenv(current_dir.parent / ".env")

# ── Prompts ──────────────────────────────────────────────
SYSTEM_PROMPT = (current_dir.parent / "prompts" / "system.txt").read_text()
POLICIES_SYSTEM_PROMPT = (current_dir.parent / "prompts" / "policies_system.txt").read_text()

faculty_prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "Context:\n{context}\n\nQuestion: {question}")
])

policies_prompt = ChatPromptTemplate.from_messages([
    ("system", POLICIES_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "Context:\n{context}\n\nQuestion: {question}")
])

# ── Lazy singletons ─────────────────────────────────────
_faculty_retriever = None
_policies_retriever = None
_llm = None

def _get_faculty_retriever():
    global _faculty_retriever
    if _faculty_retriever is None:
        print("[INFO] Loading faculty retriever...")
        _faculty_retriever = get_faculty_ensemble_retriever(k=6)
        print("[OK] Faculty retriever loaded")
    return _faculty_retriever

def _get_policies_retriever():
    global _policies_retriever
    if _policies_retriever is None:
        print("[INFO] Loading policies retriever...")
        _policies_retriever = get_policies_ensemble_retriever(k=6)
        print("[OK] Policies retriever loaded")
    return _policies_retriever

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


def _get_retriever_and_prompt(category: str):
    """Return the appropriate retriever and prompt for a category."""
    if category == "Faculty":
        return _get_faculty_retriever(), faculty_prompt
    elif category == "Policies":
        return _get_policies_retriever(), policies_prompt
    else:
        return None, None


# ── Non-streaming chat ───────────────────────────────────
async def faculty_chat(query: str, session_id: str, is_authenticated: bool = False) -> str:
    category = await classify_query(query)
    print(f"DEBUG: Query classified as: {category}, Authenticated: {is_authenticated}")

    if category in ["Timetable", "Events"] and not is_authenticated:
        return "LOGIN_REQUIRED"

    retriever, active_prompt = _get_retriever_and_prompt(category)
    if retriever is None:
        return "We will implement it later"

    docs = await retriever.aget_relevant_documents(query)
    context = "\n\n".join([d.page_content for d in docs])

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
            "question": query
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

    retriever, active_prompt = _get_retriever_and_prompt(category)
    if retriever is None:
        yield "We will implement it later"
        return

    docs = await retriever.aget_relevant_documents(query)
    context = "\n\n".join([d.page_content for d in docs])

    # Get chat history for the session
    history = get_session_history(session_id)
    chat_history = history.messages

    # Format the prompt with history
    formatted = await active_prompt.ainvoke({
        "chat_history": chat_history,
        "context": context,
        "question": query,
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
