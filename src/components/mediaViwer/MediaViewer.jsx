import React from 'react'
import "./mediaViewer.css"
import { Clear } from '@mui/icons-material';

const MediaViewer = ({setMediaViewer, openMediaViewer: message, incomingCall}) => {

    if (!message.fileUrl){
        setMediaViewer(false)
        return;
    }

  return (
    <div className={incomingCall ? 'media-viewer-popUp blur-background' : 'media-viewer-popUp'}>
        <div className='close-btn styled-btn'>
            <button onClick={() => setMediaViewer(false)} title='Close'>
                <Clear style={{marginTop: "2px"}}/>
            </button>
        </div>

        <div className='media-center'>
            {message.fileType === "image" && 
                <img src={message.fileUrl} alt="message photo" /> 
            }
            {message.fileType === "video" && 
                <video src={message.fileUrl} controls alt="video message" />
            }
        </div>
    </div>
  )
}

export default MediaViewer;
