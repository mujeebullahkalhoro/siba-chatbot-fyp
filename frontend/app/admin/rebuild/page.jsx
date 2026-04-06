"use client";
import { useState, useEffect, useRef } from "react";
import { triggerRebuild, fetchRebuildStatus } from "@/services/adminService";

export default function RebuildPage() {
    const [status, setStatus] = useState({ running: false, message: "", success: null });
    const [starting, setStarting] = useState(false);
    const intervalRef = useRef(null);

    const pollStatus = async () => {
        try {
            const s = await fetchRebuildStatus();
            setStatus(s);
            if (!s.running && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        } catch { }
    };

    useEffect(() => {
        const checkInitialStatus = async () => {
            try {
                const s = await fetchRebuildStatus();
                setStatus(s);
                if (s.running && !intervalRef.current) {
                    intervalRef.current = setInterval(pollStatus, 2000);
                }
            } catch { }
        };
        checkInitialStatus();
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const handleRebuild = async () => {
        setStarting(true);
        try {
            await triggerRebuild();
            setStatus({ running: true, message: "Rebuilding vector store...", success: null });
            intervalRef.current = setInterval(pollStatus, 2000);
        } catch (err) {
            setStatus({ running: false, message: err.message, success: false });
        } finally {
            setStarting(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
                    Vector Store Management
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                    Rebuild the retriever after modifying documents
                </p>
            </div>

            {/* Warning */}
            <div style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 24,
                fontSize: 13,
                color: "#92400e",
                lineHeight: 1.5,
            }}>
                <strong>Note:</strong> During the rebuild process, the chatbot will be temporarily unavailable. Users will see a maintenance notice until the rebuild is complete.
            </div>

            {/* Status card */}
            <div style={{
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                padding: 28,
                maxWidth: 520,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: status.running ? "#f59e0b" : status.success === true ? "#10b981" : status.success === false ? "#ef4444" : "#3b82f6",
                    }} />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: "#0f172a" }}>
                            Universal Retriever
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                            {status.running ? "Rebuilding..." : status.success === true ? "Online" : status.success === false ? "Error" : "Ready"}
                        </div>
                    </div>
                </div>

                {status.message && (
                    <div style={{
                        padding: "12px 16px", borderRadius: 8,
                        background: status.success === false ? "#fef2f2" : status.success === true ? "#f0fdf4" : "#f8fafc",
                        border: `1px solid ${status.success === false ? "#fecaca" : status.success === true ? "#bbf7d0" : "#e2e8f0"}`,
                        fontSize: 14, color: status.success === false ? "#991b1b" : status.success === true ? "#166534" : "#374151", 
                        marginBottom: 20,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10
                    }}>
                        {status.success === true && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20, flexShrink: 0 }}>
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4.13-5.69z" clipRule="evenodd" />
                            </svg>
                        )}
                        {status.success === false && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20, flexShrink: 0 }}>
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                            </svg>
                        )}
                        <div>
                            <div style={{ fontWeight: 600 }}>{status.success === true ? "Success" : status.success === false ? "Rebuild Failed" : "Status"}</div>
                            <div style={{ opacity: 0.9 }}>{status.message}</div>
                            {status.last_rebuild_at && (
                                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                                    Last synchronized: {new Date(status.last_rebuild_at).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {status.running && (
                    <div style={{
                        width: "100%", height: 4, background: "#e2e8f0",
                        borderRadius: 2, overflow: "hidden", marginBottom: 20,
                    }}>
                        <div style={{
                            height: "100%",
                            background: "#0f172a",
                            borderRadius: 2,
                            animation: "progress 1.5s ease-in-out infinite",
                        }} />
                    </div>
                )}

                <button
                    onClick={handleRebuild}
                    disabled={status.running || starting}
                    style={{
                        width: "100%", padding: "12px 0", borderRadius: 6,
                        border: "none",
                        background: status.running || starting ? "#94a3b8" : "#0f172a",
                        color: "#fff", fontWeight: 600, fontSize: 14,
                        cursor: status.running || starting ? "not-allowed" : "pointer",
                    }}
                >
                    {status.running ? "Rebuilding..." : starting ? "Starting..." : "Rebuild Vector Store"}
                </button>

                <p style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                    Chatbot will enter maintenance mode during this process
                </p>
            </div>

            <style>{`
        @keyframes progress {
          0%, 100% { width: 20%; margin-left: 0; }
          50% { width: 60%; margin-left: 40%; }
        }
      `}</style>
        </div>
    );
}
