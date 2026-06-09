"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAdminLoggedIn, adminLogout, fetchOverview } from "@/services/adminService";

const STATIC_SIDEBAR_ITEMS = {
    dashboard: { label: "Dashboard", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg>
    )},
    analytics: { label: "Analytics", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v8H3zm6-4h2v12H9zm6-6h2v18h-2zm6 10h2v8h-2z" /></svg>
    )},
    rebuild: { label: "Vector Database", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    )},
};

const CATEGORY_META_STATIC = {
    faculty: { label: "Faculty", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    policies: { label: "Policies", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
    programs: { label: "Programs", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
    )},
    schemas: { label: "Course Schemas", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
    )},
    scholarships: { label: "Scholarships", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
    )},
    introduction: { label: "Introduction", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    )},
    fyp: { label: "FYP Documents", icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    )},
};

const DEFAULT_CAT_ICON = (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
);

export default function AdminLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const t = setTimeout(() => setIsMounted(true), 0);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const publicAdminRoutes = ["/admin", "/admin/forgot-password", "/admin/reset-password"];
        if (isMounted && !publicAdminRoutes.includes(pathname) && !isAdminLoggedIn()) {
            router.replace("/admin");
        }
    }, [isMounted, pathname, router]);

    // Fetch categories for sidebar
    useEffect(() => {
        if (isMounted && isAdminLoggedIn() && pathname !== "/admin") {
            fetchOverview().then(data => {
                setCategories(Object.keys(data.categories));
            }).catch(() => {});
        }
    }, [isMounted, pathname]);

    if (!isMounted) {
        return (
            <div style={{ minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
                {children}
            </div>
        );
    }

    const publicAdminRoutes = ["/admin", "/admin/forgot-password", "/admin/reset-password"];
    const showSidebar = !publicAdminRoutes.includes(pathname) && isAdminLoggedIn();

    if (!showSidebar) {
        return (
            <div style={{ minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", background: "#003e80" }}>
                {children}
            </div>
        );
    }

    const activeKey = pathname.split("/admin/")[1]?.split("/")[0] || "dashboard";

    const renderNavLink = (key, label, icon) => {
        const isActive = activeKey === key;
        return (
            <button
                key={key}
                onClick={() => router.push(`/admin/${key}`)}
                style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "9px 12px", borderRadius: 6,
                    border: "none",
                    background: isActive ? "rgba(234, 102, 69, 0.15)" : "transparent",
                    color: isActive ? "#ea6645" : "#94a3b8",
                    fontWeight: isActive ? 600 : 400, fontSize: 13,
                    cursor: "pointer", textAlign: "left", marginBottom: 1,
                    transition: "all 0.15s",
                }}
            >
                {icon}
                {label}
            </button>
        );
    };

    return (
        <>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            {/* Sidebar */}
            <aside style={{
                width: 250,
                background: "#003e80",
                color: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                height: "100%",
            }}>
                {/* Logo */}
                <div style={{
                    padding: "22px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                }}>
                    <div style={{
                        width: 34, height: 34,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #003e80, #ea6645)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>SIBA Admin</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Knowledge Base Manager</div>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="no-scrollbar" style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 12px 6px" }}>
                        Navigation
                    </div>
                    {renderNavLink("dashboard", STATIC_SIDEBAR_ITEMS.dashboard.label, STATIC_SIDEBAR_ITEMS.dashboard.icon)}
                    {renderNavLink("analytics", STATIC_SIDEBAR_ITEMS.analytics.label, STATIC_SIDEBAR_ITEMS.analytics.icon)}

                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "16px 12px 6px" }}>
                        Data Categories
                    </div>
                    {categories.length > 0 ? (
                        categories.map(key => {
                            const meta = CATEGORY_META_STATIC[key] || {
                                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
                                icon: DEFAULT_CAT_ICON
                            };
                            return renderNavLink(key, meta.label, meta.icon);
                        })
                    ) : (
                        <div style={{ padding: "8px 12px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Loading...</div>
                    )}

                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "16px 12px 6px" }}>
                        System
                    </div>
                    {renderNavLink("rebuild", STATIC_SIDEBAR_ITEMS.rebuild.label, STATIC_SIDEBAR_ITEMS.rebuild.icon)}
                </nav>

                {/* Logout */}
                <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                    <button
                        onClick={() => { adminLogout(); router.replace("/admin"); }}
                        style={{
                            display: "flex", alignItems: "center", gap: 8,
                            width: "100%", padding: "9px 12px", borderRadius: 6,
                            border: "none", background: "transparent",
                            color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 500,
                        }}
                    >
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Wrapper */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                {/* Header (Stay at top) */}
                <header style={{
                    height: 52,
                    background: "#fff",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 28px",
                    flexShrink: 0,
                }}>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                        Sukkur IBA University — AI Chatbot Administration
                    </h2>
                    <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: "#ea6645",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 12, fontWeight: 600,
                    }}>A</div>
                </header>

                {/* Content Area (Scrollable) */}
                <main style={{ flex: 1, background: "#f8fafc", overflowY: "auto", padding: "28px" }}>
                    {children}
                </main>
            </div>
        </div>
        </>
    );

}
