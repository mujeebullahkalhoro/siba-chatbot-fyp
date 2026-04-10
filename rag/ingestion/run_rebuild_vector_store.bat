@echo off
:: run_rebuild_vector_store.bat
:: Manual vector store rebuild helper (with maintenance mode toggle).

cd /d "d:\siba-chatbot-fyp\rag\ingestion"
set PYTHONIOENCODING=utf-8
"d:\siba-chatbot-fyp\backend\venv\Scripts\python.exe" "rebuild_vector_store.py"
