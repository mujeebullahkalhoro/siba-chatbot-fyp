# rag/vectorstores/universal_vectorStore.py

import os
import sys
from pathlib import Path

# Add rag directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from embeddings.embedding_model import get_embedding_model

import shutil

# All data directories to include
DATA_ROOT = str(Path(__file__).parent.parent / "data")
VECTOR_DB_PATH = str(Path(__file__).parent.parent / "vector_db" / "universal")


def build_universal_vectorstore():
    """Build a single FAISS vector store from ALL documents across all categories."""
    
    # Clear existing vector store if it exists
    if os.path.exists(VECTOR_DB_PATH):
        print(f"Removing old vector store at {VECTOR_DB_PATH}...")
        shutil.rmtree(VECTOR_DB_PATH)

    documents = []

    # Walk through ALL subdirectories in data/
    for root, _, files in os.walk(DATA_ROOT):
        for file in files:
            file_path = os.path.join(root, file)

            # Determine which category this file belongs to (from folder name)
            relative_path = os.path.relpath(root, DATA_ROOT)
            category = relative_path.split(os.sep)[0] if relative_path != "." else "unknown"

            if file.endswith(".txt"):
                print(f" Loading TXT [{category}]: {file}")
                loader = TextLoader(file_path, encoding="utf-8")
                loaded_docs = loader.load()
                for doc in loaded_docs:
                    doc.metadata["category"] = category
                documents.extend(loaded_docs)

            elif file.endswith(".pdf"):
                print(f" Loading PDF [{category}]: {file}")
                try:
                    loader = PyPDFLoader(file_path)
                    loaded_docs = loader.load()
                    for doc in loaded_docs:
                        doc.metadata["category"] = category
                    documents.extend(loaded_docs)
                except Exception as e:
                    print(f"[WARN] Error loading PDF {file}: {e}")

    if not documents:
        raise ValueError("No documents found in data directory!")

    print(f"\n📊 Total raw documents loaded: {len(documents)}")

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    docs = splitter.split_documents(documents)
    print(f"📊 Total chunks after splitting: {len(docs)}")

    # Build FAISS index
    embeddings = get_embedding_model()
    vectorstore = FAISS.from_documents(docs, embeddings)

    vectorstore.save_local(VECTOR_DB_PATH)
    print(f"\n✅ Universal vector store created at: {VECTOR_DB_PATH}")
    print(f"   Total vectors: {len(docs)}")


if __name__ == "__main__":
    build_universal_vectorstore()
