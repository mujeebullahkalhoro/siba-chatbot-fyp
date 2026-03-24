'use client';
import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';
import en from '@/locales/en';
import ur from '@/locales/ur';

const translations = { en, ur };
const LanguageContext = createContext();

// --- useSyncExternalStore: SSR-safe, no setState-in-effect, cross-tab sync ---

function langSubscribe(callback) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function langGetSnapshot() {
  const saved = localStorage.getItem('siba_lang');
  return saved && translations[saved] ? saved : 'en';
}

function langGetServerSnapshot() {
  return 'en'; // Always 'en' on the server — avoids hydration mismatch
}

export function LanguageProvider({ children }) {
  const lang = useSyncExternalStore(langSubscribe, langGetSnapshot, langGetServerSnapshot);

  const setLang = useCallback((newLang) => {
    if (translations[newLang]) {
      localStorage.setItem('siba_lang', newLang);
      window.dispatchEvent(new StorageEvent('storage', { key: 'siba_lang' }));
    }
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] || translations.en[key] || key,
    [lang]
  );

  const isRTL = lang === 'ur';
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
