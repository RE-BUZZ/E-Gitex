import { useState, useEffect, useRef } from 'react';
import { StreamingEvents } from "@heygen/streaming-avatar";
import axios from 'axios';

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
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const avatarRef = useRef(null);
    const GOOGLE_SPEECH_API_KEY = 'AIzaSyDevsjZsXAJtL11UVkWSyZU79WiDNt4lAk'; // Replace with your API key

    useEffect(() => {
        if (!avatarRef.current) return;

        const handleAvatarStartTalking = (e) => {
            console.log("Avatar started talking audio", e);
            if (mediaRecorder) {
                mediaRecorder.stop();
            }
        };

        const handleAvatarStopTalking = (e) => {
            console.log("Avatar stopped talking audio", e);
            if (mediaRecorder && !isListening) {
                startListeningTask();
            }
        };

        avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, handleAvatarStartTalking);
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, handleAvatarStopTalking);

        // Clean up event listeners
        return () => {
            avatarRef.current.off(StreamingEvents.AVATAR_START_TALKING, handleAvatarStartTalking);
            avatarRef.current.off(StreamingEvents.AVATAR_STOP_TALKING, handleAvatarStopTalking);
        };
    }, [mediaRecorder, isListening]);

    const startListeningTask = () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const recorder = new MediaRecorder(stream);
                setMediaRecorder(recorder);
                setIsListening(true);
                setAudioChunks([]);

                recorder.ondataavailable = (event) => {
                    setAudioChunks(prevChunks => [...prevChunks, event.data]);
                };

                recorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    processSpeech(audioBlob);
                };

                recorder.start();
            })
            .catch(error => {
                console.error("Error accessing the microphone", error);
                setIsListening(false);
            });
    };

    const processSpeech = async (audioBlob) => {
        try {
            const audioContent = await blobToBase64(audioBlob);
            const response = await axios.post(`https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_API_KEY}`, {
                config: {
                    encoding: 'WEBM_OPUS', // Specify the correct encoding
                    languageCode: 'en-US',
                },
                audio: {
                    content: audioContent,
                },
            });
    
            const transcript = response.data.results[0].alternatives[0].transcript;
            console.log(`Transcript: ${transcript}`);
            await onSubmit(transcript);
            setInput('');
        } catch (error) {
            console.error("Failed to submit speech:", error);
        } finally {
            setIsListening(false);
            stopListening();
        }
    };
    

    const stopListeningTask = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        setIsListening(false);
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                resolve(base64data);
            };
            reader.onerror = error => reject(error);
        });
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
