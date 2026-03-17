"use client";
import React, { useEffect } from "react";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import { useChat } from "@/context/ChatContext";
import { useLanguage } from "@/context/LanguageContext";

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
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: '#333333' }}>
              {t('header.title')}
            </h2>
            <p className="text-sm sm:text-lg text-gray-500 max-w-lg mx-auto mb-16 px-4">
              {t('home.subtitle')}
            </p>

            {/*  Desktop input appears below heading */}
            <div className="hidden sm:block">
              <ChatInput
                handleSendMessage={handleSendMessage}
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                textareaRef={textareaRef}
                isGenerating={isGenerating}
                onStopGeneration={handleStopGeneration}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/*  Mobile fixed bottom input */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-gray-50 border-t border-gray-200 shadow-md px-4 py-3">
          <ChatInput
            handleSendMessage={handleSendMessage}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            textareaRef={textareaRef}
            isGenerating={isGenerating}
            onStopGeneration={handleStopGeneration}
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
            handleSendMessage={handleSendMessage}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            textareaRef={textareaRef}
            isGenerating={isGenerating}
            onStopGeneration={handleStopGeneration}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
