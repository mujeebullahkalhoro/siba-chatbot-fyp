"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchOverview } from "@/services/adminService";

const CATEGORY_META = {
    faculty: { label: "Faculty", color: "#3b82f6", desc: "Faculty member profiles and information" },
    policies: { label: "Policies", color: "#8b5cf6", desc: "University policies and guidelines" },
    programs: { label: "Programs", color: "#10b981", desc: "Academic program documentation" },
    schemas: { label: "Course Schemas", color: "#f59e0b", desc: "Course schema and curriculum PDFs" },
    scholarships: { label: "Scholarships", color: "#ec4899", desc: "Scholarship documents and details" },
    introduction: { label: "Introduction", color: "#06b6d4", desc: "University introduction materials" },
    fyp: { label: "FYP", color: "#6366f1", desc: "Final Year Project documentation" },
};

function timeAgo(isoString) {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function AdminDashboard() {
    const [categories, setCategories] = useState(null);
    const [lastRebuild, setLastRebuild] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchOverview()
            .then((data) => {
                setCategories(data.categories);
                setLastRebuild(data.last_rebuild_at);
            })
            .catch((err) => {
                if (err.message === "UNAUTHORIZED") router.replace("/admin");
            })
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <div style={{ color: "#64748b", fontSize: 14 }}>Loading dashboard...</div>
            </div>
        );
    }

    const totalFiles = categories
        ? Object.values(categories).reduce((sum, v) => sum + v.count, 0)
        : 0;

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
                    Dashboard
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                    Overview of all knowledge base documents
                </p>
            </div>

            {/* Status bar */}
            <div style={{
                display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap",
            }}>
                {/* Total card */}
                <div style={{
                    background: "#0f172a",
                    borderRadius: 10,
                    padding: "20px 24px",
                    color: "#fff",
                    flex: "1 1 200px",
                    minWidth: 200,
                }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginBottom: 2 }}>Total Documents</div>
                    <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>{totalFiles}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {Object.keys(CATEGORY_META).length} categories
                    </div>
                </div>

                {/* Last rebuild card */}
                <div style={{
                    background: "#fff",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: "20px 24px",
                    flex: "1 1 200px",
                    minWidth: 200,
                }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginBottom: 2 }}>Vector Store Status</div>
                    {lastRebuild ? (
                        <>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                                {timeAgo(lastRebuild)}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                                Last rebuilt: {new Date(lastRebuild).toLocaleString()}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", lineHeight: 1.3 }}>
                                Not built
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                                No rebuild has been triggered yet
                            </div>
                        </>
                    )}
                </div>

                {/* Quick action */}
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        padding: "20px 24px",
                        flex: "1 1 200px",
                        minWidth: 200,
                        cursor: "pointer",
                        transition: "box-shadow 0.2s",
                    }}
                    onClick={() => router.push("/admin/rebuild")}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginBottom: 2 }}>Quick Action</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                        Rebuild
                    </div>
                    <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 3, fontWeight: 500 }}>
                        Rebuild vector store →
                    </div>
                </div>
            </div>

            {/* Category cards */}
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Data Categories
            </div>
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
            }}>
                {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const data = categories?.[key] || { count: 0 };
                    return (
                        <div
                            key={key}
                            style={{
                                background: "#fff",
                                borderRadius: 10,
                                border: "1px solid #e2e8f0",
                                padding: "18px 20px",
                                cursor: "pointer",
                                transition: "box-shadow 0.2s, transform 0.15s",
                            }}
                            onClick={() => router.push(`/admin/${key}`)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                                e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "none";
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
                                        {meta.label}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{meta.desc}</div>
                                </div>
                                <div style={{
                                    width: 8, height: 8, borderRadius: "50%",
                                    background: meta.color, flexShrink: 0, marginTop: 6,
                                }} />
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{data.count}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: meta.color }}>
                                    Manage →
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
