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
  return localStorage.getItem('siba_dark_mode') === 'true';
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

  const toggleDarkMode = useCallback(() => {
    const newVal = !(localStorage.getItem('siba_dark_mode') === 'true');
    localStorage.setItem('siba_dark_mode', String(newVal));
    // Trigger a storage event so useSyncExternalStore re-reads the snapshot
    window.dispatchEvent(new StorageEvent('storage', { key: 'siba_dark_mode' }));
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
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
