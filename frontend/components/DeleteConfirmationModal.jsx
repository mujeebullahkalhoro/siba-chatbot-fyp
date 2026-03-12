"use client";
import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm }) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm transform transition-all scale-100 opacity-100"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                        <Trash2 className="w-6 h-6 text-red-600" />
                    </div>

                    <h3 className="mb-2 text-lg font-semibold text-center text-gray-900" id="modal-title">
                        {t('delete.title')}
                    </h3>

                    <p className="text-sm text-center text-gray-500 mb-6">
                        {t('delete.message')}
                    </p>

                    <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                        >
                            {t('delete.cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm"
                        >
                            {t('delete.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
