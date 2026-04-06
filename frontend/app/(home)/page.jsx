'use client';
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AuthModal from '@/components/AuthModal';
import SideBar from '@/components/SideBar';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import ThinkingBubble from '@/components/ThinkingBubble';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { sendMessage, getChatSessions, createChatSession, getChatMessages, deleteChatSession, sendMessageStream, submitFeedback } from '@/services/chatService';
import { fetchMaintenanceStatus } from '@/services/adminService';
import useTTS from '@/hooks/useTTS';

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

// NOTE: ChatBubble has been replaced by the standard ChatMessage component imported from @/components/ChatMessage

// Main Page Component 
export default function App() {
  const { user } = useAuth();
  const { t, isRTL, lang } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Chat History State
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({}); // { messageId: 'up' | 'down' }

  // TTS (Text-to-Speech) for voice-to-voice
  const ttsHook = useTTS();
  const isVoiceQueryRef = useRef(false);

  const markVoiceQuery = () => {
    isVoiceQueryRef.current = true;
  };

  const SUGGESTED_QUESTIONS = [
    t("suggested.1"),
    t("suggested.2"),
    t("suggested.3"),
    t("suggested.4"),
  ];

  // Dark mode colors
  const bg = darkMode ? '#0f172a' : sibaLight;
  const headerBg = darkMode ? '#020617' : sibaDarkerBlue;
  const textColor = darkMode ? '#e2e8f0' : sibaDarkText;
  const botBubbleBg = darkMode ? '#1e293b' : undefined;
  const inputBg = darkMode ? '#1e293b' : '#f3f4f6';
  const inputBorder = darkMode ? '#334155' : '#e5e7eb';

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(""); // For guest sessions
  const abortControllerRef = useRef(null); // For streaming cancellation
  const hasMessages = messages.length > 0;

  // Font class for Urdu
  const fontClass = isRTL ? 'font-urdu' : '';

  useEffect(() => {
    // Generate a simple guest session ID on mount
    sessionIdRef.current = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Poll maintenance status
    const checkMaintenance = async () => {
      try {
        const data = await fetchMaintenanceStatus();
        setIsMaintenance(data.maintenance);
      } catch { }
    };
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 5000);
    return () => clearInterval(interval);
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

  const handleSendMessage = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const trimmed = (overrideText || currentMessage).trim();
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

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);

    try {
      // NOTE: We do NOT add an empty bot message here to avoid the "white box" artifact.
      // The bot message will be added when the first token arrives.

      const botId = Date.now() + 1;
      let firstToken = true;
      let fullText = "";

      await sendMessageStream(trimmed, activeSessionId, (token) => {
        fullText += token;
        
        if (fullText.trim() === "LOGIN_REQUIRED") {
          setIsModalOpen(true);
          return;
        }

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
      }, abortControllerRef.current.signal);

      // Auto-speak if voice-initiated query
      if (isVoiceQueryRef.current && fullText) {
        ttsHook.speak(fullText, botId);
        isVoiceQueryRef.current = false;
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled by user');
        return; // Don't show error message if user cancelled
      }
      const errorText = t('home.error');

      setMessages((prev) => {
        return [...prev, { id: Date.now() + 2, text: errorText, sender: 'bot' }];
      });
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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

  const handleFeedback = async (messageId, rating) => {
    if (feedbackMap[messageId]) return; // already rated
    setFeedbackMap(prev => ({ ...prev, [messageId]: rating }));
    // Find the bot message and the preceding user message
    const msgs = messages;
    const botIdx = msgs.findIndex(m => m.id === messageId);
    const botMsg = msgs[botIdx];
    const userMsg = botIdx > 0 ? msgs[botIdx - 1] : null;
    try {
      await submitFeedback({
        message_id: String(messageId),
        session_id: currentSessionId || sessionIdRef.current,
        rating,
        query: userMsg?.text || '',
        response_text: botMsg?.text?.substring(0, 500) || '',
      });
    } catch (e) {
      console.error('Feedback failed:', e);
    }
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
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${fontClass}`} style={{ backgroundColor: bg }}>
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
          className="w-full h-16 shadow-lg z-30 flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors duration-300"
          style={{ backgroundColor: headerBg }}
        >
          <div className="flex items-center">
            {user ? (
              <button
                className={`md:hidden p-2 text-white ${isRTL ? 'ml-2' : 'mr-2'}`}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            ) : null}

            <h1 className="text-lg sm:text-xl font-bold uppercase text-white">
              {t('header.title')}
            </h1>
          </div>

          {/* Right side: buttons */}
          <div className="flex items-center space-x-3">
            {/* Language switcher */}
            <LanguageSwitcher className="text-white" />
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-white rounded-lg hover:bg-white/10 transition"
              title={darkMode ? t('header.lightMode') : t('header.darkMode')}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Zm8.25-9.75a.75.75 0 0 1 .53.22l1.5 1.5a.75.75 0 1 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 .53-1.28ZM21 11.25h-2.25a.75.75 0 0 0 0 1.5H21a.75.75 0 0 0 0-1.5Zm-2.47 6.22a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 1 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18Zm-7.56-.44a.75.75 0 0 1 .53.22l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 .53-1.28ZM3 11.25a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 0 0-1.5H3Zm3.97-6.22a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {!user && (
              <>
                <button
                  onClick={handleAuthClick}
                  className="bg-white font-semibold py-2 px-4 text-sm sm:text-base rounded-lg hover:bg-gray-100 transition duration-150"
                  style={{ color: sibaDarkBlue }}
                >
                  {t('header.login')}
                </button>
                <button
                  onClick={handleAuthClick}
                  className="font-semibold py-2 px-4 text-sm sm:text-base rounded-lg transition duration-150 hover:opacity-90 min-w-max"
                  style={{ backgroundColor: sibaOrange, color: 'white' }}
                >
                  {t('header.signup')}
                </button>
              </>
            )}
          </div>
        </header>

        <main
          className={`flex-1 w-full flex flex-col items-center overflow-y-auto transition-all duration-300 ${hasMessages ? 'justify-start pt-4 pb-28' : 'justify-center'
            }`}
        >
          {!hasMessages && (
            <div className="text-center flex flex-col items-center justify-center max-w-[800px] w-full px-6 h-full">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: textColor }}>
                {t('header.title')}
              </h2>
              <p className={`text-sm sm:text-lg max-w-lg mx-auto mb-8 px-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('home.subtitle')}
              </p>
              {/* Suggested Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full max-w-lg px-4">
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
              <ChatInput
                handleSendMessage={handleSendMessage}
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                textareaRef={textareaRef}
                markVoiceQuery={markVoiceQuery}
                isGenerating={isGenerating}
                onStopGeneration={handleStopGeneration}
                isMaintenance={isMaintenance}
                className="relative w-full max-w-[800px] px-4"
              />
            </div>
          )}

          <div
            className={`flex flex-col space-y-4 pt-4 pb-4 w-full max-w-[800px] px-4 sm:px-6 ${hasMessages ? 'opacity-100' : 'hidden'
              }`}
          >
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                feedback={feedbackMap[msg.id]}
                onFeedback={handleFeedback}
                darkMode={darkMode}
                t={t}
                ttsHook={ttsHook}
                isRTL={isRTL}
              />
            ))}
            {isLoading && <ThinkingBubble />}
            <div ref={messagesEndRef} className="h-0" />
          </div>
        </main>

        {hasMessages && (
          <div className={`w-full flex justify-center py-4 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 transition-colors duration-300 ${darkMode ? 'bg-slate-900 border-t border-slate-700' : 'bg-gray-100 border-t border-gray-200'}`}>
            <ChatInput
              handleSendMessage={handleSendMessage}
              currentMessage={currentMessage}
              setCurrentMessage={setCurrentMessage}
              textareaRef={textareaRef}
              markVoiceQuery={markVoiceQuery}
              isGenerating={isGenerating}
              onStopGeneration={handleStopGeneration}
              isMaintenance={isMaintenance}
              className="w-full max-w-[800px] px-4 sm:px-6"
            />
          </div>
        )}
      </div>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
