"use client";
import React, { useRef } from "react";

const sibaOrange = "#ea6645";

export default function ChatInput({
  handleSendMessage = () => {},
  currentMessage = "",
  setCurrentMessage = () => {},
  className = "",
  textareaRef, // accept the prop so it's in scope
} = {}) {
  const localRef = useRef(null);
  const taRef = textareaRef ?? localRef; // safe fallback

  const handleTextareaChange = (e) => {
    const v = e.target.value ?? "";
    setCurrentMessage(v);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = (currentMessage ?? "").trim();
    if (!trimmed) return;
    handleSendMessage(e);
    if (taRef.current) taRef.current.style.height = "44px";
  };

  const disabled = !((currentMessage ?? "").trim());

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        "relative flex items-center bg-white border border-gray-200",
        "rounded-xl shadow-lg px-3 py-2",
        className,
      ].join(" ")}
    >
      <textarea
        ref={taRef}
        value={currentMessage ?? ""}
        onChange={handleTextareaChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) handleSubmit(e);
        }}
        placeholder="Ask about admissions, faculty, or events..."
        className="flex-1 border-0 rounded-lg p-2 pr-22 sm:pr-20 resize-none overflow-y-auto focus:outline-none focus:ring-0 text-sm leading-5 min-h-[44px] max-h-40 custom-scrollbar"
        rows={1}
        style={{ lineHeight: "1.5", transition: "height 0.1s ease-out" }}
      />

      <div className="absolute bottom-2 right-3 flex items-center space-x-2">
        <button
          type="button"
          aria-label="Voice input"
          className="text-gray-500 hover:text-gray-700 focus:outline-none h-9 w-9 flex items-center justify-center"
          style={{ color: sibaOrange }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Z" />
          </svg>
        </button>

        <button
          type="submit"
          disabled={disabled}
          aria-label="Send message"
          className="text-white rounded-lg p-2 h-9 w-9 flex items-center justify-center hover:bg-opacity-90 transition duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: sibaOrange }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L6 12Z" />
          </svg>
        </button>
      </div>
    </form>
  );
}
