"use client";
import React from "react";
import { useTheme } from "@/context/ThemeContext";

// ── Urdu Keyboard Layout ────────────────────────────────
const URDU_ROWS = [
  ['ا', 'آ', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ'],
  ['د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'س', 'ش', 'ص', 'ض'],
  ['ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن'],
  ['و', 'ہ', 'ھ', 'ء', 'ی', 'ے', 'ں', 'ؤ', 'ئ', '؟', '۔', '،'],
];

/**
 * Interactive on-screen Urdu keyboard.
 * @param {Function} onKeyPress - Called with the Urdu character when a key is clicked.
 * @param {Function} onBackspace - Called when backspace is clicked.
 * @param {Function} onClose - Called to dismiss the keyboard.
 */
export default function VirtualUrduKeyboard({ onKeyPress, onBackspace, onClose }) {
  const { darkMode } = useTheme();

  const keyBase = `min-w-[28px] h-9 sm:min-w-[34px] sm:h-10 px-1 rounded-lg text-sm sm:text-base font-semibold 
    transition-all duration-150 active:scale-95 select-none cursor-pointer 
    flex items-center justify-center border`;

  const keyStyle = darkMode
    ? `${keyBase} bg-slate-700 border-slate-600 text-gray-100 hover:bg-slate-600 active:bg-slate-500`
    : `${keyBase} bg-white border-gray-200 text-gray-800 hover:bg-gray-100 active:bg-gray-200 shadow-sm`;

  const specialKeyStyle = darkMode
    ? `${keyBase} bg-slate-600 border-slate-500 text-orange-300 hover:bg-slate-500`
    : `${keyBase} bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 shadow-sm`;

  return (
    <div
      className={`rounded-xl border p-2 sm:p-3 mb-2 transition-all duration-300 animate-fade-in-up ${
        darkMode
          ? "bg-slate-800/95 border-slate-700 shadow-xl"
          : "bg-gray-50/95 border-gray-200 shadow-lg"
      }`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span
          className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-gray-500"}`}
          style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
        >
          اردو کی بورڈ
        </span>
        <button
          onClick={onClose}
          className={`p-1 rounded-md transition-colors ${
            darkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          }`}
          title="Close keyboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* Character Rows */}
      {URDU_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex justify-center gap-1 mb-1">
          {row.map((char) => (
            <button
              key={`${rowIdx}-${char}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKeyPress(char)}
              className={keyStyle}
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}
            >
              {char}
            </button>
          ))}
        </div>
      ))}

      {/* Bottom Row: Space + Backspace */}
      <div className="flex justify-center gap-1 mt-1" dir="ltr">
        {/* Backspace */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onBackspace}
          className={specialKeyStyle + " min-w-[60px] sm:min-w-[72px]"}
          title="Backspace"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M7.22 3.22A.75.75 0 0 1 7.75 3h9A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17h-9a.75.75 0 0 1-.53-.22l-5.5-5.5a.75.75 0 0 1 0-1.06l5.5-5.5Zm3.56 2.56a.75.75 0 0 0-1.06 1.06L11.44 8.56 9.72 10.28a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06l-1.72-1.72 1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Space Bar */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onKeyPress(" ")}
          className={keyStyle + " flex-1 max-w-[200px] sm:max-w-[260px]"}
          title="Space"
        >
          <span className={`text-xs ${darkMode ? "text-slate-400" : "text-gray-400"}`}>Space</span>
        </button>
      </div>
    </div>
  );
}
