"use client";
import React, { useEffect, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import { useChat } from "@/context/ChatContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { getUserSettings } from "@/services/settingsService";

export default function ChatPage() {
  const {
    messages,
    currentMessage,
    setCurrentMessage,
    isLoading,
    isGenerating,
    handleSendMessage,
    handleStopGeneration,
    textareaRef
  } = useChat();
  const { t, isRTL } = useLanguage();
  const { darkMode } = useTheme();
  const [settings, setSettings] = useState({
    auto_speak: false,
    enter_to_send: true,
    show_suggested_prompts: true,
    reduce_animations: false,
    chat_density: "comfortable",
    font_size: "medium",
  });

  const SUGGESTED_QUESTIONS = [
    { text: t("suggested.1"), label: "POLICY" },
    { text: t("suggested.2"), label: "FACULTY" },
    { text: t("suggested.3"), label: "AID" },
    { text: t("suggested.4"), label: "PROGRAMS" },
  ];

  const hasMessages = messages.length > 0;

  // Colors
  const textColor = darkMode ? '#e2e8f0' : '#333333';
  const subTextColor = darkMode ? 'text-gray-400' : 'text-gray-500';
  const bg = darkMode ? 'bg-slate-900' : 'bg-gray-50';

  // Focus textarea on load
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await getUserSettings();
        setSettings((prev) => ({ ...prev, ...(res.settings || {}) }));
      } catch (e) {
        console.error("Failed to load dashboard settings:", e);
      }
    };
    loadSettings();

    const syncOnFocus = () => {
      loadSettings();
    };
    const syncOnStorage = (event) => {
      if (event.key === "siba_settings_updated_at") {
        loadSettings();
      }
    };

    window.addEventListener("focus", syncOnFocus);
    window.addEventListener("storage", syncOnStorage);
    return () => {
      window.removeEventListener("focus", syncOnFocus);
      window.removeEventListener("storage", syncOnStorage);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("reduced-motion", !!settings.reduce_animations);
    return () => document.body.classList.remove("reduced-motion");
  }, [settings.reduce_animations]);

  if (!hasMessages) {
    return (
      <div className={`relative h-full overflow-hidden transition-colors duration-300 ${bg} ${
        settings.chat_density === "compact" ? "text-[15px]" : "text-base"
      } ${settings.font_size === "small" ? "text-sm" : settings.font_size === "large" ? "text-[17px]" : "text-base"}`}>
        <div className={`pointer-events-none absolute inset-0 ${
          darkMode
            ? "bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(234,102,69,0.14),transparent_40%)]"
            : "bg-[radial-gradient(circle_at_20%_10%,rgba(0,123,255,0.08),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(234,102,69,0.10),transparent_40%)]"
        }`} />
        {/*  Centered header & text for all screens */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <div className={`w-full max-w-[920px] rounded-3xl border px-4 sm:px-6 py-8 sm:py-10 backdrop-blur-sm ${
            darkMode ? "bg-slate-900/45 border-slate-800" : "bg-white/75 border-[color:var(--border-soft)]"
          }`}>
            <div className={`mb-4 text-xs ${darkMode ? "text-slate-300" : "text-gray-500"}`}>
              <span className={`inline-flex items-center rounded-full px-2 py-1 border ${darkMode ? "border-slate-700 bg-slate-800/70" : "border-gray-200 bg-white"}`}>
                AI Assistant
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-2 tracking-tight ui-heading" style={{ color: textColor }}>
              {t('header.title')}
            </h2>
            <p className={`text-sm sm:text-lg max-w-xl mx-auto mb-6 px-4 ${subTextColor}`}>
              {t('home.subtitle')}
            </p>
            <div className={`mb-6 text-xs ${darkMode ? "text-slate-400" : "text-gray-500"}`}>
              Press <kbd className={`px-1.5 py-0.5 rounded ${darkMode ? "bg-slate-800 border border-slate-700" : "bg-gray-100 border border-gray-200"}`}>/</kbd> to focus composer
            </div>

            {/* Suggested Questions */}
            {settings.show_suggested_prompts && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full max-w-2xl mx-auto px-2 sm:px-4">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentMessage(q.text);
                      // Trigger send via form-submit-like approach
                      setTimeout(() => {
                        const form = document.querySelector('form');
                        if (form) form.requestSubmit();
                      }, 50);
                    }}
                    className={`text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 border ui-control ui-focus-ring ${isRTL ? 'text-right' : ''} ${darkMode
                      ? 'bg-slate-800/80 border-slate-700 text-gray-300 hover:bg-slate-700 hover:border-slate-600 hover:-translate-y-0.5'
                      : 'bg-white/90 border-[color:var(--border-soft)] text-gray-700 hover:bg-white hover:border-[#c4d4e8] hover:shadow-sm hover:-translate-y-0.5'
                      }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${darkMode ? "border-slate-600 text-slate-400" : "border-gray-300 text-gray-500"}`}>{q.label}</span>
                      <span>{q.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/*  Desktop input appears below heading */}
            <div className="hidden sm:block">
              <ChatInput
                handleSendMessage={handleSendMessage}
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                textareaRef={textareaRef}
                isGenerating={isGenerating}
                onStopGeneration={handleStopGeneration}
                sendOnEnter={settings.enter_to_send}
                className="w-full max-w-[860px] mx-auto"
              />
            </div>
          </div>
        </div>

        {/*  Mobile fixed bottom input */}
        <div className={`sm:hidden fixed bottom-0 inset-x-0 border-t shadow-md px-4 py-3 transition-colors duration-300 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
          <ChatInput
            handleSendMessage={handleSendMessage}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            textareaRef={textareaRef}
            isGenerating={isGenerating}
            onStopGeneration={handleStopGeneration}
            sendOnEnter={settings.enter_to_send}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col h-full overflow-hidden transition-colors duration-300 ${bg} ${
      settings.chat_density === "compact" ? "text-[15px]" : "text-base"
    } ${settings.font_size === "small" ? "text-sm" : settings.font_size === "large" ? "text-[17px]" : "text-base"}`}>
      <div className={`pointer-events-none absolute inset-0 ${
        darkMode
          ? "bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(234,102,69,0.10),transparent_40%)]"
          : "bg-[radial-gradient(circle_at_20%_10%,rgba(0,123,255,0.06),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(234,102,69,0.08),transparent_40%)]"
      }`} />
      {/*  Chat messages scroll independently */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>

      {/*  Input bar centered within chat area */}
      <div className={`relative z-10 border-t shadow-md flex justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-gray-50/90 border-gray-200'} backdrop-blur-md`}>
        <div className="w-full max-w-[860px] px-4 sm:px-6 py-4">
          <ChatInput
            handleSendMessage={handleSendMessage}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            textareaRef={textareaRef}
            isGenerating={isGenerating}
            onStopGeneration={handleStopGeneration}
            sendOnEnter={settings.enter_to_send}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
