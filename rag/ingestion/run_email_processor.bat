@echo off
:: run_email_processor.bat
:: This script is called by Windows Task Scheduler to update the chatbot knowledge base.

cd /d "d:\siba-chatbot-fyp\rag\ingestion"
set PYTHONIOENCODING=utf-8
"d:\siba-chatbot-fyp\backend\venv\Scripts\python.exe" "email_handler.py" >> "email_processing_log.txt" 2>&1
