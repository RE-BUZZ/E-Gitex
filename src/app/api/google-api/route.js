import axios from 'axios';

export async function POST(req) {
    try {
        console.log("Processing audio request with Google Speech API");

        // Parse incoming multipart form data
        const formData = await req.formData();

        // Extract the audioBlob and browserState from the formData
        const audioBlob = formData.get('audioBlob');
        const browserState = formData.get('browserState') ? JSON.parse(formData.get('browserState')) : null;

        if (!audioBlob) {
            return new Response("Missing audioBlob", { status: 400 });
        }

        // Convert the Blob to ArrayBuffer, then to Base64
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioContent = Buffer.from(audioBuffer).toString('base64');;

        // Configure audio settings based on browserState
        if (audioContent) {
            const config = {
                encoding: 'WEBM_OPUS',
                languageCode: 'en-US',
                ...(browserState === 1 && { sampleRateHertz: 48000, audioChannelCount: 2 }), // Adjust for Firefox
            };

            // Send request to Google Speech-to-Text API
            const googleApiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_SPEECH_API_KEY}`;
            const response = await axios.post(googleApiUrl, {
                config,
                audio: { content: audioContent },
            });

            // Extract transcription result
            const transcript = response?.data?.results?.[0]?.alternatives?.[0]?.transcript;

            if (transcript) {
                console.log("Transcription result:", transcript);
                return new Response(JSON.stringify(transcript), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } else {
                // return new Response("No transcription available", { status: 204 });
                return new Response("", { status: 200 });
            }
        } else {
            // return new Response("No transcription available", { status: 204 });
            return new Response("", { status: 200 });
        }


    } catch (error) {
        console.error('Error during transcription:', error.response?.data || error.message);
        // return new Response("Internal server error", { status: 500 });
        return new Response("", { status: 200 });
    }
}
