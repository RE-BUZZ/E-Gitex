export async function POST(req) {
  try {
    // Parse incoming multipart form data
    const formData = await req.formData();

    // Extract the audioBlob (binary file) and browserState (JSON string)
    const audioBlob = formData.get('audioBlob'); // Extract the file
    const browserState = formData.get('browserState'); // Extract browserState (likely a string)

    // Convert audioBlob to an ArrayBuffer (which is needed for binary data processing)
    const audioBuffer = await audioBlob.arrayBuffer();

    // Convert ArrayBuffer to a Blob and append it to new FormData
    const formDataToSend = new FormData();
    formDataToSend.append('file', new Blob([audioBuffer]), 'audio.webm'); // Convert to Blob for sending
    formDataToSend.append('model', 'whisper-1');

    // Send the request to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // OpenAI API Key from environment variables
      },
      body: formDataToSend, // Send the FormData with audio and model
    });

    // Parse the response from OpenAI API
    const data = await response.json();
    console.log('Transcription result:', data?.text);

    // Return the transcription data to the client
    return new Response(data?.text, {
      status: 200,
    });
  } catch (error) {
    console.error('Error during transcription:', error);
    // return new Response("Invalid request", {
    //   status: 500,
    // });
    return new Response("", { status: 200 });
  }
}
