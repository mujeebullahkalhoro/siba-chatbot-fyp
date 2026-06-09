"use client";
import React, { useRef, useState, useEffect } from "react";
import VoiceRecorder from "./VoiceRecorder";
import VirtualUrduKeyboard from "./VirtualUrduKeyboard";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const sibaOrange = "#ea6645";

function isMicNotFoundError(e) {
  return e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError";
}

/**
 * Must run from a user gesture. Tries default capture, relaxed processing (some Windows drivers fail
 * with default DSP), then each enumerated input with ideal (preferred) then exact deviceId.
 */
async function requestMicrophoneStream() {
  const md = navigator.mediaDevices;
  if (md?.getUserMedia) {
    const gum = (constraints) => md.getUserMedia(constraints);

    const constraintAttempts = [
      { audio: true },
      {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      },
    ];

    let lastErr;
    for (const constraints of constraintAttempts) {
      try {
        return await gum(constraints);
      } catch (e) {
        if (!isMicNotFoundError(e)) throw e;
        lastErr = e;
      }
    }

    const devices = await md.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === "audioinput" && d.deviceId);
    for (const d of inputs) {
      for (const exact of [false, true]) {
        try {
          const audio = exact
            ? { deviceId: { exact: d.deviceId } }
            : { deviceId: { ideal: d.deviceId } };
          return await gum({ audio });
        } catch (e) {
          if (!isMicNotFoundError(e)) throw e;
          lastErr = e;
        }
      }
    }

    throw lastErr ?? new Error("No microphone available");
  }
  const legacy =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
  if (!legacy) {
    throw new Error("getUserMedia is not supported in this browser");
  }
  return new Promise((resolve, reject) => {
    legacy.call(navigator, { audio: true }, resolve, reject);
  });
}

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
  sendOnEnter = true,
} = {}) {
  const localRef = useRef(null);
  const taRef = textareaRef ?? localRef;
  const [isRecording, setIsRecording] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [micStarting, setMicStarting] = useState(false);
  const [localMessage, setLocalMessage] = useState(initialMessage); // Local state for smooth typing
  const { t, isRTL } = useLanguage();
  const { darkMode } = useTheme();

  // ── Virtual Urdu Keyboard ─────────────────────────────
  const [showUrduKeyboard, setShowUrduKeyboard] = useState(false);

  // Handle virtual keyboard key press — insert Urdu char at cursor
  const handleVirtualKeyPress = (char) => {
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = localMessage || '';
    const newText = text.substring(0, start) + char + text.substring(end);

    // Imperatively update DOM and selection to prevent React cursor jumping
    ta.value = newText;
    ta.setSelectionRange(start + char.length, start + char.length);
    setLocalMessage(newText);
    
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    ta.focus();
  };

  // Handle virtual keyboard backspace
  const handleVirtualBackspace = () => {
    const ta = taRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = localMessage || '';

    if (start === end && start > 0) {
      const newText = text.substring(0, start - 1) + text.substring(end);
      ta.value = newText;
      ta.setSelectionRange(start - 1, start - 1);
      setLocalMessage(newText);
    } else if (start !== end) {
      const newText = text.substring(0, start) + text.substring(end);
      ta.value = newText;
      ta.setSelectionRange(start, start);
      setLocalMessage(newText);
    }
    ta.focus();
  };

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

  const stopMicTracks = () => {
    micStream?.getTracks().forEach((track) => track.stop());
    setMicStream(null);
  };

  const handleVoiceClose = () => {
    stopMicTracks();
    setIsRecording(false);
  };

  const handleMicClick = async () => {
    if (micStarting) return;
    setMicStarting(true);
    try {
      const stream = await requestMicrophoneStream();
      setMicStream(stream);
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      const name = err?.name ?? "";
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        alert(t("voice.micNotFound"));
      } else if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        alert(t("voice.micDenied"));
      } else {
        alert(t("voice.micError"));
      }
    } finally {
      setMicStarting(false);
    }
  };

  const handleTranscription = (text) => {
    stopMicTracks();
    setIsRecording(false);
    setLocalMessage(text);
    markVoiceQuery?.(); // Flag so the response gets auto-spoken
    handleSendMessage(null, text); // Pass text directly
    setLocalMessage(""); // Clear local
  };

  const disabled = !((localMessage ?? "").trim()) || isMaintenance;
  const placeholder = isMaintenance ? "System is under maintenance..." : t("input.placeholder");

  if (isRecording && micStream) {
    return (
      <div className={className}>
        <VoiceRecorder
          audioStream={micStream}
          onTranscription={handleTranscription}
          onClose={handleVoiceClose}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className || ""}`}>
      {/* Virtual Urdu Keyboard — shown floating above the input */}
      {showUrduKeyboard && isRTL && (
        <div className="absolute bottom-full left-0 right-0 mb-3 z-50 flex justify-center">
          <div className="w-full max-w-[600px]">
            <VirtualUrduKeyboard
              onKeyPress={handleVirtualKeyPress}
              onBackspace={handleVirtualBackspace}
              onClose={() => setShowUrduKeyboard(false)}
            />
          </div>
        </div>
      )}
    <form
      onSubmit={handleSubmit}
      className={[
        "relative flex items-center border rounded-xl shadow-lg px-3 py-2 transition-colors duration-300 ui-card focus-within:border-[#8db9e8] focus-within:shadow-[0_0_0_3px_var(--ring-soft)]",
        darkMode
          ? "bg-slate-800 border-slate-700"
          : "bg-white border-[color:var(--border-soft)]",
      ].join(" ")}
    >
      {isMaintenance && (
        <div className={`absolute -top-7 ${isRTL ? "right-2" : "left-2"} text-[11px] px-2 py-0.5 rounded-full border ${
          darkMode ? "bg-slate-800 border-slate-700 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {t("maintenance.short")}
        </div>
      )}
      <textarea
        ref={taRef}
        value={localMessage ?? ""}
        onChange={handleTextareaChange}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey) return;
          if (sendOnEnter) {
            handleSubmit(e);
            return;
          }
          if (e.ctrlKey || e.metaKey) {
            handleSubmit(e);
          }
        }}
        placeholder={placeholder}
        disabled={isMaintenance}
        dir={isRTL ? "rtl" : "ltr"}
        className={`flex-1 border-0 rounded-lg p-2 ${isRTL ? 'pl-22 sm:pl-20' : 'pr-22 sm:pr-20'} resize-none overflow-y-auto focus:outline-none focus:ring-0 text-sm leading-6 min-h-[44px] max-h-40 custom-scrollbar bg-transparent ${darkMode ? 'text-gray-100 placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-400'} ${isMaintenance ? 'opacity-50 cursor-not-allowed' : ''}`}
        rows={1}
        style={{ lineHeight: "1.5", transition: "height 0.1s ease-out" }}
      />

      <div className={`absolute bottom-2 ${isRTL ? 'left-3' : 'right-3'} flex items-center space-x-2`}>
        {/* Urdu Keyboard toggle — visible when language is set to Urdu */}
        {isRTL && (
          <button
            type="button"
            onClick={() => setShowUrduKeyboard(prev => !prev)}
            title={showUrduKeyboard ? "اردو کی بورڈ بند کریں" : "اردو کی بورڈ کھولیں"}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 border ${
              showUrduKeyboard
                ? 'bg-orange-500/20 border-orange-400/50 text-orange-500'
                : darkMode
                  ? 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:text-slate-300'
                  : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5v13A1.5 1.5 0 0 0 3.5 18h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 16.5 2h-13ZM5 5.75A.75.75 0 0 1 5.75 5h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 5 5.75Zm3.75-.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Zm2.75.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM5 9.75A.75.75 0 0 1 5.75 9h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 5 9.75Zm3.75-.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Zm2.75.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM6.75 13a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
            </svg>
            <span style={{ fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: '10px' }}>اردو</span>
            {showUrduKeyboard && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
          </button>
        )}
        <button
          type="button"
          aria-label={t("voice.submit")}
          disabled={micStarting || isMaintenance}
          aria-busy={micStarting}
          onClick={handleMicClick}
          className="text-gray-500 hover:text-gray-700 focus:outline-none h-9 w-9 flex items-center justify-center disabled:opacity-50 ui-control ui-focus-ring"
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
            className="text-white rounded-lg p-2 h-9 w-9 flex items-center justify-center hover:bg-opacity-90 transition duration-150 focus:outline-none focus:ring-2 ui-control ui-focus-ring"
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
            className="text-white rounded-lg p-2 h-9 w-9 flex items-center justify-center hover:bg-opacity-90 transition duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ui-primary-btn ui-control ui-focus-ring"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L6 12Z" />
            </svg>
          </button>
        )}
      </div>
    </form>
    </div>
  );
}
