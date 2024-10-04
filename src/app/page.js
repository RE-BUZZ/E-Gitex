'use client';

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePrevious } from 'ahooks';
import { StartAvatarResponse } from "@heygen/streaming-avatar";
import StreamingAvatar, { AvatarQuality, StreamingEvents } from "@heygen/streaming-avatar";
import Loader from '@/assets/images/loader.gif';
import logo from '@/assets/images/e &.png';
import InteractiveAvatarAudioInput from "../component/common/InteractiveAvatarAudioInput.js";

export default function Home() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState();
  const [debug, setDebug] = useState();
  const [knowledgeId, setKnowledgeId] = useState("");
  const [avatarId, setAvatarId] = useState(process.env.NEXT_PUBLIC_AVATAR_ID);
  const [avatarName, setAvatarName] = useState(process.env.NEXT_PUBLIC_NAME);
  const [avatarRole, setAvatarRole] = useState(process.env.NEXT_PUBLIC_ROLE);
  const [data, setData] = useState();
  const [text, setText] = useState("");
  const [avatarStatus, setAvatarStatus] = useState(false);

  const mediaStream = useRef(null);
  const avatar = useRef(null);
  const [windowDimensions, setWindowDimensions] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial dimensions on page load
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures this effect is only run on mount and unmount

  // Function to fetch the access token from an API endpoint
  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", { method: "POST" });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }
    return "";
  }

  // Function to start the session and initialize the avatar
  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();
    avatar.current = new StreamingAvatar({ token: newToken });

    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e)
      setAvatarStatus(true);
    })

    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e)
      setAvatarStatus(false);
    });

    avatar.current.on(StreamingEvents.USER_TALKING_MESSAGE, (message) => {
      console.log('User talking message:', message);
      setText(message.detail.text);
      // Handle the user's message input to the avatar
    });

    avatar.current.on(StreamingEvents.USER_END_MESSAGE, (message) => {
      console.log('User end message:', message, text);
      handleSpeak(text);
      // Handle the end of the user's message, e.g., process the user's response
    });

    avatar.current.on(StreamingEvents.USER_START, (event) => {
      console.log('User has started interaction:', event);
      // Handle the start of the user's interaction, such as activating a listening indicator
    });

    avatar.current.on(StreamingEvents.USER_STOP, (event) => {
      console.log('User has stopped interaction:', event);
      // Handle the end of the user's interaction, such as deactivating a listening indicator
    });

    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, endSession);

    try {
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: avatarId,
        knowledgeId,
      });
      setData(res);
      localStorage.setItem("session_id", res?.session_id);
      avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
        setStream(event.detail);
        setIsLoadingSession(false);
      });
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setIsLoadingSession(false);
    }
  }

  // Function to handle avatar speaking based on provided text
  async function handleSpeak(speech) {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      setIsLoadingRepeat(false);
      return;
    }

    const sessionId = localStorage.getItem('session_id') || data?.session_id;
    if (!speech) {
      setDebug("No text provided for avatar to speak");
      setIsLoadingRepeat(false);
      return;
    }

    try {
      await avatar.current.speak({ text: speech, sessionId });
    } catch (e) {
      setDebug(e.message);
    } finally {
      setIsLoadingRepeat(false);
    }
  }

  // Function to interrupt avatar
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    try {
      await avatar.current.interrupt({ sessionId: data?.session_id });
    } catch (e) {
      setDebug(e.message);
    }
  }

  // Function to end the avatar session
  async function endSession() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.stopAvatar({ sessionId: data?.session_id });
    setStream(undefined);
  }

  const previousText = usePrevious(text);

  // Effect to manage avatar listening state based on text input changes
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening({ sessionId: data?.session_id });
    } else if (previousText && !text) {
      avatar.current?.stopListening({ sessionId: data?.session_id });
    }
  }, [text, previousText]);

  // Clean up session on component unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);


  // Effect to update the media stream when a new stream is set
  useEffect(() => {
    if (stream && mediaStream.current) {
      console.log("stream", stream);
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current.play();
        setDebug("Playing");
      };
    }
  }, [stream]);

  // Start and stop listening functions
  const startListening = () => avatar.current?.startListening({ sessionId: data?.session_id });
  const stopListening = () => avatar.current?.stopListening({ sessionId: localStorage.getItem('session_id') || data?.session_id });
  const avatarInterrupt = () => {
    try {
        const sessionId = localStorage.getItem('session_id') || data?.session_id;
        if (!sessionId) {
            // throw new Error('Session ID is missing');
            console.error("Session ID is missing");
        }

        // Ensure avatar and its current reference exist before calling interrupt
        if (avatar?.current) {
          // console.log("Avatar interrupted successfully.", avatar?.current, sessionId);
          //   // avatar?.current?.interrupt({ sessionId });
          //   console.log("Avatar interrupted successfully.");
        } else {
            // throw new Error('Avatar reference is undefined or null');
            console.error("Avatar reference is undefined or null'");
        }
    } catch (error) {
        console.error("Failed to interrupt avatar:");
    }
};

  return (
    <div className="_main_wraper" style={{ width: windowDimensions.width, height: windowDimensions.height }}>
      {stream ? (<div className="_main_wraper_container">
        <video ref={mediaStream} autoPlay playsInline style={{ height: "98%" }}>
          <track kind="captions" />
        </video>
        <div className="_logo"><Image src={logo} alt="logo" /></div>
        <div className="_lets_talk">
          <InteractiveAvatarAudioInput avatarInterrupt={avatarInterrupt} avatar={avatar.current} startListening={startListening} stopListening={stopListening} onSubmit={handleSpeak} input={text} setInput={setText} loading={isLoadingRepeat} disabled={!stream} avatarStatus={avatarStatus} />
        </div>

        <div className="_intero_parent">
          <h6>{avatarName}</h6>
          <p>{avatarRole}</p>
        </div>
      </div>) :
        !isLoadingSession ? (
          <div className="session_btn">
            <button onClick={startSession} className="_start_session" variant="shadow">
              Start session
            </button>
          </div>
        ) :
          <div className="_loader"></div>
      }
    </div>
  );
}
