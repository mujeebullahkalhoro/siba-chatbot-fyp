"use client";
import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';

export default function ShareModal({ isOpen, onClose, shareUrl }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy keys: ', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md transform transition-all scale-100 opacity-100"
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-modal-title"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center" id="share-modal-title">
                            <Share2 className="w-5 h-5 mr-2 text-blue-600" />
                            Share Chat
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 mb-6">
                        Anyone with this link will be able to view this chat session.
                    </p>

                    <div className="relative flex items-center mb-4">
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="w-full pl-4 pr-12 py-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                            onClick={handleCopy}
                            className="absolute right-2 p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-white"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
