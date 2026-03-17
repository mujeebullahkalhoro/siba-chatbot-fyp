"use client";
import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Browser-based Text-to-Speech hook supporting English and Urdu.
 * Uses the Web SpeechSynthesis API (no external APIs needed).
 */
export default function useTTS() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingId, setSpeakingId] = useState(null);
    const utteranceRef = useRef(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis?.cancel();
        };
    }, []);

    /**
     * Detect language of text for TTS voice selection.
     * Returns BCP-47 language tag.
     */
    const detectLang = useCallback((text) => {
        // Check for Urdu script characters
        const urduChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
        if (urduChars > 2) return "ur";

        return "en-US";
    }, []);

    /**
     * Strip markdown formatting for cleaner speech.
     */
    const cleanForSpeech = useCallback((text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, "$1")     // bold
            .replace(/\*(.*?)\*/g, "$1")          // italic
            .replace(/#{1,6}\s/g, "")             // headings
            .replace(/\[(.*?)\]\(.*?\)/g, "$1")   // links
            .replace(/`{1,3}[^`]*`{1,3}/g, "")   // code
            .replace(/\|[^\n]*\|/g, "")           // tables
            .replace(/[-*+]\s/g, "")              // list markers
            .replace(/\n{2,}/g, ". ")             // double newlines → pause
            .replace(/\n/g, " ")                  // single newlines
            .trim();
    }, []);

    /**
     * Speak the given text. If already speaking this msgId, stop instead.
     */
    const speak = useCallback((text, msgId = null) => {
        const synth = window.speechSynthesis;
        if (!synth) return;

        // Toggle off if same message
        if (isSpeaking && speakingId === msgId) {
            synth.cancel();
            setIsSpeaking(false);
            setSpeakingId(null);
            return;
        }

        // Cancel any current speech
        synth.cancel();

        const cleaned = cleanForSpeech(text);
        if (!cleaned) return;

        const lang = detectLang(text);
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find a matching voice
        const voices = synth.getVoices();
        const matchingVoice = voices.find(v => v.lang.startsWith(lang.split("-")[0]));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            setSpeakingId(msgId);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setSpeakingId(null);
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            setSpeakingId(null);
        };

        utteranceRef.current = utterance;
        synth.speak(utterance);
    }, [isSpeaking, speakingId, cleanForSpeech, detectLang]);

    /**
     * Stop speaking immediately.
     */
    const stop = useCallback(() => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        setSpeakingId(null);
    }, []);

    return { speak, stop, isSpeaking, speakingId };
}
