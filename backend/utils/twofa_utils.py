from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote


def generate_base32_secret(length: int = 20) -> str:
    raw = secrets.token_bytes(length)
    return base64.b32encode(raw).decode("utf-8").rstrip("=")


def _normalize_base32_secret(secret: str) -> bytes:
    compact = (secret or "").strip().replace(" ", "").upper()
    pad = "=" * ((8 - len(compact) % 8) % 8)
    return base64.b32decode(compact + pad, casefold=True)


def _hotp(secret: str, counter: int, digits: int = 6) -> str:
    key = _normalize_base32_secret(secret)
    counter_bytes = struct.pack(">Q", counter)
    digest = hmac.new(key, counter_bytes, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = (
        ((digest[offset] & 0x7F) << 24)
        | ((digest[offset + 1] & 0xFF) << 16)
        | ((digest[offset + 2] & 0xFF) << 8)
        | (digest[offset + 3] & 0xFF)
    )
    return str(code_int % (10 ** digits)).zfill(digits)


def generate_totp(secret: str, period: int = 30, digits: int = 6, for_time: int | None = None) -> str:
    current = int(for_time if for_time is not None else time.time())
    counter = current // period
    return _hotp(secret, counter, digits=digits)


def verify_totp(code: str, secret: str, period: int = 30, digits: int = 6, window: int = 1) -> bool:
    normalized = (code or "").strip()
    if not normalized.isdigit() or len(normalized) != digits:
        return False

    now = int(time.time())
    current_counter = now // period
    for delta in range(-window, window + 1):
        expected = _hotp(secret, current_counter + delta, digits=digits)
        if hmac.compare_digest(expected, normalized):
            return True
    return False


def build_otpauth_uri(email: str, secret: str, issuer: str = "SIBA Chatbot") -> str:
    account_label = quote(f"{issuer}:{email}")
    issuer_quoted = quote(issuer)
    return f"otpauth://totp/{account_label}?secret={secret}&issuer={issuer_quoted}&algorithm=SHA1&digits=6&period=30"
