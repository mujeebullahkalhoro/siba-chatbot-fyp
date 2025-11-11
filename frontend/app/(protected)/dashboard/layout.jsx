"use client";
import React, { useEffect, useState } from "react";
import SideBar from "@/components/Sidebar";
import ChatHeader from "@/components/ChatHeader";
import AuthProvider, { useAuth } from "@/context/AuthContext";

function Guard({ children }) {
  const { user, isLoading, openLoginModal } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      openLoginModal();
    }
  }, [isLoading, user, openLoginModal]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-700">Sign in required.</div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const toggleSidebar = () => setIsMobileOpen((prev) => !prev);
  const closeSidebar = () => setIsMobileOpen(false);

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <SideBar isMobileOpen={isMobileOpen} onClose={closeSidebar} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatHeader onMenuClick={toggleSidebar} />

          <main className="flex-1 overflow-y-auto bg-gray-100 relative">
            <Guard>{children}</Guard>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
