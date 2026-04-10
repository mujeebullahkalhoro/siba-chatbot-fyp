import React, { memo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

const ThinkingBubble = memo(() => {
    const { t, isRTL } = useLanguage();
    const { darkMode } = useTheme();

    return (
        <div className="flex justify-start w-full animate-fade-in-up" dir={isRTL ? 'rtl' : 'ltr'}>
            <div
                className={`w-auto px-4 py-3 shadow-md flex items-center transition-colors duration-300 ui-card ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}
                    ${darkMode ? 'bg-slate-700 text-gray-200 border border-slate-600/70' : 'bg-[color:var(--surface-soft)] border border-[color:var(--border-soft)] text-gray-800'}
                    rounded-t-xl ${isRTL ? 'rounded-bl-xl' : 'rounded-br-xl'}`}
            >
                <span className="text-sm font-medium">{t('thinking.text')}</span>
                <div className={`flex ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-gentle-pulse [animation-delay:-0.3s] ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full animate-gentle-pulse [animation-delay:-0.15s] ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full animate-gentle-pulse ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                </div>
            </div>
        </div>
    );
});
ThinkingBubble.displayName = 'ThinkingBubble';

export default ThinkingBubble;
