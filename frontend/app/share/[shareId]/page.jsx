"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Home, Lock, MessageSquare } from "lucide-react";
import { getSharedChat } from "@/services/chatService";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/context/AuthContext";

const SIBA_BLUE = "#003e80";
const SIBA_ACCENT = "#ea6645";

function ReadOnlyChatBubble({ message, isUser, darkMode, isRTL }) {
  const { text } = message;
  const botBg = darkMode ? "#1e293b" : "#ffffff";
  const botBorder = darkMode ? "border-slate-700/70" : "border-[color:var(--border-soft)]";
  const botText = darkMode ? "#e2e8f0" : "#333333";

  return (
    <div
      className={`flex w-full animate-fade-in-up ${isUser ? "justify-end" : "justify-start"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {!isUser && (
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-[#003e80] text-white text-xs font-bold flex items-center justify-center shrink-0 ${isRTL ? "ml-2" : "mr-2"} mt-1`}
        >
          AI
        </div>
      )}
      <div
        className={`w-auto max-w-[92%] sm:max-w-2xl px-4 py-3 shadow-md text-base transition-all duration-300 wrap-break-word rounded-2xl border ui-card ${
          isUser
            ? `text-white ${isRTL ? "rounded-br-md" : "rounded-bl-md"} border-transparent`
            : `${isRTL ? "rounded-bl-md" : "rounded-br-md"} ${botBorder}`
        }`}
        style={{
          background: isUser ? "linear-gradient(135deg, #003e80 0%, #0056b3 100%)" : botBg,
          color: isUser ? "white" : botText,
        }}
      >
        <div
          className={`prose prose-sm max-w-none leading-relaxed ${
            isUser ? "prose-invert text-white" : darkMode ? "prose-invert text-gray-200" : "text-gray-800"
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => {
                const { href, ...other } = props;
                const isSchema =
                  href?.includes("/api/schemas/download/") || href?.includes(".pdf");
                return (
                  <a
                    {...other}
                    href={href}
                    className={isUser ? "text-white underline" : "underline text-blue-600"}
                    style={{
                      color: isUser ? undefined : darkMode ? "#60a5fa" : SIBA_BLUE,
                    }}
                    target={isSchema ? "_blank" : undefined}
                    rel={isSchema ? "noopener noreferrer" : undefined}
                  />
                );
              },
              p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-2" dir="ltr">
                  <table
                    {...props}
                    className={`min-w-full divide-y border text-sm ${
                      darkMode ? "divide-slate-700 border-slate-700" : "divide-gray-300 border-gray-300"
                    }`}
                  />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead {...props} className={isUser ? "bg-white/10" : darkMode ? "bg-slate-800" : "bg-gray-200"} />
              ),
              th: ({ node, ...props }) => (
                <th
                  {...props}
                  className={`px-3 py-2 font-semibold ${isRTL ? "text-right" : "text-left"}`}
                />
              ),
              td: ({ node, ...props }) => (
                <td
                  {...props}
                  className={`px-3 py-2 border-t ${
                    darkMode ? "border-slate-800" : "border-gray-200"
                  } ${isRTL ? "text-right" : "text-left"}`}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul {...props} className={`list-disc ps-4 mb-2 ${isRTL ? "pr-4" : ""}`} />
              ),
              ol: ({ node, ...props }) => (
                <ol {...props} className={`list-decimal ps-4 mb-2 ${isRTL ? "pr-4" : ""}`} />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default function SharedChatPage() {
  const { shareId } = useParams();
  const { user } = useAuth();
  const { t, isRTL, dir } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  /** Logged-in users should return to /dashboard where Share + session UX match the app; guests use home. */
  const chatAppHref = user ? "/dashboard" : "/";
  const [chatData, setChatData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!shareId) {
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    setLoadFailed(false);
    (async () => {
      try {
        const data = await getSharedChat(shareId);
        if (!cancelled) setChatData(data);
      } catch (err) {
        console.error("Failed to load shared chat:", err);
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const messages = Array.isArray(chatData?.messages) ? chatData.messages : [];
  const createdAt = chatData?.created_at ? new Date(chatData.created_at) : null;
  const title = chatData?.title || t("share.conversation");

  const headerStyle = {
    backgroundColor: darkMode ? "#020617" : SIBA_BLUE,
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-4 ${darkMode ? "bg-slate-950 text-slate-200" : "bg-[#f0f4f8] text-slate-700"}`}
        dir={dir}
      >
        <div
          className="h-12 w-12 rounded-full border-2 border-transparent border-t-current animate-spin opacity-80"
          style={{ color: SIBA_BLUE }}
          aria-hidden
        />
        <p className="text-sm font-medium">{t("thinking.text")}…</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${darkMode ? "bg-slate-950" : "bg-[#f0f4f8]"}`}
        dir={dir}
      >
        <div
          className={`w-full max-w-md rounded-2xl border p-8 text-center shadow-xl ${
            darkMode ? "border-slate-800 bg-slate-900 text-slate-100" : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${SIBA_ACCENT}22` }}
          >
            <MessageSquare className="h-7 w-7" style={{ color: SIBA_ACCENT }} aria-hidden />
          </div>
          <h1 className="text-xl font-bold mb-2">{t("share.errorTitle")}</h1>
          <p className={`text-sm mb-6 ${darkMode ? "text-slate-400" : "text-gray-600"}`}>{t("share.errorBody")}</p>
          <Link
            href={chatAppHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
            style={{ backgroundColor: SIBA_ACCENT }}
          >
            <Home className="h-4 w-4 shrink-0" />
            {t("share.home")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen flex-col overflow-hidden font-sans ${darkMode ? "bg-slate-950 text-slate-100" : "bg-[#f0f4f8] text-gray-900"} ${isRTL ? "font-urdu" : ""}`}
      dir={dir}
    >
      <header
        className="flex h-16 w-full shrink-0 items-center justify-between px-4 shadow-lg sm:px-6 relative z-30 text-white"
        style={headerStyle}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={chatAppHref}
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-white/90 transition hover:bg-white/10"
            title={t("share.home")}
          >
            <Home className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold uppercase tracking-wide sm:text-base">{t("header.title")}</h1>
            <p className="truncate text-xs text-white/80">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
            <Lock className="h-3.5 w-3.5 opacity-90" aria-hidden />
            {t("share.viewReadOnly")}
          </span>
          <LanguageSwitcher className="text-white" />
          <button
            type="button"
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-white transition hover:bg-white/10"
            title={darkMode ? t("header.lightMode") : t("header.darkMode")}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Zm8.25-9.75a.75.75 0 0 1 .53.22l1.5 1.5a.75.75 0 1 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 .53-1.28ZM21 11.25h-2.25a.75.75 0 0 0 0 1.5H21a.75.75 0 0 0 0-1.5Zm-2.47 6.22a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 1 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18Zm-7.56-.44a.75.75 0 0 1 .53.22l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 .53-1.28ZM3 11.25a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 0 0-1.5H3Zm3.97-6.22a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div
          className={`border-b px-4 py-3 sm:px-6 ${darkMode ? "border-slate-800 bg-slate-900/80" : "border-gray-200/80 bg-white/70"}`}
        >
          <p className={`text-center text-xs sm:text-sm ${darkMode ? "text-slate-400" : "text-gray-600"}`}>
            {t("share.viewHint")}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-500">
            {createdAt && !Number.isNaN(createdAt.getTime()) && (
              <time dateTime={createdAt.toISOString()}>
                {createdAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>
              {messages.length} {t("share.messagesLabel")}
            </span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.length === 0 ? (
              <p
                className={`rounded-2xl border py-12 text-center text-sm ${darkMode ? "border-slate-800 bg-slate-900/50 text-slate-400" : "border-gray-200 bg-white text-gray-500"}`}
              >
                {t("share.empty")}
              </p>
            ) : (
              messages.map((msg, index) => (
                <ReadOnlyChatBubble
                  key={msg._id || `m-${index}`}
                  message={msg}
                  isUser={msg.sender === "user"}
                  darkMode={darkMode}
                  isRTL={isRTL}
                />
              ))
            )}
          </div>
        </main>

        <footer
          className={`shrink-0 border-t px-4 py-5 sm:px-6 ${darkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-start">
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-gray-600"}`}>{t("share.cta")}</p>
            <Link
              href={chatAppHref}
              className="inline-flex w-full items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 sm:w-auto"
              style={{ backgroundColor: SIBA_ACCENT }}
            >
              {t("share.startOwn")}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
