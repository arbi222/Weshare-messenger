import { storage } from "./firebase";
import { ref, deleteObject } from "firebase/storage";

const deleteFileByURL = async (downloadURL) => {
  try {
    // Extract the file path from the URL
    const decodedPath = decodeURIComponent(downloadURL.split("/o/")[1].split("?")[0]);

    const fileRef = ref(storage, decodedPath);

    await deleteObject(fileRef);

    return "File deleted successfully!";
  } catch (error) {
    throw new Error("Error deleting file: " + error.message);
  }
};

export default deleteFileByURL;