# rag/retrievers/faculty.py

import os
from typing import List

try:
    from langchain_core.pydantic_v1 import PrivateAttr
except ImportError:
    from pydantic import PrivateAttr

from rank_bm25 import BM25Okapi
from langchain.vectorstores import FAISS
from langchain.retrievers import EnsembleRetriever
from langchain.schema import Document, BaseRetriever

from embeddings.embedding_model import get_embedding_model

# =========================
# Paths
# =========================
VECTOR_DB_PATH = "E:/SIBA-Chatbot/siba-chatbot-fyp/rag/vector_db/faculty"
FACULTY_DATA_PATH = "E:/SIBA-Chatbot/siba-chatbot-fyp/rag/data/faculty"

# =========================
# Semantic Retriever (FAISS)
# =========================
def get_semantic_retriever(k: int = 6):
    embeddings = get_embedding_model()

    vectorstore = FAISS.load_local(
        VECTOR_DB_PATH,
        embeddings,
        allow_dangerous_deserialization=True
    )

    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k}
    )

# =========================
# BM25 Retriever (LangChain Compatible)
# =========================
class BM25RetrieverLC(BaseRetriever):
    """
    BM25 Retriever compatible with LangChain's BaseRetriever
    """

    k: int

    _documents: List[Document] = PrivateAttr(default_factory=list)
    _bm25: BM25Okapi = PrivateAttr(default=None)

    class Config: # type: ignore
        arbitrary_types_allowed = True

    def __init__(self, k: int = 6):
        super().__init__(k=k) # type: ignore

        documents = []
        corpus = []

        for root, _, files in os.walk(FACULTY_DATA_PATH):
            for file in files:
                if file.endswith(".txt"):
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read().strip()
                        if text:
                            documents.append(
                                Document(page_content=text, metadata={"source": file})
                            )
                            corpus.append(text.lower().split())

        if not corpus:
            raise ValueError("No faculty data found for BM25 retriever")

        self._documents = documents
        self._bm25 = BM25Okapi(corpus)

    def get_relevant_documents(self, query: str) -> List[Document]: # type: ignore
        tokens = query.lower().split()
        return self._bm25.get_top_n(tokens, self._documents, n=self.k)

# =========================
# Ensemble Retriever
# =========================
def get_faculty_ensemble_retriever(k: int = 6):
    semantic_retriever = get_semantic_retriever(k)
    bm25_retriever = BM25RetrieverLC(k) # type: ignore

    ensemble_retriever = EnsembleRetriever(
        retrievers=[bm25_retriever, semantic_retriever],
        weights=[0.4, 0.6]  # BM25 + Semantic balance
    )

    return ensemble_retriever
