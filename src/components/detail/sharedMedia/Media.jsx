import "./media.css"
import { ArrowBack , PlayCircleOutline } from '@mui/icons-material';
import React, { useEffect, useState } from 'react'
import { CircularProgress } from '@mui/material';

const Media = ({callMediaComponent, callFilesComponent, setCallMediaComponent, 
                setCallFilesComponent, messages, theOtherUser, openSearch, 
                openAlertPopUp, setMediaViewer, openMediaViewer, incomingCall}) => {

    const [loader, setLoader] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoader(false)
        }, 1000)

        return () => {
            clearTimeout(timer);
        }
    }, [callMediaComponent, callFilesComponent])

    useEffect(() => {
        if (openSearch || openAlertPopUp || openMediaViewer || incomingCall){
            document.getElementById("main-media-container").classList.add("blur-background");
        }
        else{
            document.getElementById("main-media-container").classList.remove("blur-background"); 
        }
    }, [openSearch, openAlertPopUp, openMediaViewer, incomingCall])

  return (
    <div id="main-media-container" className="media-container">
        <div className="back-to-details-btn">
            <button className="styled-btn" onClick={() => {setCallMediaComponent(false)
                                                           setCallFilesComponent(false) 
            }}>
                <ArrowBack  style={{marginTop: "3px", fontSize: "25px"}} />
            </button>
            <h3>{callMediaComponent ? "Shared Media" : callFilesComponent && "Shared Files"}</h3>
        </div>

        {loader ? 
            <div className="loading-media">
                <CircularProgress />
            </div>
            :
            callMediaComponent ?
                <div className="medias">
                    {messages.filter(message => message.fileType === "image" || message.fileType === "video")
                        .map((message, i) => (
                            <div className="images-videos" key={i}>
                                {message.fileType === "image" ?
                                    <img src={message.fileUrl} alt="photoMessage" onClick={() => setMediaViewer(message)}/>
                                    :
                                    <div className="video" onClick={() => setMediaViewer(message)}>
                                        <span>
                                            <PlayCircleOutline className="icon" />
                                        </span>
                                        <video src={message.fileUrl}></video>
                                    </div>
                                }
                            </div>
                        )) 
                    }
                    {messages.filter(message => message.fileType === "image" || message.fileType === "video").length === 0 && (
                        <div className="noMedia">
                          <h3>No media</h3>
                          <p>{`Media that you exchange with ${theOtherUser?.firstName} will appear here.`}</p>
                        </div>
                    )}
                </div>
            :
            callFilesComponent &&
                <div className="files">
                    {messages.filter(message => message.fileType !== "image" && 
                                    message.fileType !== "video" && 
                                    message.fileType !== "voice" &&
                                    message.fileType !== "gif" &&  
                                    message.fileType !== undefined)
                        .map((message, i) => (
                            <div className="file" key={i}>
                                <p title={message.fileName}>
                                    {message.fileType === "pdf" || message.fileType === "document" ?
                                            <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                                                {message.fileName.length > 22 ? message.fileName.slice(0, 22) + "..." : message.fileName}
                                            </a>
                                        :
                                            message.fileType === "text" &&
                                            <a href={message.fileUrl} target="_blank" download>
                                               {message.fileName.length > 25 ? message.fileName.slice(0, 25) + "..." : message.fileName}
                                            </a>
                                    }
                                </p>
                            </div>
                        )) 
                    }
                    {messages.filter(message => message.fileType !== "image" && 
                                                message.fileType !== "video" &&
                                                message.fileType !== "voice" &&
                                                message.fileType !== "gif" &&  
                                                message.fileType !== undefined).length === 0 && (
                        <div className="noMedia">
                          <h3>No Files</h3>
                          <p>{`Files that you exchange with ${theOtherUser?.firstName} will appear here.`}</p>
                        </div>
                    )}
                </div>
            }
    </div>
  )
}

export default Media;