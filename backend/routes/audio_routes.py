
import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from groq import Groq
import tempfile
from dotenv import load_dotenv

# Load .env
load_dotenv()

router = APIRouter()

# Initialize Groq client
# Ensure GROQ_API_KEY is set in environment variables
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@router.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Create a temporary file to save the uploaded audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_audio:
            shutil.copyfileobj(file.file, temp_audio)
            temp_audio_path = temp_audio.name

        try:
            with open(temp_audio_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=(temp_audio_path, audio_file.read()),
                    model="whisper-large-v3",
                    temperature=0,
                    response_format="verbose_json",
                )
            
            return {"text": transcription.text}

        finally:
            if os.path.exists(temp_audio_path):
                os.remove(temp_audio_path)

    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
