'use client';
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AuthModal from '@/components/AuthModal';
import SideBar from '@/components/SideBar';
import ChatInput from '@/components/ChatInput';
import ThinkingBubble from '@/components/ThinkingBubble';
import { useAuth } from '@/context/AuthContext';
import { sendMessage, getChatSessions, createChatSession, getChatMessages, deleteChatSession, sendMessageStream } from '@/services/chatService';

// This ensures the custom-scrollbar class is defined globally.
const GlobalStyles = () => (
  <style>{`
    /* Hide scrollbar by default and make it thin */
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px; /* Width of the thin scrollbar */
      height: 6px; /* For horizontal scrollbar, though unlikely here */
    }

    /* Make the thumb transparent by default */
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: transparent; 
      border-radius: 10px;
    }

    /* Show the scrollbar thumb ONLY when hovering over the scrollable area */
    .custom-scrollbar:hover::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.3); /* Slightly darker on hover */
    }

    /* Hide the track */
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    
    /* For Firefox (less control, uses 'thin' property) */
    .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: transparent transparent; /* Hide both thumb and track */
    }
  `}</style>
);

// Color Variables
const sibaLightBlue = '#007bff';
const sibaDarkBlue = '#0056b3';
const sibaDarkerBlue = '#003e80';
const sibaOrange = '#ea6645';
const sibaDarkText = '#333333';
const sibaLight = '#f7f7f7';

// Chat Bubble Component 
const ChatBubble = ({ message }) => {
  const { text, sender } = message;
  const isUser = sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
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

// Main Page Component 
export default function App() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Chat History State
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(""); // For guest sessions
  const hasMessages = messages.length > 0;

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
      // Reset to guest session
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
    setIsSidebarOpen(false);
    // For authenticated user, next message will create a session
    // For guest, we reset guest session ID
    if (!user) {
      sessionIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleSelectSession = async (sessionId) => {
    if (currentSessionId === sessionId) return;
    setCurrentSessionId(sessionId);
    setIsSidebarOpen(false);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = currentMessage.trim();
    if (!trimmed || isLoading) return;

    const newUserMsg = { id: Date.now(), text: trimmed, sender: 'user' };
    setMessages((prev) => [...prev, newUserMsg]);
    setCurrentMessage('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    let activeSessionId = currentSessionId;

    // Create session if first message and logged in
    if (user && !activeSessionId) {
      try {
        // Use first 30 chars as title
        const title = trimmed.length > 30 ? trimmed.substring(0, 30) + "..." : trimmed;
        const newSession = await createChatSession(title);
        activeSessionId = newSession._id;
        setCurrentSessionId(activeSessionId);
        loadSessions(); // Update list
      } catch (e) {
        console.error("Failed to create session:", e);
      }
    }

    // Fallback to guest session if no active session (or create failed)
    if (!activeSessionId) {
      activeSessionId = sessionIdRef.current;
    }

    try {
      // NOTE: We do NOT add an empty bot message here to avoid the "white box" artifact.
      // The bot message will be added when the first token arrives.

      const botId = Date.now() + 1;
      let firstToken = true;

      await sendMessageStream(trimmed, activeSessionId, (token) => {
        if (firstToken) {
          setIsLoading(false); // Hide thinking bubble
          firstToken = false;
          // Add the bot message NOW
          setMessages((prev) => [...prev, { id: botId, text: token, sender: 'bot' }]);
        } else {
          // Update existing bot message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId ? { ...m, text: m.text + token } : m
            )
          );
        }
      });

    } catch (error) {
      // If error occurs, we need to ensure the error message is shown
      const errorText = "Sorry, I encountered an error. Please try again.";

      setMessages((prev) => {
        // If we already started streaming a bot message, replace it or append error
        // Ideally just append error message if it failed mid-stream, but simple fallback:
        return [...prev, { id: Date.now() + 2, text: errorText, sender: 'bot' }];
      });
      if (error.message === "LOGIN_REQUIRED") {
        setIsModalOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasMessages || isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasMessages, isLoading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleAuthClick = () => {
    setIsModalOpen(true);
  };

  const handleDeleteChat = async (sessionId, e) => {
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
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: sibaLight }}>
      <GlobalStyles />

      {/* Sidebar for authenticated users */}
      {user && (
        <SideBar
          isMobileOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">

        {/* Header */}
        <header
          className="w-full h-16 shadow-lg z-30 flex items-center justify-between px-4 sm:px-6 shrink-0"
          style={{ backgroundColor: sibaDarkerBlue }}
        >
          <div className="flex items-center">
            {/* Mobile menu icon (only if user is logged in for sidebar, or guest menu?) 
                     If logged in -> toggle sidebar 
                     If guest -> toggle guest menu (handled below)
                 */}
            {user ? (
              <button
                className="md:hidden p-2 text-white mr-2"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            ) : null}

            <h1 className="text-lg sm:text-xl font-bold uppercase text-white">
              SIBA AI ASSISTANT
            </h1>
          </div>

          {/* Right side: buttons (only show if NOT logged in) */}
          {!user && (
            <div className="flex space-x-4">
              <button
                onClick={handleAuthClick}
                className="bg-white font-semibold py-2 px-4 text-sm sm:text-base rounded-lg hover:bg-gray-100 transition duration-150"
                style={{ color: sibaDarkBlue }}
              >
                Log in
              </button>
              <button
                onClick={handleAuthClick}
                className="font-semibold py-2 px-4 text-sm sm:text-base rounded-lg transition duration-150 hover:opacity-90 min-w-max"
                style={{ backgroundColor: sibaOrange, color: 'white' }}
              >
                Sign up
              </button>
            </div>
          )}
        </header>

        <main
          className={`flex-1 w-full flex flex-col items-center overflow-y-auto transition-all duration-300 ${hasMessages ? 'justify-start pt-4 pb-28' : 'justify-center'
            }`}
        >
          {!hasMessages && (
            <div className="text-center flex flex-col items-center justify-center max-w-[800px] w-full px-6 h-full">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: sibaDarkText }}>
                SIBA AI ASSISTANT
              </h2>
              <p className="text-sm sm:text-lg text-gray-500 max-w-lg mx-auto mb-16 px-4">
                Ask about admissions, faculty, or policies at SIBA.
              </p>
              <ChatInput
                handleSendMessage={handleSendMessage}
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                textareaRef={textareaRef}
                className="relative w-full max-w-[800px] px-4"
              />
            </div>
          )}

          <div
            className={`flex flex-col space-y-4 pt-4 pb-4 w-full max-w-[800px] px-4 sm:px-6 ${hasMessages ? 'opacity-100' : 'hidden'
              }`}
          >
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <ThinkingBubble />}
            <div ref={messagesEndRef} className="h-0" />
          </div>
        </main>

        {hasMessages && (
          <div className="w-full flex justify-center py-4 bg-gray-100 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-200 shrink-0">
            <ChatInput
              handleSendMessage={handleSendMessage}
              currentMessage={currentMessage}
              setCurrentMessage={setCurrentMessage}
              textareaRef={textareaRef}
              className="w-full max-w-[800px] px-4 sm:px-6"
            />
          </div>
        )}
      </div>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
