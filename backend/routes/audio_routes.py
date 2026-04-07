
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
    temp_audio_path = None
    try:
        # Create a temporary file to save the uploaded audio
        # Groq expects a proper file extension to help with format detection
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            # Fallback based on content type if extension is missing
            content_type = file.content_type
            if "webm" in content_type: file_ext = ".webm"
            elif "mp4" in content_type: file_ext = ".mp4"
            elif "mpeg" in content_type: file_ext = ".mp3"
            else: file_ext = ".m4a"

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_audio:
            shutil.copyfileobj(file.file, temp_audio)
            temp_audio_path = temp_audio.name

        try:
            print(f"Transcribing file: {temp_audio_path} with original name: {file.filename}")
            with open(temp_audio_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=(temp_audio_path, audio_file.read()),
                    model="whisper-large-v3",
                    temperature=0,
                    response_format="verbose_json",
                )
            
            if not transcription or not hasattr(transcription, 'text'):
                print(f"Transcription result missing text: {transcription}")
                raise HTTPException(status_code=500, detail="Transcription result is empty")

            return {"text": transcription.text}

        except Exception as groq_err:
            print(f"Groq API error: {groq_err}")
            # Log more details if it's a Groq error
            if hasattr(groq_err, 'body'):
                print(f"Groq Error Body: {groq_err.body}")
            raise HTTPException(status_code=500, detail=f"Transcription service error: {str(groq_err)}")

    except Exception as e:
        print(f"General transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except Exception as cleanup_err:
                print(f"Failed to delete temp file {temp_audio_path}: {cleanup_err}")
