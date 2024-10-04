'use client';
import { useState, useEffect, useRef } from 'react';
import { StreamingEvents } from "@heygen/streaming-avatar";

export default function InteractiveAvatarAudioInput({
    input,
    onSubmit,
    setInput,
    endContent,
    startListening,
    stopListening,
    disabled = false,
    loading = false,
    avatarStatus = false,
}) {
    const [isListening, setIsListening] = useState(false);
    const [speechRecognition, setSpeechRecognition] = useState(null);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);
    const avatarRef = useRef(null);

    useEffect(() => {
        if (!avatarRef.current) return;

        const handleAvatarStartTalking = (e) => {
            console.log("Avatar started talking audio", e);
            if (speechRecognition) {
                console.log("Recognition active:", isRecognitionActive);
                speechRecognition.stop();
            }
        };

        const handleAvatarStopTalking = (e) => {
            console.log("Avatar stopped talking audio", e);
            if (speechRecognition && !isRecognitionActive) {
                speechRecognition.start();
            }
        };

        avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, handleAvatarStartTalking);
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, handleAvatarStopTalking);

        // Clean up event listeners
        return () => {
            avatarRef.current.off(StreamingEvents.AVATAR_START_TALKING, handleAvatarStartTalking);
            avatarRef.current.off(StreamingEvents.AVATAR_STOP_TALKING, handleAvatarStopTalking);
        };
    }, [speechRecognition, isRecognitionActive]);

    useEffect(() => {
        initializeSpeechRecognition();
    }, []);

    const initializeSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = false;
            recognitionInstance.lang = 'en-US';
            recognitionInstance.interimResults = false;
            recognitionInstance.maxAlternatives = 1;

            recognitionInstance.onresult = handleSpeechResult;
            recognitionInstance.onerror = handleSpeechError;

            setSpeechRecognition(recognitionInstance);
        } else {
            console.error('Speech recognition not supported in this browser.');
        }
    };

    const handleSpeechResult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log(`Transcript: ${transcript}`);
        processSpeech(transcript);
    };

    const handleSpeechError = (event) => {
        console.error("Speech recognition error:", event);
        setIsListening(false);
    };

    const startListeningTask = () => {
        if (speechRecognition) {
            setIsListening(true);
            setIsRecognitionActive(true);
            startListening();
            speechRecognition.start();
        }
    };

    const processSpeech = async (speech) => {
        console.log("Processing speech:", speech);

        try {
            await onSubmit(speech);
            setInput('');
        } catch (error) {
            console.error("Failed to submit speech:", error);
        }

        setIsListening(false);
        setIsRecognitionActive(false);
        stopListening();
    };

    const stopListeningTask = () => {
        if (speechRecognition) {
            setIsListening(false);
            setIsRecognitionActive(false);
            stopListening();
            speechRecognition.stop();
        }
    };

    return (
        <div>
            <button
                className="_talbtn"
                onClick={isListening ? stopListeningTask : startListeningTask}
                disabled={loading || disabled || avatarStatus}
            >
                {isListening ? 'Stop Listening' : "Let's Talk"}
            </button>
            {endContent && <div>{endContent}</div>}
        </div>
    );
}
