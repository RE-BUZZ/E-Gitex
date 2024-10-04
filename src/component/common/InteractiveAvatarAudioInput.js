import { useState, useEffect, useRef } from 'react';
import { StreamingEvents } from "@heygen/streaming-avatar";
import Bowser from 'bowser';
import { processSpeech } from '../service/googleapi'; 
// import { processSpeech } from '../service/openai'; 

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
    avatar,
    avatarInterrupt
}) {
    const [isListening, setIsListening] = useState(false);
    const [isAudioConnect, setIsAudioConnect] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [audioContext, setAudioContext] = useState(null);
    const [browserState, setBrowserState] = useState(0);
    const [isPleaseWait, setIsPleaseWait] = useState(false);

    const mediaRecorderRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    const avatarRef = useRef(avatar);
    const [audioChunks, setAudioChunks] = useState([]);

    useEffect(() => {
        const detectBrowser = () => {
            const browser = Bowser.getParser(window.navigator.userAgent);
            const browserName = browser.getBrowserName();

            if (['Chrome', 'Edge', 'Safari'].includes(browserName)) {
                setBrowserState(0);
            } else {
                setBrowserState(1); // Handle Firefox and others
            }
        };
        detectBrowser();
    }, []);

    const setupAudioProcessing = (stream, silenceTimeout) => {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(context);
        const analyser = context.createAnalyser();
        const source = context.createMediaStreamSource(stream);
        const scriptProcessor = context.createScriptProcessor(2048, 1, 1);

        analyser.fftSize = 1024;
        source.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(context.destination);

        scriptProcessor.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            const averageVolume = array.reduce((acc, val) => acc + val, 0) / array.length;
            setVolumeLevel(averageVolume);

            if (averageVolume > 20) {
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = setTimeout(() => stopRecording(), silenceTimeout);
            }
        };
    };

    const startListeningTask = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            setIsListening(true);
            setAudioChunks([]);

            recorder.ondataavailable = async (event) => {
                setAudioChunks((prevChunks) => [...prevChunks, event.data]);
                if(event.data)
                await processSpeech(event.data, browserState, onSubmit, setInput, stopRecording);
            };

            setupAudioProcessing(stream, 500);
            recorder.start();
            if (!isAudioConnect) await audioConnection(stream);
        } catch (error) {
            console.error("Error accessing the microphone", error);
            setIsListening(false);
        }
    };

    const audioConnection = (stream) => {
        setupAudioProcessing(stream, 1000);
        setIsAudioConnect(true);
    };

    const stopRecording = async () => {
        clearTimeout(silenceTimeoutRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        resetState();
    };

    const resetState = () => {
        setIsListening(false);
        setIsAudioConnect(false);
        if (audioContext) audioContext.close();
        setAudioContext(null);
        avatarInterrupt();
    };

    useEffect(() => {
        if (!avatarRef.current) return;

        const handleAvatarStartTalking = () => setIsPleaseWait(true);
        const handleAvatarStopTalking = () => {
            setIsPleaseWait(false);
            startListeningTask();
        };

        avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, handleAvatarStartTalking);
        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, handleAvatarStopTalking);

        return () => {
            avatarRef.current.off(StreamingEvents.AVATAR_START_TALKING, handleAvatarStartTalking);
            avatarRef.current.off(StreamingEvents.AVATAR_STOP_TALKING, handleAvatarStopTalking);
        };
    }, [isListening]);

    return (
        <div>
            <button
                className={`${isListening ? 'talbtn' : (isPleaseWait ? 'talbtn1' : '_talbtn')}`}
                onClick={isListening ? stopRecording : (isPleaseWait ? () => { } : startListeningTask)}
                disabled={loading || disabled || avatarStatus || isPleaseWait}
            >
                {isListening ? 'Stop Listening' : (isPleaseWait ? "Please Wait" : "Let's Talk")}
            </button>
            {endContent && <div>{endContent}</div>}
        </div>
    );
}
