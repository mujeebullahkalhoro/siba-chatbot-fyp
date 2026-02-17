# rag/retrievers/policies_retrievers.py

import os
from typing import List
from pathlib import Path

try:
    from langchain_core.pydantic_v1 import PrivateAttr
except ImportError:
    from pydantic import PrivateAttr

from rank_bm25 import BM25Okapi
from langchain.vectorstores import FAISS
from langchain.retrievers import EnsembleRetriever
from langchain.schema import Document, BaseRetriever
from langchain_community.document_loaders import TextLoader, PyPDFLoader

from embeddings.embedding_model import get_embedding_model

# =========================
# Paths
# =========================
VECTOR_DB_PATH = str(Path(__file__).parent.parent / "vector_db" / "policies")
POLICIES_DATA_PATH = str(Path(__file__).parent.parent / "data" / "policies")

# =========================
# Semantic Retriever (FAISS)
# =========================
def get_policies_semantic_retriever(k: int = 6):
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
class PoliciesBM25Retriever(BaseRetriever):
    """BM25 Retriever for policy documents — handles both TXT and PDF."""

    k: int

    _documents: List[Document] = PrivateAttr(default_factory=list)
    _bm25: BM25Okapi = PrivateAttr(default=None)

    class Config:  # type: ignore
        arbitrary_types_allowed = True

    def __init__(self, k: int = 6):
        super().__init__(k=k)  # type: ignore

        documents = []
        corpus = []

        for root, _, files in os.walk(POLICIES_DATA_PATH):
            for file in files:
                file_path = os.path.join(root, file)

                if file.endswith(".txt"):
                    with open(file_path, "r", encoding="utf-8") as f:
                        text = f.read().strip()
                        if text:
                            documents.append(
                                Document(page_content=text, metadata={"source": file})
                            )
                            corpus.append(text.lower().split())

                elif file.endswith(".pdf"):
                    try:
                        loader = PyPDFLoader(file_path)
                        pdf_docs = loader.load()
                        for doc in pdf_docs:
                            text = doc.page_content.strip()
                            if text:
                                documents.append(
                                    Document(page_content=text, metadata={"source": file})
                                )
                                corpus.append(text.lower().split())
                    except Exception as e:
                        print(f"[WARN] Error loading PDF {file}: {e}")

        if not corpus:
            raise ValueError("No policy data found for BM25 retriever")

        self._documents = documents
        self._bm25 = BM25Okapi(corpus)

    def _get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:  # type: ignore
        tokens = query.lower().split()
        return self._bm25.get_top_n(tokens, self._documents, n=self.k)

# =========================
# Ensemble Retriever
# =========================
def get_policies_ensemble_retriever(k: int = 6):
    semantic_retriever = get_policies_semantic_retriever(k)
    bm25_retriever = PoliciesBM25Retriever(k)  # type: ignore

    ensemble_retriever = EnsembleRetriever(
        retrievers=[bm25_retriever, semantic_retriever],
        weights=[0.4, 0.6]  # BM25 + Semantic balance
    )

    return ensemble_retriever
