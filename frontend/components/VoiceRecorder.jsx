"use client";
import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const sibaOrange = "#ea6645";

// Helper to draw a simple waveform animation
function AudioVisualizer({ stream }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 128;
        source.connect(analyzer);

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext("2d");

        let animationId;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyzer.getByteFrequencyData(dataArray);

            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            const sliceWidth = canvas.width / bufferLength;
            const barWidth = 3; // Fixed thinner width
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 2.5; // Scale height slightly
                canvasCtx.fillStyle = `#3b82f6`;

                // Draw bars centered vertically
                // Calculate position to center the bar within its "slice"
                const xPos = x + (sliceWidth - barWidth) / 2;
                const yPos = (canvas.height - barHeight) / 2;

                // RoundRect for smoother look (if supported) or just fillRect
                if (canvasCtx.roundRect) {
                    canvasCtx.beginPath();
                    canvasCtx.roundRect(xPos, yPos, barWidth, barHeight, [2]);
                    canvasCtx.fill();
                } else {
                    canvasCtx.fillRect(xPos, yPos, barWidth, barHeight);
                }

                x += sliceWidth;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            audioCtx.close();
        };
    }, [stream]);

    return <canvas ref={canvasRef} width={300} height={60} className="w-full h-full" />;
}

export default function VoiceRecorder({ onTranscription, onClose }) {
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const { t } = useLanguage();
    const { darkMode } = useTheme();

    useEffect(() => {
        startRecording();
        return () => stopStream();
    }, []);

    const startRecording = async () => {
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(audioStream);
            setIsRecording(true);

            const mediaRecorder = new MediaRecorder(audioStream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert(t('voice.micError'));
            onClose();
        }
    };

    const stopStream = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
    };

    const handleSubmit = async () => {
        if (!mediaRecorderRef.current) return;

        // Use a promise to wait for the stop event
        new Promise((resolve) => {
            mediaRecorderRef.current.onstop = resolve;
            mediaRecorderRef.current.stop();
        }).then(async () => {
            stopStream();
            setIsRecording(false);

            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp4" });

            const formData = new FormData();
            formData.append("file", audioBlob, "recording.m4a");

            try {
                const response = await fetch(`${API_BASE}/api/transcribe`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) throw new Error("Transcription failed");

                const data = await response.json();
                onTranscription(data.text);
            } catch (err) {
                console.error("Transcription error:", err);
                alert(t('voice.transcribeError'));
                onClose(); // Close on error
            }
        });
    };

    return (
        <div className={`flex items-center w-full h-[50px] backdrop-blur-md rounded-full px-4 shadow-xl border transition-all duration-300 animate-in fade-in zoom-in-95
            ${darkMode
                ? 'bg-slate-800 bg-opacity-95 border-slate-700'
                : 'bg-white bg-opacity-90 border-blue-100'}`}>

            {/* Microphone Icon (Left) */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-500 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                    <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
                </svg>
            </div>

            {/* Visualizer Area (Center, Fills space) */}
            <div className="flex-1 h-10 mx-4 overflow-hidden flex items-center justify-center">
                {isRecording ? (
                    <AudioVisualizer stream={stream} />
                ) : (
                    <span className={`text-sm font-medium animate-pulse ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{t('voice.listening')}</span>
                )}
            </div>

            <div className="flex items-center space-x-3">
                {/* Cancel Icon (Cross) */}
                <button
                    onClick={onClose}
                    className={`group flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200
                        ${darkMode
                            ? 'bg-slate-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400'
                            : 'bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500'}`}
                    title={t('voice.cancel')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Submit Icon (Check) */}
                <button
                    onClick={handleSubmit}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 transition-transform duration-200 hover:scale-105 shadow-md"
                    title={t('voice.submit')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
