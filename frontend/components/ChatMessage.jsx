"use client";
import React from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatMessage({ message }) {
  const { text, sender } = message;
  const isUser = sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`w-auto max-w-[90%] sm:max-w-xl px-4 py-3 rounded-2xl shadow-sm text-base ${isUser
          ? "bg-blue-600 text-white rounded-tr-none"
          : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
          }`}
      >
        <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert text-white' : 'text-gray-800'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node, ...props }) => <a {...props} className={isUser ? 'text-white underline' : 'text-blue-600 underline'} />,
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
    </div>
  );
}
