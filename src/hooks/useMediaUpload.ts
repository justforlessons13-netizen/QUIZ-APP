import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useState } from "react";

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadMedia = async (file: File, packId: string) => {
    setUploading(true);
    try {
      // 1. Get the storage instance
      const storage = getStorage();
      
      // 2. Define the path: question-packs / {packId} / {timestamp}-{filename}
      // This keeps files organized by quiz pack
      const path = `question-packs/${packId}/${Date.now()}-${file.name}`;
      const fileRef = ref(storage, path);
      
      // 3. Upload the file
      await uploadBytes(fileRef, file);
      
      // 4. Get the public URL to save in your database
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadMedia, uploading };
}