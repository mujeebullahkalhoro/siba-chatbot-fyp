import os
from langchain.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rag.embeddings.embedding_model import get_embedding_model

FACULTY_DATA_PATH = "rag/data/faculty"
VECTOR_DB_PATH = "rag/vector_db/faculty"

def build_faculty_vectorstore():
    documents = []

    for root, _, files in os.walk(FACULTY_DATA_PATH):
        for file in files:
            if file.endswith(".txt"):
                file_path = os.path.join(root, file)
                loader = TextLoader(file_path, encoding="utf-8")
                documents.extend(loader.load())

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=50
    )

    docs = splitter.split_documents(documents)

    embeddings = get_embedding_model()
    vectorstore = FAISS.from_documents(docs, embeddings)

    vectorstore.save_local(VECTOR_DB_PATH)
    print("✅ Faculty vector store created successfully")

if __name__ == "__main__":
    build_faculty_vectorstore()
