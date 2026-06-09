"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/apiBase";
import axios from "axios";

function ResetPasswordForm() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing reset token.");
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${getApiBase()}/api/admin/reset-password`, { 
                token, 
                new_password: newPassword 
            });
            setMessage(res.data.message || "Password reset successfully!");
            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push("/admin");
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to reset password. The link may be expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#003e80",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            <div style={{
                width: 400,
                maxWidth: "90vw",
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
                padding: "44px 36px",
            }}>
                {/* Title */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 48, height: 48,
                        borderRadius: 10,
                        background: "#ea6645",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                    }}>
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#003e80" }}>
                        Reset Password
                    </h1>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                        Enter your new password below.
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        fontSize: 13,
                        marginBottom: 18,
                        textAlign: "center",
                    }}>
                        {error}
                    </div>
                )}
                {message && (
                    <div style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#16a34a",
                        fontSize: 13,
                        marginBottom: 18,
                        textAlign: "center",
                    }}>
                        {message} Redirecting to login...
                    </div>
                )}

                {/* Form */}
                {!message && token && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 5 }}>
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    fontSize: 14,
                                    color: "#1e293b",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    transition: "border 0.15s",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#ea6645"}
                                onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                            />
                        </div>

                        <div style={{ marginBottom: 26 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 5 }}>
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat new password"
                                required
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    fontSize: 14,
                                    color: "#1e293b",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    transition: "border 0.15s",
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#ea6645"}
                                onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "11px 0",
                                borderRadius: 6,
                                border: "none",
                                background: loading ? "#94a3b8" : "#ea6645",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: loading ? "not-allowed" : "pointer",
                                boxShadow: "0 4px 6px -1px rgba(234, 102, 69, 0.2)",
                                transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => !loading && (e.target.style.background = "#d95a3d")}
                            onMouseOut={(e) => !loading && (e.target.style.background = "#ea6645")}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: "center", marginTop: 24 }}>
                    <Link 
                        href="/admin" 
                        style={{ fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
                        onMouseOver={(e) => e.target.style.color = "#003e80"}
                        onMouseOut={(e) => e.target.style.color = "#64748b"}
                    >
                        &larr; Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#003e80",
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                color: "#fff",
                fontSize: 14
            }}>
                Loading...
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
