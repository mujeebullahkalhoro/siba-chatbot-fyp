from __future__ import annotations

import smtplib
from email.message import EmailMessage

from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_USE_TLS


def send_email_otp(*, to_email: str, otp_code: str) -> None:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.")

    msg = EmailMessage()
    msg["Subject"] = "Your SIBA Chatbot login verification code"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        (
            "Your SIBA Chatbot verification code is:\n\n"
            f"{otp_code}\n\n"
            "This code expires in 10 minutes.\n"
            "If you did not request this, you can ignore this email."
        )
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


def send_admin_reset_email(*, to_email: str, reset_link: str) -> None:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError("SMTP is not configured for admin reset email.")

    msg = EmailMessage()
    msg["Subject"] = "Admin Password Reset Request - SIBA Chatbot"
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        (
            "You requested a password reset for the SIBA Chatbot Admin Panel.\n\n"
            "Click the link below to set a new password:\n"
            f"{reset_link}\n\n"
            "This link will expire in 20 minutes.\n"
            "If you did not request this, please secure your account."
        )
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)

