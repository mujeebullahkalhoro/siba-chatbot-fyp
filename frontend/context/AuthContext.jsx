"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import AuthModal from "@/components/AuthModal";
import TwoFactorLoginModal from "@/components/TwoFactorLoginModal";

import axios from "axios";
import { getApiBase } from "@/lib/apiBase";

// Provide a safe default shape to avoid null destructuring if misused
const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  openLoginModal: () => {},
  closeLoginModal: () => {},
  isModalOpen: false,
  twoFactorRequired: false,
});

const api = axios.create({
  baseURL: getApiBase(),
  withCredentials: true, // send/receive cookies across origins
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  // Check /api/auth/me on load
  const checkUserLoggedIn = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/auth/me");
      setUser(res.data);
      setTwoFactorRequired(false);
    } catch (err) {
      if (err?.response?.status === 428) {
        setTwoFactorRequired(true);
      }
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
      const res = await api.post("/api/auth/google", { google_token: token });
      if (res?.data?.requires_2fa) {
        setTwoFactorRequired(true);
        setIsModalOpen(false);
      } else {
        await checkUserLoggedIn();
        setIsModalOpen(false);
      }
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
        twoFactorRequired,
        refreshUser: checkUserLoggedIn,
      }}
    >
      {children}

      {/* modal is controlled via context and calls back with ID token */}
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGoogleLogin={loginWithGoogleToken}
      />
      <TwoFactorLoginModal
        isOpen={twoFactorRequired}
        onVerified={async () => {
          setTwoFactorRequired(false);
          await checkUserLoggedIn();
        }}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
