"use client";
import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm }) {
    const { t } = useLanguage();
    const { darkMode } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div
                className={`rounded-2xl shadow-xl w-full max-w-sm transform transition-all scale-100 opacity-100
                    ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="p-6">
                    <div className={`flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full ${darkMode ? 'bg-red-900/40' : 'bg-red-100'}`}>
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>

                    <h3 className={`mb-2 text-lg font-semibold text-center ${darkMode ? 'text-white' : 'text-gray-900'}`} id="modal-title">
                        {t('delete.title')}
                    </h3>

                    <p className={`text-sm text-center mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('delete.message')}
                    </p>

                    <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                        <button
                            onClick={onClose}
                            className={`w-full px-4 py-2 text-sm font-medium rounded-lg border focus:outline-none transition-colors
                                ${darkMode
                                    ? 'text-gray-300 bg-slate-700 border-slate-600 hover:bg-slate-600'
                                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}`}
                        >
                            {t('delete.cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none transition-colors shadow-sm"
                        >
                            {t('delete.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
