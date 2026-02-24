// frontend/services/adminService.js

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

function getToken() {
    if (typeof window !== "undefined") {
        return localStorage.getItem("admin_token");
    }
    return null;
}

function authHeaders() {
    const token = getToken();
    return {
        Authorization: `Bearer ${token}`,
    };
}

export async function adminLogin(email, password) {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("admin_token", data.token);
    return data;
}

export function adminLogout() {
    localStorage.removeItem("admin_token");
}

export function isAdminLoggedIn() {
    return !!getToken();
}

export async function fetchOverview() {
    const res = await fetch(`${API_BASE}/api/admin/overview`, {
        headers: authHeaders(),
    });
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("Failed to fetch overview");
    return res.json();
}

export async function fetchCategoryFiles(category) {
    const res = await fetch(
        `${API_BASE}/api/admin/categories/${category}/files`,
        { headers: authHeaders() }
    );
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("Failed to fetch files");
    return res.json();
}

export async function fetchFileContent(category, filename) {
    const encoded = encodeURIComponent(filename);
    const res = await fetch(
        `${API_BASE}/api/admin/categories/${category}/files/${encoded}`,
        { headers: authHeaders() }
    );
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("Failed to fetch file");
    return res.json();
}

export async function updateFile(category, filename, content) {
    const encoded = encodeURIComponent(filename);
    const res = await fetch(
        `${API_BASE}/api/admin/categories/${category}/files/${encoded}`,
        {
            method: "PUT",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Update failed");
    }
    return res.json();
}

export async function deleteFile(category, filename) {
    const encoded = encodeURIComponent(filename);
    const res = await fetch(
        `${API_BASE}/api/admin/categories/${category}/files/${encoded}`,
        { method: "DELETE", headers: authHeaders() }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Delete failed");
    }
    return res.json();
}

export async function uploadFile(category, file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
        `${API_BASE}/api/admin/categories/${category}/upload`,
        { method: "POST", headers: authHeaders(), body: formData }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
    }
    return res.json();
}

export async function replaceFile(category, filename, file) {
    const encoded = encodeURIComponent(filename);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
        `${API_BASE}/api/admin/categories/${category}/files/${encoded}/replace`,
        { method: "POST", headers: authHeaders(), body: formData }
    );
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Replace failed");
    }
    return res.json();
}

export async function triggerRebuild() {
    const res = await fetch(`${API_BASE}/api/admin/rebuild`, {
        method: "POST",
        headers: authHeaders(),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Rebuild failed to start");
    }
    return res.json();
}

export async function fetchRebuildStatus() {
    const res = await fetch(`${API_BASE}/api/admin/rebuild/status`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch rebuild status");
    return res.json();
}

export async function fetchMaintenanceStatus() {
    const res = await fetch(`${API_BASE}/api/admin/maintenance`);
    if (!res.ok) return { maintenance: false };
    return res.json();
}

export async function fetchAnalytics() {
    const res = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: authHeaders(),
    });
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
}
