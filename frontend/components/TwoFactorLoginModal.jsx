"use client";

import React, { useState } from "react";
import { verifyLoginTwoFactor, resendLoginTwoFactorCode } from "@/services/settingsService";

export default function TwoFactorLoginModal({ isOpen, onVerified }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyLoginTwoFactor(code.trim());
      onVerified?.();
    } catch (err) {
      setError(err?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form onSubmit={handleVerify} className="w-full max-w-sm rounded-2xl bg-white border border-[color:var(--border-soft)] shadow-2xl p-6">
        <h3 className="text-lg font-bold text-[#003e80] mb-1">Two-factor authentication</h3>
        <p className="text-sm text-[color:var(--text-muted)] mb-4">Enter the 6-digit code sent to your email.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          placeholder="123456"
          className="w-full rounded-lg border border-[color:var(--border-soft)] px-3 py-2 mb-3"
        />
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <button
          type="button"
          onClick={async () => {
            setError("");
            setResending(true);
            try {
              await resendLoginTwoFactorCode();
            } catch (err) {
              setError(err?.message || "Failed to resend code");
            } finally {
              setResending(false);
            }
          }}
          disabled={resending}
          className="mb-2 w-full rounded-lg border border-[color:var(--border-soft)] py-2 text-sm hover:bg-gray-50"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
        <button disabled={loading || code.trim().length < 6} className="w-full ui-primary-btn rounded-lg py-2 ui-control ui-focus-ring">
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>
    </div>
  );
}
