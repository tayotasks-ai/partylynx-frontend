import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file on the client-side before uploading.
 * Targets maximum file size under 1MB and a max dimension of 1600px.
 * Falls back to the original file if compression fails.
 * 
 * @param file - The original file captured from the input
 * @returns A Promise resolving to the compressed File
 */
export async function compressPhoto(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.8, // Target size under 800KB
    maxWidthOrHeight: 1600, // Max width/height 1600px for speedy uploads
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    return compressedFile;
  } catch (error) {
    console.error('Client-side compression failed, uploading original file:', error);
    return file;
  }
}
