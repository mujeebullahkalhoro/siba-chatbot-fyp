"use client";
import React, { useEffect, useState } from "react";
import SideBar from "@/components/SideBar";
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

import { ChatProvider, useChat } from "@/context/ChatContext";

import { shareChatSession } from "@/services/chatService";
import ShareModal from "@/components/ShareModal";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

function DashboardContent({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const { darkMode } = useTheme();
  const { isRTL } = useLanguage();

  const toggleSidebar = () => setIsMobileOpen((prev) => !prev);
  const closeSidebar = () => setIsMobileOpen(false);

  const { sessions, currentSessionId, handleNewChat, handleSelectSession, handleDeleteChat, handleRenameChat } = useChat();

  const handleShare = async () => {
    if (!currentSessionId) {
      alert("Please select a chat to share.");
      return;
    }
    try {
      const data = await shareChatSession(currentSessionId);
      // Construct full URL (assuming client side routing)
      // window.location.origin give us 'http://localhost:3000'
      const url = `${window.location.origin}/share/${data.share_id}`;
      setShareUrl(url);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error("Failed to share chat:", error);
      alert("Failed to create share link.");
    }
  };

  // Font class for Urdu
  const fontClass = isRTL ? 'font-urdu' : '';

  return (
    <div 
      className={`flex h-screen overflow-hidden transition-all duration-300 ${fontClass} ${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-900'}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Sidebar */}
      <SideBar
        isMobileOpen={isMobileOpen}
        onClose={closeSidebar}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ChatHeader onMenuClick={toggleSidebar} onShare={handleShare} />

        <main className={`flex-1 overflow-y-auto relative transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
          <Guard>{children}</Guard>
        </main>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <ChatProvider>
        <DashboardContent>{children}</DashboardContent>
      </ChatProvider>
    </AuthProvider>
  );
}
