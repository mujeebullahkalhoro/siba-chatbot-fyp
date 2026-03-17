"use client";
import React from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatMessage({ message, feedback, onFeedback, ttsHook, t }) {
  const { text, sender } = message;
  const isUser = sender === "user";
  const isThisSpeaking = ttsHook?.speakingId === message.id && ttsHook?.isSpeaking;

  // Function to provide a fallback translation if t is not available
  const translate = (key, defaultText) => {
    if (t) return t(key);
    return defaultText;
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`w-auto max-w-[90%] sm:max-w-xl px-4 py-3 shadow-md text-base transition-all duration-300 wrap-break-word ${isUser
          ? "text-white rounded-t-xl rounded-bl-xl"
          : "bg-gray-200 text-gray-800 rounded-t-xl rounded-br-xl"
          }`}
        style={{ backgroundColor: isUser ? '#0056b3' : undefined }}
      >
        <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert text-white' : 'text-gray-800'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => {
                const { href, ...other } = props;
                const isSchema = href?.includes('/api/schemas/download/') || href?.includes('.pdf');
                return (
                  <a
                    {...other}
                    href={href}
                    className={isUser ? 'text-white underline' : 'text-blue-600 underline'}
                    target={isSchema ? "_blank" : undefined}
                    rel={isSchema ? "noopener noreferrer" : undefined}
                  />
                );
              },
              p: ({ node, ...props }) => <p {...props} className="mb-1 last:mb-0" />,
              table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table {...props} className="min-w-full divide-y divide-gray-300 border border-gray-300 text-sm" /></div>,
              thead: ({ node, ...props }) => <thead {...props} className={isUser ? 'bg-white/10' : 'bg-gray-100'} />,
              th: ({ node, ...props }) => <th {...props} className="px-3 py-2 text-left font-semibold border-b border-gray-200" />,
              td: ({ node, ...props }) => <td {...props} className="px-3 py-2 border-t border-gray-100" />,
              ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2" />,
              ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2" />,
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
      
      {/* Feedback + Speaker buttons for bot messages */}
      {!isUser && (
        <div className="flex flex-col gap-1 mt-1 ml-1">
          <div className="flex gap-1">
            <button
              onClick={() => onFeedback && onFeedback(message.id, 'up')}
              className={`p-1 rounded transition-colors ${feedback === 'up' ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
              title={translate('feedback.helpful', 'Helpful')}
              disabled={!!feedback}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M1 8.998a1 1 0 0 1 1-1h3v9H2a1 1 0 0 1-1-1v-7Zm5.5 8.25 2.872-.763a7.03 7.03 0 0 0 1.81-.653l.463-.243a4.966 4.966 0 0 0 2.612-4.11l.051-.463a.8.8 0 0 0-.662-.857l-2.127-.355a1.2 1.2 0 0 1-.78-.554l-.423-.713a8.84 8.84 0 0 1-.549-1.125l-.349-.944a1.2 1.2 0 0 0-.687-.7l-.124-.047a.8.8 0 0 0-1.053.552l-.198.692a5.095 5.095 0 0 1-1.054 2.009l.001 7.07Z" />
              </svg>
            </button>
            <button
              onClick={() => onFeedback && onFeedback(message.id, 'down')}
              className={`p-1 rounded transition-colors ${feedback === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
              title={translate('feedback.notHelpful', 'Not helpful')}
              disabled={!!feedback}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M19 11.002a1 1 0 0 1-1 1h-3v-9h3a1 1 0 0 1 1 1v7Zm-5.5-8.25-2.872.763a7.03 7.03 0 0 0-1.81.653l-.463.243a4.966 4.966 0 0 0-2.612 4.11l-.051.463a.8.8 0 0 0 .662.857l2.127.355c.32.054.6.262.78.554l.423.713c.2.337.384.729.549 1.125l.349.944c.13.35.383.631.687.7l.124.047a.8.8 0 0 0 1.053-.552l.198-.692a5.095 5.095 0 0 1 1.054-2.009l-.001-7.07Z" />
              </svg>
            </button>
            {/* Speaker button */}
            {ttsHook && (
            <button
              onClick={() => ttsHook.speak(text, message.id)}
              className={`p-1 rounded transition-colors ${isThisSpeaking ? 'text-blue-600 animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
              title={isThisSpeaking ? 'Stop' : 'Listen'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
            )}
          </div>
        </div>
      )}
    </div >
  );
}
