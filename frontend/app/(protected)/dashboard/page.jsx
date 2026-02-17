"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";

import { sendMessageStream } from "@/services/chatService";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null);
  const sessionIdRef = useRef("");

  useEffect(() => {
    // Generate a simple session ID on mount
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const send = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = currentMessage.trim();
    if (!trimmed || isLoading) return;

    const usrId = Date.now();
    const botId = usrId + 1;
    const usr = { id: usrId, text: trimmed, sender: "user" };

    setMessages((p) => [...p, usr]);
    setCurrentMessage("");
    setIsLoading(true);

    // Add an empty bot message that we'll stream into
    setMessages((p) => [
      ...p,
      { id: botId, text: "", sender: "bot" },
    ]);

    try {
      let firstToken = true;
      await sendMessageStream(trimmed, sessionIdRef.current, (token) => {
        if (firstToken) {
          // Hide thinking bubble once first token arrives
          setIsLoading(false);
          firstToken = false;
        }
        // Append each token to the bot message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, text: m.text + token } : m
          )
        );
      });
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? { ...m, text: "Sorry, I encountered an error. Please try again." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading]);

  const hasMessages = messages.length > 0;

  // Focus textarea on load
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  if (!hasMessages) {
    return (
      <div className="relative h-full bg-gray-50 overflow-hidden">
        {/*  Centered header & text for all screens */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-[800px]">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 text-gray-900">
              SIBA AI ASSISTANT
            </h2>
            <p className="text-sm sm:text-lg text-gray-500 mb-10">
              Ask about admissions, faculty, or policies at SIBA.
            </p>

            {/*  Desktop input appears below heading */}
            <div className="hidden sm:block">
              <ChatInput
                handleSendMessage={send}
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                textareaRef={textareaRef}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/*  Mobile fixed bottom input */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-gray-50 border-t border-gray-200 shadow-md px-4 py-3">
          <ChatInput
            handleSendMessage={send}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            textareaRef={textareaRef}
            className="w-full"
          />
        </div>
      </div>
    );
  }



  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/*  Chat messages scroll independently */}
      <div className="flex-1 overflow-y-auto px-4">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>

      {/*  Input bar centered within chat area */}
      <div className="relative bg-gray-50 border-t border-gray-200 shadow-md flex justify-center">
        <div className="w-full max-w-[800px] px-4 sm:px-6 py-4">
          <ChatInput
            handleSendMessage={send}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            textareaRef={textareaRef}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
