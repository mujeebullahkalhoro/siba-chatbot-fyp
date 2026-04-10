import { getApiBase } from "@/lib/apiBase";

const API_BASE = getApiBase();

const withJson = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

export async function getUserSettings() {
  const res = await fetch(`${API_BASE}/api/settings`, { ...withJson, method: "GET" });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function saveUserSettings(settings) {
  const res = await fetch(`${API_BASE}/api/settings`, {
    ...withJson,
    method: "PUT",
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/api/settings/profile`, { ...withJson, method: "GET" });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export async function updateProfile(payload) {
  const res = await fetch(`${API_BASE}/api/settings/profile`, {
    ...withJson,
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save profile");
  return res.json();
}

export async function toggleTwoFactor(enabled) {
  const res = await fetch(`${API_BASE}/api/auth/2fa/toggle`, {
    ...withJson,
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to update 2FA");
  return res.json();
}

export async function resendLoginTwoFactorCode() {
  const res = await fetch(`${API_BASE}/api/auth/2fa/resend-login-code`, {
    ...withJson,
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Failed to resend code");
  return res.json();
}

// Backward-compatible exports for older settings modal usage.
export async function setupTwoFactor() {
  return { secret: "", otpauth_url: "" };
}

export async function enableTwoFactor() {
  return toggleTwoFactor(true);
}

export async function disableTwoFactor() {
  return toggleTwoFactor(false);
}

export async function verifyLoginTwoFactor(code) {
  const res = await fetch(`${API_BASE}/api/auth/2fa/verify-login`, {
    ...withJson,
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("Invalid 2FA code");
  return res.json();
}
