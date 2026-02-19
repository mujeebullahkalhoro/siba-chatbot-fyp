import React from 'react';

const ThinkingBubble = () => {
    return (
        <div className="flex justify-start w-full animate-fade-in-up">
            <div className="w-auto px-4 py-3 shadow-md bg-gray-200 rounded-t-xl rounded-br-xl text-gray-800 flex items-center space-x-2">
                <span className="text-sm font-medium">Thinking</span>
                <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                </div>
            </div>
        </div>
    );
};

export default ThinkingBubble;
