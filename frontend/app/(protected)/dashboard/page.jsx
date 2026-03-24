"use client";
import React, { useEffect } from "react";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import { useChat } from "@/context/ChatContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

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

  const SUGGESTED_QUESTIONS = [
    t("suggested.1"),
    t("suggested.2"),
    t("suggested.3"),
    t("suggested.4"),
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

  if (!hasMessages) {
    return (
      <div className={`relative h-full overflow-hidden transition-colors duration-300 ${bg}`}>
        {/*  Centered header & text for all screens */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-[800px]">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: textColor }}>
              {t('header.title')}
            </h2>
            <p className={`text-sm sm:text-lg max-w-lg mx-auto mb-8 px-4 ${subTextColor}`}>
              {t('home.subtitle')}
            </p>

            {/* Suggested Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full max-w-lg mx-auto px-4">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentMessage(q);
                    // Trigger send via form-submit-like approach
                    setTimeout(() => {
                      const form = document.querySelector('form');
                      if (form) form.requestSubmit();
                    }, 50);
                  }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${isRTL ? 'text-right' : ''} ${darkMode
                    ? 'bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700 hover:border-slate-600'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  {q}
                </button>
              ))}
            </div>

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
        <div className={`sm:hidden fixed bottom-0 inset-x-0 border-t shadow-md px-4 py-3 transition-colors duration-300 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
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
    <div className={`flex flex-col h-full overflow-hidden transition-colors duration-300 ${bg}`}>
      {/*  Chat messages scroll independently */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>

      {/*  Input bar centered within chat area */}
      <div className={`relative border-t shadow-md flex justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
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
