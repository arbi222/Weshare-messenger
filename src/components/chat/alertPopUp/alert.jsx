import React, { useEffect } from 'react'
import "./alert.css"

const Alert = ({openAlertPopUp, setAlertOpenPopUp, maxUploadingSize, incomingCall}) => {

  useEffect(() => {
        if (incomingCall){
            document.getElementById("alert").classList.add("blur-background");
        }
        else{
            document.getElementById("alert").classList.remove("blur-background");
        }
  }, [incomingCall])

  const renderAlertContent = () => {
    switch (openAlertPopUp) {
      case "deviceNotFound":
        return (
          <>
            <h2>Access denied!</h2>
            <p>Requested device is not found. Ensure it is connected to your platform.</p>
          </>
        );
  
      case "deviceNotAllowed":
        return (
          <>
            <h2>Access denied!</h2>
            <p>
              You have dismissed the permission to access the camera or microphone. <br />
              Please allow access to proceed with the call.
            </p>
          </>
        );
  
      case "Microphone":
        return (
          <>
            <h2>Microphone access denied!</h2>
            <p>Requested device is not found. Ensure your microphone is connected to your platform.</p>
          </>
        );
  
      case "noUserConv":
        return (
          <>
            <h2>Couldn't get the conversation!</h2>
            <p>Requested conversation is not found. Ensure that the user ID provided in the link is correct.</p>
          </>
        );
  
      default:
        return (
          <>
            <h2>Failed to upload file!</h2>
            <p>The file you have selected is too large. The maximum allowed size is {maxUploadingSize}MB.</p>
          </>
        );
    }
  };

  return (
    <div id="alert" className="alert-popUp">
      {renderAlertContent()}
      <button className="styled-btn" type="button" onClick={() => setAlertOpenPopUp(false)}>
        Close
      </button>
    </div>
  );
}

export default Alert;