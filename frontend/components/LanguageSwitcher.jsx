"use client";
import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function LanguageSwitcher({ className = "" }) {
    const { lang, setLang, t } = useLanguage();

    const toggle = () => setLang(lang === "en" ? "ur" : "en");

    return (
        <button
            onClick={toggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-white/10 ${className}`}
            title={lang === "en" ? "Switch to Urdu" : "Switch to English"}
            style={{ fontFamily: lang === "en" ? "'Noto Nastaliq Urdu', serif" : "inherit" }}
        >
            {/* Globe icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" clipRule="evenodd" />
                <path d="M10 2a.75.75 0 0 1 .75.75v.316c.795.1 1.543.325 2.222.66l.158-.274a.75.75 0 0 1 1.299.75l-.158.274a6.524 6.524 0 0 1 1.674 1.674l.274-.158a.75.75 0 0 1 .75 1.299l-.274.158c.335.679.56 1.427.66 2.222h.316a.75.75 0 0 1 0 1.5h-.316a6.488 6.488 0 0 1-.66 2.222l.274.158a.75.75 0 0 1-.75 1.299l-.274-.158a6.524 6.524 0 0 1-1.674 1.674l.158.274a.75.75 0 0 1-1.299.75l-.158-.274a6.488 6.488 0 0 1-2.222.66v.316a.75.75 0 0 1-1.5 0v-.316a6.488 6.488 0 0 1-2.222-.66l-.158.274a.75.75 0 0 1-1.299-.75l.158-.274a6.524 6.524 0 0 1-1.674-1.674l-.274.158a.75.75 0 0 1-.75-1.299l.274-.158a6.488 6.488 0 0 1-.66-2.222H2.75a.75.75 0 0 1 0-1.5h.316c.1-.795.325-1.543.66-2.222l-.274-.158a.75.75 0 0 1 .75-1.299l.274.158A6.524 6.524 0 0 1 6.15 4.452l-.158-.274a.75.75 0 0 1 1.299-.75l.158.274A6.488 6.488 0 0 1 9.67 3.042V2.75A.75.75 0 0 1 10.42 2Z" />
            </svg>
            <span>{t("lang.switch")}</span>
        </button>
    );
}
