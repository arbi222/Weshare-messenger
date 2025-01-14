import { storage } from "./firebase";
import { getDownloadURL, ref,  uploadBytesResumable } from "firebase/storage";

const upload = async (file, onProgress) =>{

    const date = new Date()
    const storageRef = ref(storage, `weshareMessenger/${date + file.name}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress){
              onProgress(progress);
            }
          }, 
          (error) => {
            reject("Something went wrong!" + error.code)
          }, 
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              resolve(downloadURL);
            });
          }
        );
    })
}

export default upload;