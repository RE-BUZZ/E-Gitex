import axios from 'axios';
import { blobToBase64 } from './blobToBase64'; // Import the blobToBase64 function


export const processSpeech = async (audioBlob, browserState, onSubmit, setInput, stopRecording) => {
    try {
        console.log("Processing speech", audioBlob, browserState, onSubmit, setInput, stopRecording);
        // Send the request with the appropriate headers for urlencoded form data
        const formData = new FormData();
        formData.append('audioBlob', audioBlob); // Assuming audioBlob is a Blob or File
        formData.append('browserState', JSON.stringify(browserState)); // Add browserState as a string

        const response = await fetch('/api/google-api', {
            method: 'POST',
            body: formData,
        });
        console.log("response__________________", response)
        if (!response.ok) {
            throw new Error('Failed to fetch');
        }

        const text = await response.text();

        console.log("textttttttttttttttttttttttttttttttttt", text)
        // const data = await response.json();
        // const { transcript } = data;

        if (text) {
            await onSubmit(text);
            setInput('');
        } else {
            stopRecording();
        }
    } catch (error) {
        console.error("Failed to process speech via OpenAI:", error);
        stopRecording();
    }
};


// Function to process speech via Google Speech API
// export const processSpeech = async (audioBlob, browserState, onSubmit, setInput, stopRecording) => {
//     try {
//         const audioContent = await blobToBase64(audioBlob);
//         if (audioContent) {
//             const config = {
//                 encoding: 'WEBM_OPUS',
//                 languageCode: 'en-US',
//                 ...(browserState === 1 && { sampleRateHertz: 48000, audioChannelCount: 2 }), // Adjust for Firefox
//             };
//             const response = await axios.post(`https://speech.googleapis.com/v1/speech:recognize?key=${process.env.NEXT_PUBLIC_GOOGLE_SPEECH_API_KEY}`, {
//                 config,
//                 audio: { content: audioContent },
//             });
//             const transcript = response?.data?.results?.[0]?.alternatives?.[0]?.transcript;
//             if (transcript) {
//                 await onSubmit(transcript);
//                 setInput('');
//             } else {
//                 stopRecording();
//             }
//         }
//     } catch (error) {
//         console.error("Failed to process speech:", error);
//         stopRecording(); // Reset the state in case of an error
//     }
// };
