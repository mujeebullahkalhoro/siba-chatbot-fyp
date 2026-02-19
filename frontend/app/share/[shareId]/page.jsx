"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSharedChat } from '@/services/chatService';
import ChatMessages from '@/components/ChatMessages';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Reusing same chat bubble or similar for consistency, but maybe simplified.
// Actually, ChatMessages component expects specific message format. 
// Let's import ChatBubble from ChatMessages if it was exported, or copy it.
// ChatMessages.jsx usually handles the list.
// Let's check ChatMessages.jsx content first to see if it's reusable for read-only.
// If not, I'll build a simple reader here.

const sibaDarkBlue = '#0056b3';
const sibaDarkText = '#333333';

const ReadOnlyChatBubble = ({ message }) => {
    const { text, sender } = message;
    const isUser = sender === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full mb-4`}>
            <div
                className={`w-auto max-w-[90%] sm:max-w-xl px-4 py-3 shadow-md text-base transition-all duration-300 wrap-break-word ${isUser
                    ? 'text-white rounded-t-xl rounded-bl-xl'
                    : 'bg-gray-200 rounded-t-xl rounded-br-xl'
                    }`}
                style={{ backgroundColor: isUser ? sibaDarkBlue : undefined, color: isUser ? 'white' : sibaDarkText }}
            >
                <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert text-white' : 'text-gray-800'}`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ node, ...props }) => <a {...props} className={isUser ? 'text-white underline' : 'text-blue-600 underline'} />,
                            p: ({ node, ...props }) => <p {...props} className="mb-1 last:mb-0" />,
                            table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table {...props} className="min-w-full divide-y divide-gray-300 border border-gray-300 text-sm" /></div>,
                            thead: ({ node, ...props }) => <thead {...props} className={isUser ? 'bg-white/10' : 'bg-gray-300'} />,
                            th: ({ node, ...props }) => <th {...props} className="px-3 py-2 text-left font-semibold" />,
                            td: ({ node, ...props }) => <td {...props} className="px-3 py-2 border-t border-gray-300/20" />,
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
};

export default function SharedChatPage() {
    const { shareId } = useParams();
    const [chatData, setChatData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchChat = async () => {
            try {
                const data = await getSharedChat(shareId);
                setChatData(data);
            } catch (err) {
                console.error("Failed to load shared chat:", err);
                setError("Failed to load chat. It may have been deleted or the link is invalid.");
            } finally {
                setIsLoading(false);
            }
        };

        if (shareId) fetchChat();
    }, [shareId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Header */}
            <header className="w-full h-16 px-4 sm:px-6 flex items-center justify-center shadow-lg relative z-30 text-white shrink-0" style={{ backgroundColor: '#003e80' }}>
                <h2 className="text-lg sm:text-xl font-bold uppercase whitespace-nowrap">
                    {chatData?.title || "Shared Chat"}
                </h2>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="max-w-[800px] mx-auto space-y-4">
                    <div className="text-center mb-8">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase tracking-wide">
                            Shared Session
                        </span>
                        <p className="text-sm text-gray-500 mt-2">
                            {new Date(chatData.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {chatData.messages.map((msg) => (
                        <ReadOnlyChatBubble key={msg._id} message={msg} />
                    ))}

                    <div className="h-12"></div> {/* Spacer */}
                </div>
            </div>

            {/* Footer / Call to Action */}
            <div className="bg-white border-t border-gray-200 p-4 text-center shrink-0">
                <p className="text-sm text-gray-600 mb-2">
                    Want to ask your own questions?
                </p>
                <a
                    href="/"
                    className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                >
                    Start Your Own Chat
                </a>
            </div>
        </div>
    );
}
