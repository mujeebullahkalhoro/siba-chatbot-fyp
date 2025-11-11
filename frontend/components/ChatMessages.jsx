"use client";
import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

// Pass hasFixedInput=true when the composer is fixed at the bottom
export default function ChatMessages({ messages, hasFixedInput = false }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        <ChatMessage key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </main>
  );
}
