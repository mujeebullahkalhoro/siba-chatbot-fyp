"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAnalytics } from "@/services/adminService";

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchAnalytics()
            .then(setData)
            .catch((err) => {
                if (err.message === "UNAUTHORIZED") router.replace("/admin");
            })
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <div style={{ color: "#64748b", fontSize: 14 }}>Loading analytics...</div>
            </div>
        );
    }

    if (!data) return null;

    const maxCount = Math.max(...data.daily_counts.map((d) => d.count), 1);
    const fb = data.feedback;

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
                    Analytics
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                    Usage statistics and user feedback insights
                </p>
            </div>

            {/* Top stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
                <StatCard label="Total Queries" value={data.total_queries} color="#3b82f6" />
                <StatCard label="Feedback Received" value={fb.total} color="#8b5cf6" />
                <StatCard
                    label="Satisfaction Rate"
                    value={fb.total > 0 ? `${fb.satisfaction_rate}%` : "N/A"}
                    color="#10b981"
                />
                <StatCard label="Thumbs Up" value={fb.thumbs_up} color="#22c55e" />
                <StatCard label="Thumbs Down" value={fb.thumbs_down} color="#ef4444" />
            </div>

            {/* Daily queries chart */}
            <div style={{
                background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                padding: "20px 24px", marginBottom: 24,
            }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 16 }}>
                    Daily Queries (Last 7 Days)
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, padding: "0 4px" }}>
                    {data.daily_counts.map((d) => (
                        <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>
                                {d.count}
                            </span>
                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 48,
                                    height: `${Math.max((d.count / maxCount) * 120, 4)}px`,
                                    background: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                                    borderRadius: "4px 4px 0 0",
                                    transition: "height 0.5s ease",
                                }}
                            />
                            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                                {d.date}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Feedback breakdown bar */}
            {fb.total > 0 && (
                <div style={{
                    background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                    padding: "20px 24px", marginBottom: 24,
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>
                        Feedback Breakdown
                    </div>
                    <div style={{
                        display: "flex", height: 28, borderRadius: 6, overflow: "hidden",
                        background: "#f1f5f9",
                    }}>
                        <div style={{
                            width: `${(fb.thumbs_up / fb.total) * 100}%`,
                            background: "#22c55e",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 600, color: "#fff",
                            minWidth: fb.thumbs_up > 0 ? 30 : 0, transition: "width 0.5s ease",
                        }}>
                            {fb.thumbs_up > 0 && `${Math.round((fb.thumbs_up / fb.total) * 100)}%`}
                        </div>
                        <div style={{
                            width: `${(fb.thumbs_down / fb.total) * 100}%`,
                            background: "#ef4444",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 600, color: "#fff",
                            minWidth: fb.thumbs_down > 0 ? 30 : 0, transition: "width 0.5s ease",
                        }}>
                            {fb.thumbs_down > 0 && `${Math.round((fb.thumbs_down / fb.total) * 100)}%`}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 500 }}>● Positive</span>
                        <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 500 }}>● Negative</span>
                    </div>
                </div>
            )}

            {/* Recent feedback */}
            <div style={{
                background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                overflow: "hidden",
            }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        Recent Feedback
                    </div>
                </div>
                {data.recent_feedback.length === 0 ? (
                    <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                        No feedback received yet
                    </div>
                ) : (
                    <div>
                        {/* Header */}
                        <div style={{
                            display: "grid", gridTemplateColumns: "60px 1fr 1.5fr 100px",
                            padding: "8px 16px", background: "#f8fafc",
                            fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
                        }}>
                            <div>Rating</div>
                            <div>Query</div>
                            <div>Response</div>
                            <div>Time</div>
                        </div>
                        {data.recent_feedback.map((entry, i) => (
                            <div
                                key={i}
                                style={{
                                    display: "grid", gridTemplateColumns: "60px 1fr 1.5fr 100px",
                                    padding: "10px 16px", borderTop: "1px solid #f1f5f9",
                                    fontSize: 12, alignItems: "center",
                                }}
                            >
                                <div>
                                    <span style={{
                                        display: "inline-block", padding: "2px 8px", borderRadius: 4,
                                        fontSize: 10, fontWeight: 600,
                                        background: entry.rating === "up" ? "#f0fdf4" : "#fef2f2",
                                        color: entry.rating === "up" ? "#166534" : "#991b1b",
                                    }}>
                                        {entry.rating === "up" ? "👍" : "👎"}
                                    </span>
                                </div>
                                <div style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {entry.query || "—"}
                                </div>
                                <div style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {entry.response_text || "—"}
                                </div>
                                <div style={{ color: "#94a3b8", fontSize: 11 }}>
                                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "—"}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{
            background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
            padding: "16px 20px", flex: "1 1 140px", minWidth: 140,
        }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 2 }}>
                {label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
                {value}
            </div>
            <div style={{ width: 24, height: 3, borderRadius: 2, background: color, marginTop: 6 }} />
        </div>
    );
}
