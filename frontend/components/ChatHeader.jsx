'use client';
import React from 'react';
import { Share2, Menu } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import LanguageSwitcher from './LanguageSwitcher';

// Accepts onMenuClick prop to open the mobile sidebar drawer
export default function ChatHeader({ onMenuClick, onShare }) {
  const { t } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="w-full h-16 px-4 sm:px-6 flex items-center justify-between shadow-lg relative z-30 text-white shrink-0 transition-colors duration-300" style={{ backgroundColor: darkMode ? '#020617' : '#003e80' }}>

      {/* 1. Mobile Hamburger Button (Visible only on screens smaller than md) */}
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 text-white hover:text-gray-200 transition-colors mr-2"
          aria-label={t('sidebar.openSidebar')}
        >
          <Menu className="w-6 h-6" />
        </button>

        <h2 className="text-lg sm:text-xl font-bold uppercase whitespace-nowrap">{t('header.title')}</h2>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Language switcher */}
        <LanguageSwitcher className="text-white" />

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-white rounded-lg hover:bg-white/10 transition"
          title={darkMode ? t('header.lightMode') : t('header.darkMode')}
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Zm8.25-9.75a.75.75 0 0 1 .53.22l1.5 1.5a.75.75 0 1 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 .53-1.28ZM21 11.25h-2.25a.75.75 0 0 0 0 1.5H21a.75.75 0 0 0 0-1.5Zm-2.47 6.22a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 1 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18Zm-7.56-.44a.75.75 0 0 1 .53.22l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 .53-1.28ZM3 11.25a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 0 0-1.5H3Zm3.97-6.22a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/*  Share Button (Visible only on desktop - hidden on mobile) */}
        <button
          onClick={onShare}
          className="hidden md:flex items-center bg-white text-sm font-medium py-1.5 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
          style={{ color: darkMode ? '#020617' : '#003e80' }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          {t('chatHeader.share')}
        </button>
      </div>

      {/* Placeholder to balance the layout on mobile (matching hamburger size) */}
      <div className="w-6 h-6 invisible md:hidden"></div>
    </header>
  );
}
