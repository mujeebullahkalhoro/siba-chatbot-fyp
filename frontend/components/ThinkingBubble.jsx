"use client";
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

const ThinkingBubble = () => {
    const { t } = useLanguage();
    const { darkMode } = useTheme();

    return (
        <div className="flex justify-start w-full animate-fade-in-up">
            <div
                className={`w-auto px-4 py-3 shadow-md rounded-t-xl rounded-br-xl flex items-center space-x-2 transition-colors duration-300
                    ${darkMode ? 'bg-slate-700 text-gray-200' : 'bg-gray-200 text-gray-800'}`}
            >
                <span className="text-sm font-medium">{t('thinking.text')}</span>
                <div className="flex space-x-1">
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                    <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-500'}`}></div>
                </div>
            </div>
        </div>
    );
};

export default ThinkingBubble;
