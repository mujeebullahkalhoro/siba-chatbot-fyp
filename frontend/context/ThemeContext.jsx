'use client';
import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';

const ThemeContext = createContext();

// --- localStorage store for dark mode ---
// useSyncExternalStore is the React-approved way to subscribe to external stores.
// It is SSR-safe (via getServerSnapshot) and avoids setState-in-effect issues.

function subscribe(callback) {
  // Listen for cross-tab storage changes
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  const mode = localStorage.getItem('siba_theme_mode') || 'system';
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getServerSnapshot() {
  // Always return false on the server to avoid hydration mismatch
  return false;
}

export function ThemeProvider({ children }) {
  // useSyncExternalStore handles SSR safety automatically:
  //   - Server render: uses getServerSnapshot() => false
  //   - Client hydration: uses getServerSnapshot() => false (same, no mismatch)
  //   - After hydration: uses getSnapshot() => reads real localStorage value
  const darkMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const getThemeMode = useCallback(() => {
    if (typeof window === 'undefined') return 'system';
    return localStorage.getItem('siba_theme_mode') || 'system';
  }, []);

  const toggleDarkMode = useCallback(() => {
    const currentMode = localStorage.getItem('siba_theme_mode') || 'system';
    const next = currentMode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('siba_theme_mode', next);
    window.dispatchEvent(new StorageEvent('storage', { key: 'siba_theme_mode' }));
  }, []);

  const setThemeMode = useCallback((mode) => {
    const safeMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
    localStorage.setItem('siba_theme_mode', safeMode);
    window.dispatchEvent(new StorageEvent('storage', { key: 'siba_theme_mode' }));
  }, []);

  const themeMode = getThemeMode();

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
