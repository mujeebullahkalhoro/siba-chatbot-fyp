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

# Email (used for 2FA login OTP)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER or "no-reply@siba-chatbot.local")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}

# Admin panel credentials
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@siba.edu.pk")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN_SECRET = os.getenv("ADMIN_TOKEN_SECRET", "default_admin_secret")
MAINTENANCE_INTERNAL_TOKEN = os.getenv("MAINTENANCE_INTERNAL_TOKEN", "")

