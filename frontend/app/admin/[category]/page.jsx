"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    fetchCategoryFiles,
    fetchFileContent,
    updateFile,
    deleteFile,
    uploadFile,
    replaceFile,
} from "@/services/adminService";

const CATEGORY_LABELS = {
    faculty: "Faculty Documents",
    policies: "Policies Documents",
    programs: "Programs Documents",
    schemas: "Course Schemas",
    scholarships: "Scholarships",
    introduction: "Introduction",
    fyp: "FYP Documents",
};

export default function CategoryPage() {
    const params = useParams();
    const category = params.category;
    const router = useRouter();

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [originalContent, setOriginalContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [selectedDept, setSelectedDept] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [message, setMessage] = useState(null);
    const [preview, setPreview] = useState(null); // {name, type, content}

    const loadFiles = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchCategoryFiles(category);
            setFiles(data.files || []);
        } catch (err) {
            if (err.message === "UNAUTHORIZED") router.replace("/admin");
        } finally {
            setLoading(false);
        }
    }, [category, router]);

    useEffect(() => {
        if (category && CATEGORY_LABELS[category]) loadFiles();
    }, [category, loadFiles]);

    const showMessage = (text, type = "success") => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const departments = category === "faculty"
        ? ["All", ...new Set(files.filter(f => f.department).map(f => f.department))].sort()
        : [];

    const filtered = files.filter((f) => {
        if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (category === "faculty" && selectedDept !== "All" && f.department !== selectedDept) return false;
        return true;
    });

    const handlePreview = async (filename, fileType) => {
        try {
            if (fileType === "txt") {
                const data = await fetchFileContent(category, filename);
                setPreview({ name: filename, type: "txt", content: data.content });
            } else {
                const token = localStorage.getItem("admin_token");
                const res = await fetch(`/api/admin/categories/${category}/download/${encodeURIComponent(filename)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to fetch PDF");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPreview({ name: filename, type: "pdf", content: url });
            }
        } catch {
            showMessage("Failed to load preview", "error");
        }
    };

    const handleDownload = async (filename) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/categories/${category}/download/${encodeURIComponent(filename)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showMessage("Download failed", "error");
        }
    };

    const handleEdit = async (filename) => {
        try {
            const data = await fetchFileContent(category, filename);
            if (data.type === "txt") {
                setEditing({ name: filename, type: "txt" });
                setEditContent(data.content);
                setOriginalContent(data.content);
            } else {
                showMessage("PDF files can only be replaced via upload", "info");
            }
        } catch (err) {
            showMessage("Failed to load file: " + err.message, "error");
        }
    };

    const handleSave = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            await updateFile(category, editing.name, editContent);
            showMessage(`${editing.name} updated successfully`);
            setEditing(null);
            loadFiles();
        } catch (err) {
            showMessage("Save failed: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (filename) => {
        try {
            await deleteFile(category, filename);
            showMessage(`${filename} deleted`);
            setDeleteConfirm(null);
            loadFiles();
        } catch (err) {
            showMessage("Delete failed: " + err.message, "error");
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await uploadFile(category, file);
            showMessage(`${file.name} uploaded successfully`);
            loadFiles();
        } catch (err) {
            showMessage("Upload failed: " + err.message, "error");
        }
        e.target.value = "";
    };

    const handleReplace = async (filename, e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await replaceFile(category, filename, file);
            showMessage(`${filename} replaced with ${file.name}`);
            loadFiles();
        } catch (err) {
            showMessage("Replace failed: " + err.message, "error");
        }
        e.target.value = "";
    };

    const hasUnsavedChanges = editing && editContent !== originalContent;

    // Browser tab close / reload warning
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasUnsavedChanges]);

    const handleBack = () => {
        if (hasUnsavedChanges) {
            if (!window.confirm("You have unsaved changes. Discard and go back?")) return;
        }
        setEditing(null);
    };

    if (!CATEGORY_LABELS[category]) {
        return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Category not found</div>;
    }

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    };

    // Editor view
    if (editing) {
        return (
            <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                        <button
                            onClick={handleBack}
                            style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, marginBottom: 6, padding: 0 }}
                        >
                            ← Back to {CATEGORY_LABELS[category]}
                        </button>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                            {editing.name}
                        </h2>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: "9px 22px", borderRadius: 6, border: "none",
                            background: saving ? "#94a3b8" : "#0f172a",
                            color: "#fff", fontWeight: 600, fontSize: 13,
                            cursor: saving ? "not-allowed" : "pointer",
                        }}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
                <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                        width: "100%", minHeight: 500, padding: 16,
                        borderRadius: 8, border: "1px solid #e2e8f0",
                        fontSize: 13, fontFamily: "'SF Mono', 'Consolas', monospace",
                        lineHeight: 1.7, resize: "vertical", outline: "none",
                        boxSizing: "border-box", background: "#fff",
                    }}
                />
            </div>
        );
    }

    return (
        <div>
            {/* Toast */}
            {message && (
                <div style={{
                    position: "fixed", top: 16, right: 16, zIndex: 1000,
                    padding: "10px 18px", borderRadius: 8,
                    background: message.type === "error" ? "#fef2f2" : message.type === "info" ? "#eff6ff" : "#f0fdf4",
                    border: `1px solid ${message.type === "error" ? "#fecaca" : message.type === "info" ? "#bfdbfe" : "#bbf7d0"}`,
                    color: message.type === "error" ? "#dc2626" : message.type === "info" ? "#2563eb" : "#16a34a",
                    fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}>
                    {message.text}
                </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }} onClick={() => setDeleteConfirm(null)}>
                    <div style={{
                        background: "#fff", borderRadius: 12, padding: "24px 28px", width: 380, maxWidth: "90vw",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                    }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#0f172a", fontWeight: 600 }}>Confirm Deletion</h3>
                        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong>{deleteConfirm}</strong>? This cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{
                                padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0",
                                background: "#fff", color: "#374151", fontSize: 13, cursor: "pointer",
                            }}>Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} style={{
                                padding: "8px 16px", borderRadius: 6, border: "none",
                                background: "#dc2626", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
                            }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview modal */}
            {preview && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }} onClick={() => setPreview(null)}>
                    <div style={{
                        background: "#fff", borderRadius: 12,
                        width: "80%", maxWidth: 900, height: "80vh",
                        display: "flex", flexDirection: "column",
                        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "14px 20px",
                            borderBottom: "1px solid #e2e8f0",
                            flexShrink: 0,
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{preview.name}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                    {preview.type === "pdf" ? "PDF Document" : "Text File"} — Read-only preview
                                </div>
                            </div>
                            <button
                                onClick={() => setPreview(null)}
                                style={{
                                    background: "none", border: "1px solid #e2e8f0", borderRadius: 6,
                                    padding: "5px 12px", fontSize: 12, color: "#374151",
                                    cursor: "pointer",
                                }}
                            >Close</button>
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, overflow: "auto" }}>
                            {preview.type === "txt" ? (
                                <pre style={{
                                    margin: 0, padding: 20,
                                    fontSize: 13, fontFamily: "'SF Mono', 'Consolas', monospace",
                                    lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word",
                                    color: "#374151",
                                }}>{preview.content}</pre>
                            ) : (
                                <iframe
                                    src={preview.content}
                                    style={{ width: "100%", height: "100%", border: "none" }}
                                    title={preview.name}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, marginBottom: 4, padding: 0 }}
                    >
                        ← Dashboard
                    </button>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                        {CATEGORY_LABELS[category]}
                    </h1>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
                        {files.length} document{files.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <label style={{
                    padding: "9px 18px", borderRadius: 6, border: "none",
                    background: "#0f172a", color: "#fff", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload
                    <input type="file" style={{ display: "none" }} onChange={handleUpload}
                        accept={category === "schemas" ? ".pdf" : ".txt,.pdf"} />
                </label>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 14 }}>
                <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: "100%", maxWidth: 360, padding: "8px 12px",
                        borderRadius: 6, border: "1px solid #e2e8f0",
                        fontSize: 13, outline: "none", boxSizing: "border-box",
                    }}
                />
            </div>

            {/* Department tabs */}
            {category === "faculty" && departments.length > 1 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
                    {departments.map((dept) => (
                        <button
                            key={dept}
                            onClick={() => setSelectedDept(dept)}
                            style={{
                                padding: "5px 12px", borderRadius: 4,
                                border: selectedDept === dept ? "none" : "1px solid #e2e8f0",
                                background: selectedDept === dept ? "#0f172a" : "#fff",
                                color: selectedDept === dept ? "#fff" : "#374151",
                                fontSize: 12, fontWeight: 500, cursor: "pointer",
                            }}
                        >
                            {dept}
                        </button>
                    ))}
                </div>
            )}

            {/* File table */}
            {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#64748b", fontSize: 13 }}>Loading...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>
                    No files found{searchQuery ? ` matching "${searchQuery}"` : ""}
                </div>
            ) : (
                <div style={{
                    background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden",
                }}>
                    <div style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 100px 260px",
                        padding: "8px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
                        fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em",
                    }}>
                        <div>Name</div>
                        <div>Type</div>
                        <div>Size</div>
                        <div style={{ textAlign: "right" }}>Actions</div>
                    </div>

                    {filtered.map((file) => (
                        <div
                            key={file.name}
                            style={{
                                display: "grid", gridTemplateColumns: "1fr 80px 100px 260px",
                                padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
                                alignItems: "center", fontSize: 13,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                                <span
                                    onClick={() => handlePreview(file.name, file.type)}
                                    style={{
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        fontWeight: 500, color: "#1d4ed8", cursor: "pointer",
                                    }}
                                    title="Click to preview"
                                >
                                    {file.name}
                                </span>
                                {file.department && (
                                    <span style={{
                                        flexShrink: 0, fontSize: 10, padding: "1px 7px", borderRadius: 3,
                                        background: "#f1f5f9", color: "#475569", fontWeight: 500,
                                    }}>{file.department}</span>
                                )}
                            </div>
                            <div>
                                <span style={{
                                    fontSize: 11, padding: "2px 7px", borderRadius: 3,
                                    background: file.type === "pdf" ? "#fef2f2" : "#f0fdf4",
                                    color: file.type === "pdf" ? "#991b1b" : "#166534",
                                    fontWeight: 600,
                                }}>{file.type.toUpperCase()}</span>
                            </div>
                            <div style={{ color: "#64748b", fontSize: 12 }}>{formatSize(file.size)}</div>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                {/* Download button for PDF files */}
                                {file.type === "pdf" && (
                                    <button
                                        onClick={() => handleDownload(file.name)}
                                        style={{
                                            padding: "4px 10px", borderRadius: 4,
                                            border: "1px solid #bfdbfe", background: "#eff6ff",
                                            color: "#1d4ed8", fontSize: 12, cursor: "pointer",
                                        }}
                                    >Download</button>
                                )}
                                {/* Edit for txt, Replace for pdf */}
                                {category !== "schemas" && file.type === "txt" ? (
                                    <button onClick={() => handleEdit(file.name)} style={{
                                        padding: "4px 10px", borderRadius: 4,
                                        border: "1px solid #e2e8f0", background: "#fff",
                                        color: "#374151", fontSize: 12, cursor: "pointer",
                                    }}>Edit</button>
                                ) : (
                                    <label style={{
                                        padding: "4px 10px", borderRadius: 4,
                                        border: "1px solid #e2e8f0", background: "#fff",
                                        color: "#374151", fontSize: 12, cursor: "pointer",
                                    }}>
                                        Replace
                                        <input type="file" style={{ display: "none" }}
                                            onChange={(e) => handleReplace(file.name, e)}
                                            accept={file.type === "pdf" ? ".pdf" : ".txt,.pdf"} />
                                    </label>
                                )}
                                <button onClick={() => setDeleteConfirm(file.name)} style={{
                                    padding: "4px 10px", borderRadius: 4,
                                    border: "1px solid #fecaca", background: "#fff",
                                    color: "#dc2626", fontSize: 12, cursor: "pointer",
                                }}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
