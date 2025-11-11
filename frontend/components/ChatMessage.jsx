"use client";
import React from "react";

const sibaDarkBlue = "#0056b3";
const sibaDarkText = "#333333";

export default function ChatMessage({ message }) {
  const { text, sender } = message;
  const isUser = sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`w-auto max-w-[90%] sm:max-w-xl px-4 py-3 shadow-md text-base transition-all duration-300 warp-break-words ${
          isUser
            ? "text-white rounded-t-xl rounded-bl-xl"
            : "bg-gray-200 rounded-t-xl rounded-br-xl"
        }`}
        style={{
          backgroundColor: isUser ? sibaDarkBlue : undefined,
          color: isUser ? "white" : sibaDarkText,
        }}
      >
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
