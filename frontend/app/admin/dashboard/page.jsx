"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchOverview, createCategory, deleteCategory } from "@/services/adminService";

const CATEGORY_META_STATIC = {
    faculty: { label: "Faculty", color: "#3b82f6", desc: "Faculty member profiles and information" },
    policies: { label: "Policies", color: "#8b5cf6", desc: "University policies and guidelines" },
    programs: { label: "Programs", color: "#10b981", desc: "Academic program documentation" },
    schemas: { label: "Course Schemas", color: "#f59e0b", desc: "Course schema and curriculum PDFs" },
    scholarships: { label: "Scholarships", color: "#ec4899", desc: "Scholarship documents and details" },
    introduction: { label: "Introduction", color: "#06b6d4", desc: "University introduction materials" },
    fyp: { label: "FYP", color: "#6366f1", desc: "Final Year Project documentation" },
};

const CORE_CATEGORIES = ["faculty", "policies", "programs", "schemas", "scholarships", "introduction", "fyp"];

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
    
    // Create category state
    const [showModal, setShowModal] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    // Delete category state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const router = useRouter();

    const loadData = () => {
        setLoading(true);
        fetchOverview()
            .then((data) => {
                setCategories(data.categories);
                setLastRebuild(data.last_rebuild_at);
            })
            .catch((err) => {
                if (err.message === "UNAUTHORIZED") router.replace("/admin");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [router]);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        setCreating(true);
        setError("");
        try {
            await createCategory(newCatName);
            setNewCatName("");
            setShowModal(false);
            loadData(); // Refresh list
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteCategory(deleteTarget);
            setDeleteTarget(null);
            loadData(); // Refresh list
        } catch (err) {
            alert("Delete failed: " + err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading && !categories) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <div style={{ color: "#64748b", fontSize: 14 }}>Loading dashboard...</div>
            </div>
        );
    }

    const totalFiles = categories
        ? Object.values(categories).reduce((sum, v) => sum + v.count, 0)
        : 0;

    const categoryKeys = categories ? Object.keys(categories) : [];

    return (
        <div>
            <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
                        Dashboard
                    </h1>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                        Overview of all knowledge base documents
                    </p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    style={{
                        padding: "8px 16px",
                        background: "#003e80",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    New Category
                </button>
            </div>

            {/* Create Category Modal */}
            {showModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
                }}>
                    <div style={{
                        background: "#fff", borderRadius: 12, padding: 24,
                        width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
                    }}>
                        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Create Category</h3>
                        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>This will create a new folder in rag/data.</p>
                        
                        <form onSubmit={handleCreateCategory}>
                            <input 
                                autoFocus
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                placeholder="Category Name (e.g. CDC, EDC, Events)"
                                style={{
                                    width: "100%", padding: "10px 12px", borderRadius: 6,
                                    border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16,
                                    color: "#1e293b",
                                    outline: "none",
                                }}
                            />
                            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
                            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                                <button 
                                    type="button"
                                    onClick={() => { setShowModal(false); setError(""); }}
                                    style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={creating || !newCatName.trim()}
                                    style={{ 
                                        padding: "8px 20px", 
                                        background: "#ea6645", 
                                        color: "#fff", 
                                        border: "none", 
                                        borderRadius: 6, 
                                        cursor: "pointer", 
                                        fontSize: 13, 
                                        fontWeight: 600,
                                        opacity: (creating || !newCatName.trim()) ? 0.6 : 1
                                    }}
                                >
                                    {creating ? "Creating..." : "Create Folder"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Category Confirmation Modal */}
            {deleteTarget && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
                }}>
                    <div style={{
                        background: "#fff", borderRadius: 12, padding: 24,
                        width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
                    }}>
                        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Delete Category</h3>
                        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong>{deleteTarget}</strong>? <br />
                            All documents inside this folder will be permanently removed.
                        </p>
                        
                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button 
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                style={{ padding: "8px 16px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteCategory}
                                disabled={isDeleting}
                                style={{ 
                                    padding: "8px 20px", 
                                    background: "#ef4444", 
                                    color: "#fff", 
                                    border: "none", 
                                    borderRadius: 6, 
                                    cursor: "pointer", 
                                    fontSize: 13, 
                                    fontWeight: 600,
                                    opacity: isDeleting ? 0.6 : 1
                                }}
                            >
                                {isDeleting ? "Deleting..." : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        {categoryKeys.length} categories
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
                        Rebuild Store
                    </div>
                    <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 3, fontWeight: 500 }}>
                        Apply all changes to AI →
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
                {categoryKeys.map((key) => {
                    const data = categories?.[key] || { count: 0 };
                    const meta = CATEGORY_META_STATIC[key] || {
                        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
                        color: "#64748b",
                        desc: "Custom data category"
                    };
                    const isProtected = CORE_CATEGORIES.includes(key);
                    
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
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setDeleteTarget(key); 
                                        }}
                                        style={{ 
                                            background: "none", 
                                            border: "none", 
                                            color: "#f87171", 
                                            cursor: "pointer", 
                                            padding: "4px",
                                            display: "flex",
                                            alignItems: "center",
                                            borderRadius: 4,
                                            transition: "background 0.2s"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                        title="Delete Category"
                                    >
                                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: "50%",
                                        background: meta.color, flexShrink: 0,
                                    }} />
                                </div>
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
