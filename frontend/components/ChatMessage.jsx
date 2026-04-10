import React, { memo } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from "@/context/ThemeContext";

function ChatMessage({ message, compact = false, feedback, onFeedback, ttsHook, t, isRTL = false }) {
  const { text, sender } = message;
  const isUser = sender === "user";
  const { darkMode } = useTheme();
  const isThisSpeaking = ttsHook?.speakingId === message.id && ttsHook?.isSpeaking;

  // Bot bubble background
  const botBg = darkMode ? '#1e293b' : '#ffffff';

  // Function to provide a fallback translation if t is not available
  const translate = (key, defaultText) => {
    if (t) return t(key);
    return defaultText;
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full animate-fade-in-up ${compact ? "mt-1" : ""}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {!isUser && !compact && (
        <div className="w-7 h-7 rounded-full mr-2 mt-1 bg-gradient-to-br from-blue-500 to-[#003e80] text-white text-xs font-bold flex items-center justify-center shrink-0">
          AI
        </div>
      )}
      <div
        className={`w-auto max-w-[92%] sm:max-w-2xl px-4 py-3 shadow-md text-base transition-all duration-300 wrap-break-word rounded-2xl border ui-card
          ${isUser
            ? `text-white ${isRTL ? 'rounded-br-md' : 'rounded-bl-md'} border-transparent`
            : `${isRTL ? 'rounded-bl-md' : 'rounded-br-md'} ${darkMode ? 'border-slate-700/70' : 'border-[color:var(--border-soft)]'}`
          }`}
        style={{ 
          background: isUser ? 'linear-gradient(135deg, #003e80 0%, #0056b3 100%)' : botBg,
          color: isUser ? 'white' : (darkMode ? '#e2e8f0' : '#333333')
        }}
      >
        <div className={`prose prose-sm max-w-none leading-relaxed ${isUser ? 'prose-invert text-white' : (darkMode ? 'prose-invert text-gray-200' : 'text-gray-800')}`}>
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
                    className={isUser ? 'text-white underline' : 'underline text-blue-600'}
                    style={{ color: isUser ? undefined : (darkMode ? '#60a5fa' : '#003e80') }}
                    target={isSchema ? "_blank" : undefined}
                    rel={isSchema ? "noopener noreferrer" : undefined}
                  />
                );
              },
              p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
              table: ({ node, ...props }) => <div className="overflow-x-auto my-2" dir="ltr"><table {...props} className={`min-w-full divide-y border text-sm ${darkMode ? 'divide-slate-700 border-slate-700' : 'divide-gray-300 border-gray-300'}`} /></div>,
              thead: ({ node, ...props }) => <thead {...props} className={isUser ? 'bg-white/10' : (darkMode ? 'bg-slate-800' : 'bg-gray-200')} />,
              th: ({ node, ...props }) => <th {...props} className={`px-3 py-2 font-semibold ${isRTL ? 'text-right' : 'text-left'}`} />,
              td: ({ node, ...props }) => <td {...props} className={`px-3 py-2 border-t ${darkMode ? 'border-slate-800' : 'border-gray-200'} ${isRTL ? 'text-right' : 'text-left'}`} />,
              ul: ({ node, ...props }) => <ul {...props} className={`list-disc ps-4 mb-2 ${isRTL ? 'pr-4' : ''}`} />,
              ol: ({ node, ...props }) => <ol {...props} className={`list-decimal ps-4 mb-2 ${isRTL ? 'pr-4' : ''}`} />,
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
      
      {/* Feedback + Speaker buttons for bot messages */}
      {!isUser && (
        <div className={`flex flex-col gap-1 mt-1 ${isRTL ? 'mr-1' : 'ml-1'}`}>
          <div className="flex gap-1 items-center">

            {/* 👍 Thumbs Up */}
            <button
              onClick={() => onFeedback && onFeedback(message.id, 'up')}
              className={`p-1.5 rounded-lg transition-all duration-200 ui-control ui-focus-ring ${
                feedback === 'up'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : `${darkMode ? 'text-slate-500 hover:text-green-400 hover:bg-slate-700' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`
              }`}
              title={translate('feedback.helpful', 'Helpful')}
              disabled={!!feedback}
            >
              {feedback === 'up' ? (
                /* Filled when active */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M7.493 18.5c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.125c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.727a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507C2.28 19.482 3.105 20 3.994 20H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
                </svg>
              ) : (
                /* Outline when idle */
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.909m10.586-9.331-3.539 1.18a4.5 4.5 0 0 1-1.33.223M5.909 15.75a4.503 4.503 0 0 1-1.423.23H3.07M5.909 15.75H3.07m2.839 0a4.498 4.498 0 0 1-.43-1.956c0-.52.07-1.023.2-1.502m0 3.458H2.166a11.952 11.952 0 0 1-.832-4.398 12 12 0 0 1 .52-3.507C2.28 4.518 3.105 4 3.994 4H4.5" />
                </svg>
              )}
            </button>

            {/* 👎 Thumbs Down */}
            <button
              onClick={() => onFeedback && onFeedback(message.id, 'down')}
              className={`p-1.5 rounded-lg transition-all duration-200 ui-control ui-focus-ring ${
                feedback === 'down'
                  ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                  : `${darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-slate-700' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`
              }`}
              title={translate('feedback.notHelpful', 'Not helpful')}
              disabled={!!feedback}
            >
              {feedback === 'down' ? (
                /* Filled when active */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M15.73 5.5h1.035A7.465 7.465 0 0 1 18 9.625a7.465 7.465 0 0 1-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 0 1-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.499 4.499 0 0 0-.322 1.672v.633A.75.75 0 0 1 9 21a2.25 2.25 0 0 1-2.25-2.25 4.5 4.5 0 0 1 .571-2.183L7.5 15.75H5.25A2.25 2.25 0 0 1 3 13.5a2.25 2.25 0 0 1 .47-1.38l.21-.27A2.25 2.25 0 0 1 3 10.5a2.25 2.25 0 0 1 .345-1.22l.14-.22a2.25 2.25 0 0 1-.047-2.146A2.25 2.25 0 0 1 5.25 5.5h10.48ZM21.5 9.625a7.465 7.465 0 0 0-1.235-4.125H21a.75.75 0 0 1 .75.75v6.75a.75.75 0 0 1-.75.75h-.565a7.465 7.465 0 0 0 1.065-4.125Z" />
                </svg>
              ) : (
                /* Outline when idle */
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" />
                </svg>
              )}
            </button>

            {/* Speaker button - Hidden for Urdu (RTL) responses */}
            {ttsHook && !isRTL && (
            <button
              onClick={() => ttsHook.speak(text, message.id)}
              className={`p-1.5 rounded-lg transition-all duration-200 ui-control ui-focus-ring ${
                isThisSpeaking
                  ? 'text-blue-600 bg-blue-50 animate-pulse dark:bg-blue-900/30 dark:text-blue-400'
                  : `${darkMode ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-700' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`
              }`}
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
      {isUser && !compact && (
        <div className="w-7 h-7 rounded-full ml-2 mt-1 bg-gradient-to-br from-[#ea6645] to-[#c94f33] text-white text-xs font-bold flex items-center justify-center shrink-0">
          You
        </div>
      )}
    </div >
  );
}

// Optimization: Use React.memo with a custom comparison function
// to prevent re-rendering when parent state (like ChatInput message) changes.
const MemoizedChatMessage = memo(ChatMessage, (prev, next) => {
  // Only re-render if:
  // 1. Core message content or sender changed
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.text !== next.message.text) return false;
  if (prev.compact !== next.compact) return false;
  
  // 2. Feedback status changed
  if (prev.feedback !== next.feedback) return false;
  
  // 3. UI Context changed
  if (prev.isRTL !== next.isRTL) return false;

  // 4. THIS specific message's speaking status changed
  const prevIsSpeaking = prev.ttsHook?.speakingId === prev.message.id && prev.ttsHook?.isSpeaking;
  const nextIsSpeaking = next.ttsHook?.speakingId === next.message.id && next.ttsHook?.isSpeaking;
  if (prevIsSpeaking !== nextIsSpeaking) return false;

  // 5. Global TTS "isSpeaking" status changed (needed for the pulse animation if it was speaking)
  // Actually, point 4 covers the toggle. Let's add global speaking just to be safe for listener buttons.
  if (prev.ttsHook?.isSpeaking !== next.ttsHook?.isSpeaking) return false;

  return true; // props are effectively equal for rendering
});
MemoizedChatMessage.displayName = 'ChatMessage';

export default MemoizedChatMessage;
