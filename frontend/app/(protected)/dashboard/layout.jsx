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

function DashboardContent({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const toggleSidebar = () => setIsMobileOpen((prev) => !prev);
  const closeSidebar = () => setIsMobileOpen(false);

  const { sessions, currentSessionId, handleNewChat, handleSelectSession, handleDeleteChat } = useChat();

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <SideBar
        isMobileOpen={isMobileOpen}
        onClose={closeSidebar}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader onMenuClick={toggleSidebar} onShare={handleShare} />

        <main className="flex-1 overflow-y-auto bg-gray-100 relative">
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
