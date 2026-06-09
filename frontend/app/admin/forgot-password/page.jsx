"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getApiBase } from "@/lib/apiBase";
import axios from "axios";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await axios.post(`${getApiBase()}/api/admin/forgot-password`, { email });
            setMessage(res.data.message || "If this email is registered, a reset link will be sent.");
        } catch (err) {
            setError(err.response?.data?.detail || "Something went wrong. Please try again.");
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#003e80" }}>
                        Forgot Password
                    </h1>
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                        Enter your email address and we&apos;ll send you a link to reset your password.
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
                        {message}
                    </div>
                )}

                {/* Form */}
                {!message && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 22 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 5 }}>
                                Admin Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="muhammaduzair1411@gmail.com"
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
                            {loading ? "Sending..." : "Send Reset Link"}
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
