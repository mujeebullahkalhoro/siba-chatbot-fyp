"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "@/locales/en";
import ur from "@/locales/ur";

const translations = { en, ur };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState("en");

    // Load saved language preference on mount
    useEffect(() => {
        const saved = localStorage.getItem("siba_lang");
        if (saved && translations[saved]) {
            setLangState(saved);
        }
    }, []);

    // Update document direction and lang attribute when language changes
    useEffect(() => {
        const dir = lang === "ur" ? "rtl" : "ltr";
        document.documentElement.dir = dir;
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((newLang) => {
        if (translations[newLang]) {
            setLangState(newLang);
            localStorage.setItem("siba_lang", newLang);
        }
    }, []);

    const t = useCallback(
        (key) => translations[lang]?.[key] || translations.en[key] || key,
        [lang]
    );

    const dir = lang === "ur" ? "rtl" : "ltr";
    const isRTL = lang === "ur";

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, dir, isRTL }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
