"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sendMessage, getChatSessions, createChatSession, getChatMessages, sendMessageStream, deleteChatSession } from '@/services/chatService';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();

    // State
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const textareaRef = useRef(null);
    const sessionIdRef = useRef(""); // For guest sessions

    useEffect(() => {
        // Generate a simple guest session ID on mount
        sessionIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Load chat sessions when user logs in
    useEffect(() => {
        if (user) {
            loadSessions();
        } else {
            setSessions([]);
            setCurrentSessionId(null);
            setMessages([]);
            sessionIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }, [user]);

    const loadSessions = async () => {
        try {
            const data = await getChatSessions();
            setSessions(data);
        } catch (e) {
            console.error("Failed to load sessions:", e);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        if (!user) {
            sessionIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        if (textareaRef.current) textareaRef.current.focus();
    };

    const handleSelectSession = async (sessionId) => {
        if (currentSessionId === sessionId) return;
        setCurrentSessionId(sessionId);
        setMessages([]); // Clear current while loading
        setIsLoading(true);

        try {
            const history = await getChatMessages(sessionId);
            setMessages(history.map(msg => ({
                id: msg._id,
                text: msg.text,
                sender: msg.sender
            })));
        } catch (e) {
            console.error("Failed to load messages:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Shared send logic
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const trimmed = currentMessage.trim();
        if (!trimmed || isLoading) return;

        const usrId = Date.now();
        const botId = usrId + 1;

        // Add user message immediately
        setMessages((p) => [...p, { id: usrId, text: trimmed, sender: "user" }]);
        setCurrentMessage('');
        setIsLoading(true);

        // NOTE: We do NOT add an empty bot message here anymore to avoid the "white box" artifact.
        // The bot message will be added when the first token arrives.

        let activeSessionId = currentSessionId;
        let isNewSession = false;

        // Create session if first message and logged in
        if (user && !activeSessionId) {
            try {
                const title = trimmed.length > 30 ? trimmed.substring(0, 30) + "..." : trimmed;
                const newSession = await createChatSession(title);
                activeSessionId = newSession._id;
                setCurrentSessionId(activeSessionId);
                isNewSession = true;
            } catch (e) {
                console.error("Failed to create session:", e);
            }
        }

        if (!activeSessionId) {
            activeSessionId = sessionIdRef.current;
        }

        try {
            let firstToken = true;
            let fullText = "";
            await sendMessageStream(trimmed, activeSessionId, (token) => {
                if (firstToken) {
                    setIsLoading(false); // Hide thinking bubble
                    firstToken = false;
                    // Add the bot message NOW (prevents empty bubble before reasoning)
                    setMessages((p) => [...p, { id: botId, text: token, sender: "bot" }]);
                } else {
                    // Update existing bot message
                    // Note: We use functional update to ensure we map over the latest messages
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === botId ? { ...m, text: m.text + token } : m
                        )
                    );
                }
                fullText += token;
            });

            if (isNewSession) {
                loadSessions();
            }

        } catch (error) {
            // If error occurs, we need to ensure the error message is shown
            setMessages((prev) => {
                const exists = prev.some(m => m.id === botId);
                if (exists) {
                    return prev.map((m) => m.id === botId ? { ...m, text: "Sorry, I encountered an error. Please try again." } : m);
                } else {
                    return [...prev, { id: botId, text: "Sorry, I encountered an error. Please try again.", sender: "bot" }];
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteChat = async (sessionId, e) => {
        if (e) e.stopPropagation();
        // Confirmation is now handled by the UI component (SideBar)

        try {
            await deleteChatSession(sessionId);
            setSessions(prev => prev.filter(s => s._id !== sessionId));

            // If deleted active session, reset
            if (currentSessionId === sessionId) {
                setCurrentSessionId(null);
                setMessages([]);
                if (!user) {
                    sessionIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    };

    return (
        <ChatContext.Provider value={{
            messages,
            setMessages,
            currentMessage,
            setCurrentMessage,
            isLoading,
            sessions,
            currentSessionId,
            handleNewChat,
            handleSelectSession,
            handleSendMessage,
            handleDeleteChat,
            textareaRef
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);
