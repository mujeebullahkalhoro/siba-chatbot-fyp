'use client';
import React, { useState, useRef, useEffect } from 'react';
import AuthModal from '@/components/AuthModal';

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

// Color Variables (Defined globally for easy access) 
const sibaLightBlue = '#007bff'; // Used for Log In button text color
const sibaDarkBlue = '#0056b3'; // Dark Blue for Header and User Messages
const sibaDarkerBlue = '#003e80'; // Even darker for hover/accents
const sibaOrange = '#ea6645'; // Vibrant orange for Sign Up button, icons, and send button
const sibaDarkText = '#333333';
const sibaLight = '#f7f7f7';

// 1. Chat Bubble Component 
const ChatBubble = ({ message }) => {
  const { text, sender } = message;
  const isUser = sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div
        className={`w-auto max-w-[90%] sm:max-w-xl px-4 py-3 shadow-md text-base transition-all duration-300 wrap-break-word ${ 
          isUser
            ? 'text-white rounded-t-xl rounded-bl-xl'
            : 'bg-gray-200 rounded-t-xl rounded-br-xl'
        }`}
        style={{ backgroundColor: isUser ? sibaDarkBlue : undefined, color: isUser ? 'white' : sibaDarkText }}
      >
        <p>{text}</p>
      </div>
    </div>
  );
};

// Chat Input Component (Extracted for cleaner layout logic)
const ChatInput = ({ handleSendMessage, currentMessage, setCurrentMessage, textareaRef, className }) => {
  const handleTextareaChange = (e) => {
    setCurrentMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(e);
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`
        relative flex items-center bg-white border border-gray-200 
        rounded-xl shadow-lg px-3 py-2
        ${className} 
      `}
    >
      <textarea
        ref={textareaRef}
        value={currentMessage}
        onChange={handleTextareaChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmit(e);
          }
        }}
        placeholder="Ask about admissions, faculty, or policies at SIBA..."
        className="
          flex-1 border-0 rounded-lg p-2 pr-22 sm:pr-20 
          resize-none overflow-y-auto
          focus:outline-none focus:ring-0
          text-sm leading-5
          `min-h-11 max-h-40
          custom-scrollbar
        "
        rows="1"
        style={{
          lineHeight: '1.5',
          transition: 'height 0.1s ease-out',
        }}
      />

      <div className="absolute bottom-2 right-3 flex items-center space-x-2">
        <button
          type="button"
          aria-label="Voice input"
          className="
            text-gray-500 hover:text-gray-700
            focus:outline-none h-9 w-9 flex items-center justify-center
          "
          style={{ color: sibaOrange }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Z"
            />
          </svg>
        </button>

        <button
          type="submit"
          disabled={!currentMessage.trim()}
          aria-label="Send message"
          style={{ backgroundColor: sibaOrange }}
          className="
            text-white rounded-lg p-2
            h-9 w-9 flex items-center justify-center
            hover:bg-opacity-90 transition duration-150
            focus:outline-none focus:ring-2 focus:ring-siba-blue
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L6 12Z"
            />
          </svg>
        </button>
      </div>
    </form>
  );
};

// Main Page Component 
export default function App() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const hasMessages = messages.length > 0;

  // Removed impure useRef initializer; delay will be computed in the event handler.

  const handleSendMessage = (e) => {
    e.preventDefault();
    const trimmed = currentMessage.trim();
    if (!trimmed) return;

    // Compute random delay outside render (event handler is safe)
    const delay = Math.floor(Math.random() * 800) + 500;

    const newUserMsg = { id: Date.now(), text: trimmed, sender: 'user' };
    setMessages((prev) => [...prev, newUserMsg]);
    setCurrentMessage('');

    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    setTimeout(() => {
      const botReply = {
        id: Date.now() + 1,
        text: `I received your inquiry: "${trimmed}". As the SIBA AI Assistant, I can provide information on admissions, courses, and schedules.`,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botReply]);
    }, delay);
  };

  useEffect(() => {
    if (hasMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasMessages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
  
  const handleAuthClick = () => {
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  // FIXED FUNCTION
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-x-hidden font-sans" style={{ backgroundColor: sibaLight }}>
      <GlobalStyles /> 
      
     <header
  className="fixed top-0 left-0 w-full h-16 shadow-lg z-50 flex items-center justify-between px-4 sm:px-6"
  style={{ backgroundColor: sibaDarkerBlue }}
>
  {/* Left side: title */}
  <h1 className="text-lg sm:text-xl font-bold uppercase text-white">
    SIBA AI ASSISTANT
  </h1>

  {/* Right side: buttons */}
  <div className="hidden sm:flex space-x-4">
    <button
      onClick={handleAuthClick}
      className="bg-white font-semibold py-2 px-4 text-base rounded-lg hover:bg-gray-100 transition duration-150"
      style={{ color: sibaDarkBlue }}
    >
      Log in
    </button>
    <button
      onClick={handleAuthClick}
      className="font-semibold py-2 px-4 text-base rounded-lg transition duration-150 hover:opacity-90"
      style={{ backgroundColor: sibaOrange, color: 'white' }}
    >
      Sign up
    </button>
  </div>

  {/* Mobile menu icon */}
  <button
    className="sm:hidden p-2 text-white"
    onClick={() => setIsMenuOpen(!isMenuOpen)}
    aria-label="Toggle navigation menu"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  </button>
</header>

      
      <div 
        className={`fixed top-16 right-0 w-48 bg-white shadow-xl z-40 transition-transform duration-300 transform ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } sm:hidden border-b border-l border-gray-200`}
      >
        <button
          onClick={handleAuthClick}
          className="w-full text-left font-semibold py-3 px-4 transition duration-150 hover:bg-gray-100"
          style={{ color: sibaDarkBlue }}
        >
          Log in
        </button>
        <button
          onClick={handleAuthClick}
          className="w-full text-left font-semibold py-3 px-4 transition duration-150 hover:opacity-90"
          style={{ backgroundColor: sibaOrange, color: 'white' }} 
        >
          Sign up
        </button>
      </div>

      <main
        className={`flex-1 w-full flex flex-col items-center overflow-y-auto transition-all duration-300 ${
          hasMessages ? 'justify-start pt-16 pb-28' : 'justify-center pt-16' 
        }`}
      >
        {!hasMessages && (
          <div className="text-center flex flex-col items-center justify-center max-w-[800px] w-full px-6 -mt-16 h-full">
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
          className={`flex flex-col space-y-4 pt-4 pb-4 w-full max-w-[800px] px-4 sm:px-6 ${
            hasMessages ? 'opacity-100' : 'hidden'
          }`}
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} className="h-0" />
        </div>
      </main>

      {hasMessages && (
        <div className="fixed bottom-0 w-full flex justify-center py-4 bg-gray-100 z-40 shadow-xl border-t border-gray-200">
          <ChatInput
            handleSendMessage={handleSendMessage}
            currentMessage={currentMessage}
            setCurrentMessage={setCurrentMessage}
            textareaRef={textareaRef}
            className="w-full max-w-[800px] px-4 sm:px-6"
          />
        </div>
      )}
      
      {/* FIXED Auth Modal */}
      <AuthModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
