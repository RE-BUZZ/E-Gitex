export const processSpeech = async (audioBlob, browserState, onSubmit, setInput, stopRecording) => {
    try {
        console.log("Processing speech", audioBlob, browserState, onSubmit, setInput, stopRecording);
        // Send the request with the appropriate headers for urlencoded form data
        const formData = new FormData();
        formData.append('audioBlob', audioBlob); // Assuming audioBlob is a Blob or File
        formData.append('browserState', JSON.stringify(browserState)); // Add browserState as a string

        const response = await fetch('/api/open-ai-api', {
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
