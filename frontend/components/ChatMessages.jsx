"use client";
import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import ThinkingBubble from "./ThinkingBubble";
import { useChat } from "@/context/ChatContext";
import { submitFeedback } from "@/services/chatService";
import useTTS from "@/hooks/useTTS";
import { useLanguage } from "@/context/LanguageContext";

// Pass hasFixedInput=true when the composer is fixed at the bottom
export default function ChatMessages({ messages, hasFixedInput = false, isLoading = false }) {
  const endRef = useRef(null);
  const { currentSessionId } = useChat();
  const [feedbackMap, setFeedbackMap] = useState({});
  const ttsHook = useTTS();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleFeedback = async (messageId, rating) => {
    if (feedbackMap[messageId]) return;
    setFeedbackMap(prev => ({ ...prev, [messageId]: rating }));
    
    const botIdx = messages.findIndex(m => m.id === messageId);
    if (botIdx === -1) return;
    const botMsg = messages[botIdx];
    const userMsg = botIdx > 0 ? messages[botIdx - 1] : null;

    try {
      await submitFeedback({
        message_id: String(messageId),
        session_id: currentSessionId || "guest_session",
        rating,
        query: userMsg?.text || '',
        response_text: botMsg?.text?.substring(0, 500) || '',
      });
    } catch (e) {
      console.error('Feedback failed:', e);
    }
  };

  return (
    <main
      className={[
        "mx-auto w-full max-w-[800px] px-4 sm:px-6 py-4 space-y-4",
        "custom-scrollbar",
        // Scroll only if content exceeds available height
        "overflow-y-auto", // overflow: auto shows scrollbar only when needed
        hasFixedInput ? "pb-28" : "pb-0",
      ].join(" ")}
    >
      {messages.map((m) => (
        <ChatMessage 
          key={m.id} 
          message={m} 
          feedback={feedbackMap[m.id]}
          onFeedback={handleFeedback}
          ttsHook={ttsHook}
          t={t}
          isRTL={isRTL}
        />
      ))}
      {isLoading && <ThinkingBubble />}
      <div ref={endRef} />
    </main>
  );
}
