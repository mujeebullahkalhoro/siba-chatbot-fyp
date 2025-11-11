'use client';
import React from 'react';
import { Share2, Menu } from 'lucide-react';

// Accepts onMenuClick prop to open the mobile sidebar drawer
export default function ChatHeader({ onMenuClick }) {
  return (
    <header className="bg-[rgba(4,45,86,0.96)] text-white p-4 flex items-center justify-between shadow-md relative z-30">
      
      {/* 1. Mobile Hamburger Button (Visible only on screens smaller than md) */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1 text-white hover:text-gray-200 transition-colors mr-2"
        aria-label="Open sidebar menu"
      >
        <Menu className="w-6 h-6" />
      </button>

     
      <div className="flex-1 flex items-center justify-center md:justify-start">
        <h2 className="text-lg font-semibold whitespace-nowrap">SIBA AI Assistant</h2>
      </div>

      {/*  Share Button (Visible only on desktop - hidden on mobile) */}
      <button 
        className="hidden md:flex items-center bg-white text-blue-800 text-sm font-medium py-1.5 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Chat
      </button>
      
      {/* Placeholder to balance the layout on mobile (matching hamburger size) */}
      <div className="w-6 h-6 invisible md:hidden"></div>
    </header>
  );
}
