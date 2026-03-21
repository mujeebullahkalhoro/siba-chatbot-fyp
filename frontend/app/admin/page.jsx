"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/services/adminService";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await adminLogin(email, password);
            router.push("/admin/dashboard");
        } catch (err) {
            setError(err.message || "Login failed");
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#003e80" }}>
                        Admin Panel
                    </h1>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                        Sukkur IBA University — AI Chatbot
                    </p>
                </div>

                {/* Error */}
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

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 5 }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@siba.edu.pk"
                            required
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 6,
                                border: "1px solid #d1d5db",
                                fontSize: 14,
                                outline: "none",
                                boxSizing: "border-box",
                                transition: "border 0.15s",
                            }}
                            onFocus={(e) => e.target.style.borderColor = "#ea6645"}
                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                        />
                    </div>

                    <div style={{ marginBottom: 22 }}>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 5 }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 6,
                                border: "1px solid #d1d5db",
                                fontSize: 14,
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
                        }}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#94a3b8", margin: "20px 0 0" }}>
                    Sukkur IBA University
                </p>
            </div>
        </div>
    );
}
