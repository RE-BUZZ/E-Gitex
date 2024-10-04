function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]); // Get Base64 part after the comma
    reader.onerror = reject;
    reader.readAsDataURL(blob); // Read the blob as a Data URL (Base64 string)
  });
}
