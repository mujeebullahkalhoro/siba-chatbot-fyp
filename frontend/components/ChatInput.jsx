"use client";
import React, { useRef, useState, useEffect } from "react";
import VoiceRecorder from "./VoiceRecorder";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const sibaOrange = "#ea6645";

export default function ChatInput({
  handleSendMessage = () => { },
  currentMessage: initialMessage = "", // renamed to show it's the initial/external value
  setCurrentMessage = () => { },
  className = "",
  textareaRef,
  markVoiceQuery,
  isGenerating,
  onStopGeneration,
  isMaintenance = false,
} = {}) {
  const localRef = useRef(null);
  const taRef = textareaRef ?? localRef;
  const [isRecording, setIsRecording] = useState(false);
  const [localMessage, setLocalMessage] = useState(initialMessage); // Local state for smooth typing
  const { t, isRTL } = useLanguage();
  const { darkMode } = useTheme();

  // Sync with parent when suggested questions or other external actions change initialMessage
  useEffect(() => {
    setLocalMessage(initialMessage);
  }, [initialMessage]);

  const handleTextareaChange = (e) => {
    const v = e.target.value ?? "";
    setLocalMessage(v); // Update local state ONLY
    // We don't call setCurrentMessage(v) here to avoid parent re-renders
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = (localMessage ?? "").trim();
    if (!trimmed) return;
    
    // Sync back to parent only on submit if needed, 
    // but handleSendMessage usually takes the text directly anyway.
    handleSendMessage(e, trimmed); 
    setLocalMessage(""); // Clear local
    if (taRef.current) taRef.current.style.height = "44px";
  };

  const handleTranscription = (text) => {
    setIsRecording(false);
    setLocalMessage(text);
    markVoiceQuery?.(); // Flag so the response gets auto-spoken
    handleSendMessage(null, text); // Pass text directly
    setLocalMessage(""); // Clear local
  };

  const disabled = !((localMessage ?? "").trim()) || isMaintenance;
  const placeholder = isMaintenance ? "System is under maintenance..." : t("input.placeholder");

  if (isRecording) {
    return (
      <div className={className}>
        <VoiceRecorder
          onTranscription={handleTranscription}
          onClose={() => setIsRecording(false)}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        "relative flex items-center border rounded-xl shadow-lg px-3 py-2 transition-colors duration-300",
        darkMode
          ? "bg-slate-800 border-slate-700"
          : "bg-white border-gray-200",
        className,
      ].join(" ")}
    >
      <textarea
        ref={taRef}
        value={localMessage ?? ""}
        onChange={handleTextareaChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) handleSubmit(e);
        }}
        placeholder={placeholder}
        disabled={isMaintenance}
        dir={isRTL ? "rtl" : "ltr"}
        className={`flex-1 border-0 rounded-lg p-2 ${isRTL ? 'pl-22 sm:pl-20' : 'pr-22 sm:pr-20'} resize-none overflow-y-auto focus:outline-none focus:ring-0 text-sm leading-5 min-h-[44px] max-h-40 custom-scrollbar bg-transparent ${darkMode ? 'text-gray-100 placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-400'} ${isMaintenance ? 'opacity-50 cursor-not-allowed' : ''}`}
        rows={1}
        style={{ lineHeight: "1.5", transition: "height 0.1s ease-out" }}
      />

      <div className={`absolute bottom-2 ${isRTL ? 'left-3' : 'right-3'} flex items-center space-x-2`}>
        <button
          type="button"
          aria-label={t("voice.submit")}
          onClick={() => setIsRecording(true)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none h-9 w-9 flex items-center justify-center"
          style={{ color: sibaOrange }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Z" />
          </svg>
        </button>

        {isGenerating ? (
          <button
            type="button"
            onClick={onStopGeneration}
            aria-label={t("voice.stop")}
            className="text-white rounded-lg p-2 h-9 w-9 flex items-center justify-center hover:bg-opacity-90 transition duration-150 focus:outline-none focus:ring-2"
            style={{ backgroundColor: "#dc2626" }} // Tailwind red-600
          >
            {/* A square STOP icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <rect x="6" y="6" width="12" height="12" rx="1" ry="1" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled}
            aria-label={t("voice.submit")}
            className="text-white rounded-lg p-2 h-9 w-9 flex items-center justify-center hover:bg-opacity-90 transition duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: sibaOrange }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L6 12Z" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
