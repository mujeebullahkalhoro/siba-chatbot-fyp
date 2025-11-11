import os
from dotenv import load_dotenv

load_dotenv()

ALLOW_ORIGINS_RAW = os.getenv(
    "ALLOW_ORIGINS",
    "http://localhost:3000,https://siba-chatbot.vercel.app"
)
ALLOW_ORIGINS = [o.strip() for o in ALLOW_ORIGINS_RAW.split(",") if o.strip()]

MONGO_URI = os.environ["MONGO_URI"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]  # <-- required for code flow
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")  # <-- used for redirects
