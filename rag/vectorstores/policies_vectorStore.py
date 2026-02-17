# rag/vectorstores/policies_vectorStore.py

import os
import sys
from pathlib import Path

# Add rag directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from embeddings.embedding_model import get_embedding_model

POLICIES_DATA_PATH = str(Path(__file__).parent.parent / "data" / "policies")
VECTOR_DB_PATH = str(Path(__file__).parent.parent / "vector_db" / "policies")


def build_policies_vectorstore():
    documents = []

    for root, _, files in os.walk(POLICIES_DATA_PATH):
        for file in files:
            file_path = os.path.join(root, file)

            if file.endswith(".txt"):
                print(f"📄 Loading TXT: {file}")
                loader = TextLoader(file_path, encoding="utf-8")
                documents.extend(loader.load())

            elif file.endswith(".pdf"):
                print(f"📕 Loading PDF: {file}")
                loader = PyPDFLoader(file_path)
                documents.extend(loader.load())

    if not documents:
        raise ValueError("No policy documents found!")

    print(f"\n📊 Total raw documents loaded: {len(documents)}")

    # Smaller chunks for policy precision — policies have dense info
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    docs = splitter.split_documents(documents)
    print(f"📊 Total chunks after splitting: {len(docs)}")

    # Add policy name metadata
    for doc in docs:
        source = doc.metadata.get("source", "")
        policy_name = Path(source).stem.replace("_", " ").title()
        doc.metadata["policy_name"] = policy_name

    embeddings = get_embedding_model()
    vectorstore = FAISS.from_documents(docs, embeddings)

    vectorstore.save_local(VECTOR_DB_PATH)
    print(f"\n✅ Policies vector store created at: {VECTOR_DB_PATH}")
    print(f"   Total vectors: {len(docs)}")


if __name__ == "__main__":
    build_policies_vectorstore()
