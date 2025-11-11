"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import AuthModal from "@/components/AuthModal";

import axios from "axios";

// Provide a safe default shape to avoid null destructuring if misused
const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  openLoginModal: () => {},
  closeLoginModal: () => {},
  isModalOpen: false,
});

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send/receive cookies across origins
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check /api/auth/me on load
  const checkUserLoggedIn = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/auth/me");
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserLoggedIn();
  }, [checkUserLoggedIn]);

  // Called by the modal with the Google ID token
  const loginWithGoogleToken = async (token) => {
    try {
      await api.post("/api/auth/google", { google_token: token });
      await checkUserLoggedIn();
      setIsModalOpen(false);
    } catch (err) {
      console.error("❌ Google Login Error:", err);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout", {});
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: loginWithGoogleToken,
        logout,
        openLoginModal: () => setIsModalOpen(true),
        closeLoginModal: () => setIsModalOpen(false),
        isModalOpen,
      }}
    >
      {children}

      {/* modal is controlled via context and calls back with ID token */}
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGoogleLogin={loginWithGoogleToken}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
