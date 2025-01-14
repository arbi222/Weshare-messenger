import "./callPage.css"
import React, { useEffect, useState, useRef } from 'react';
import { useUserStore } from "../../../lib/userStore";
import { axiosJWT } from "../../../lib/axiosJWT";
import { Call, CallEnd, Mic, MicOff, Videocam, VideocamOff, Close } from '@mui/icons-material';
import playSound from "../../../lib/sounds";
import { toast } from "react-toastify";

const CallPage = ({calleeId, callType, weCalling, setWeCalling, isCallAccepted,
                  setIsCallAccepted, mediaStreamRef,
                  remoteMediaStream, setRemoteMediaStream, peerConnectionRef, 
                  callSoundRef, busyLineSoundRef, notCallingStatus, setNotCallingStatus, 
                  handleCall, hideRemoteCamera, setHideRemoteCamera, cameraEnabled, setCameraEnabled,
                  setMessages, conversations, setConversations, setHaveSeenMessage, setHaveSeenIndicator, 
                  chatId, getConversations, selectedConv, isInCallRef}) => {

    const {currentUser, accessToken, socket} = useUserStore();
    const apiUrl = import.meta.env.VITE_API_URL;

    const [callDuration, setCallDuration] = useState(0);

    useEffect(() => {
      let timer;

      if (isCallAccepted === true){
        timer = setInterval(() => {
          setCallDuration((prev) => prev + 1); 
        }, 1000);
      }

      if (isCallAccepted === null){
        clearInterval(timer);
      }
    }, [isCallAccepted])

    const hours = Math.floor(callDuration / 3600);
    const minutes = Math.floor((callDuration % 3600) / 60);
    const seconds = callDuration % 60;

    const [micEnabled, setMicEnabled] = useState(false);
    
    useEffect(() => {
      if (callType === "video"){
        setCameraEnabled(true);
        setMicEnabled(true);
      }
      else{
        setMicEnabled(true);
      }
    }, [callType])
    
    const [theOtherUser, setTheOtherUser] = useState(null);
    useEffect(() => {
        const getCaller = async () => {
            try{
                const res = await axiosJWT.get(`${apiUrl}/api/users/getUser/${calleeId}/` + currentUser._id, {
                    headers: {
                        authorization: `Bearer ${accessToken}`,
                    },
                });
                setTheOtherUser(res.data);
            }
            catch(err){
                toast.error("Could not get the user's data!")
            }
        }
        getCaller();
    }, [calleeId])

    useEffect(() => {
        if (weCalling){
          if (!isCallAccepted){
            callSoundRef.current = playSound("/calling.mp3", true);
          }
        }
    }, [weCalling])

    const remoteVideoRef = useRef(null);
    useEffect(() => {
      if (theOtherUser && remoteMediaStream && remoteVideoRef.current){
        remoteVideoRef.current.srcObject = remoteMediaStream;
      }
    }, [remoteMediaStream, theOtherUser])

    const localVideoRef = useRef(null);
    useEffect(() => {
      if (mediaStreamRef.current && theOtherUser){
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
    }, [mediaStreamRef.current, theOtherUser])

    const handleToggleMic = () => {
      if (mediaStreamRef.current){
        const audioTracks = mediaStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0){
          audioTracks.forEach(track => (track.enabled = !track.enabled));
          setMicEnabled((prev) => !prev);
        }
      }  
    };
  
    const handleToggleCamera = async () => {
      if (mediaStreamRef.current){
        const videoTracks = mediaStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0){
          videoTracks.forEach(track => (track.enabled = !track.enabled));
          
          setCameraEnabled((prev) => {
            const newCameraState = !prev;

            socket.emit("toggleCamera", {
              receiverId: calleeId,
              status: newCameraState
            })

            return newCameraState;
          });
        }
      }
    };
 
    const handleEndCall = async (btnType) => {
      if (callSoundRef.current){
        callSoundRef.current.pause()
        callSoundRef.current.currentTime = 0;
      }
      if (busyLineSoundRef.current){
        busyLineSoundRef.current.pause()
        busyLineSoundRef.current.currentTime = 0;
      }

      if (mediaStreamRef.current){
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close(); 
        peerConnectionRef.current = null;
      }

      setWeCalling(false);
      setIsCallAccepted(null);
      setRemoteMediaStream(null);
      setNotCallingStatus(false);
      setHideRemoteCamera(true);
      setCameraEnabled(false);
      isInCallRef.current = false;

      if (btnType === "callEnd"){
        socket.emit("endCall", {
          senderId: currentUser._id,
          receiverId: calleeId,
          status: "callEnded"
        });

        if (!isCallAccepted){
          sendMessage(null, false);   
        }

        if (isCallAccepted === true){
          sendMessage(callDuration, true);   
        }
      }
    };

    const handleRedial = () => {
      if (busyLineSoundRef.current){
        busyLineSoundRef.current.pause()
        busyLineSoundRef.current.currentTime = 0;
      }
      setIsCallAccepted(null);
      setCameraEnabled(true);
      if (callType === "video"){
        handleCall('video', theOtherUser?._id, chatId);
      }
      else{
        handleCall('voice', theOtherUser?._id, chatId);
      }
    }

    const sendMessage = async (callDuration, accepted) => {
      let message = {
        senderId: currentUser._id,
        receiverId: calleeId,
        text: "",
        callType: callType,
        haveSeen: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      if (accepted){
        const hours = Math.floor(callDuration / 3600);
        const minutes = Math.floor((callDuration % 3600) / 60);
        const seconds = callDuration % 60;

        message.callDuration = true;
        message.callInfo = {
          hours: hours,
          minutes: minutes,
          seconds: seconds
        }
      }

      const conversation = {
        updatedAt: Date.now()
      }

      const conversation2 = {
        conversationOwner: calleeId,
        receiverId: currentUser._id,
        lastMessage: accepted ? "The call ended." : "You missed a call.",
        chatId: chatId,
        isSeen: false
      }
      try{
        const response2 = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation2 , {
          headers: {
              authorization: `Bearer ${accessToken}`
          }
        });
        if (response2.data.state === "dontExist"){
            await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation2, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
        }

        const conversation3 = {
          conversationOwner: currentUser._id,
          receiverId: calleeId,
          lastMessage: accepted ? "The call ended." : "You missed a call.",
          chatId: chatId,
          isSeen: true
        }

        const response3 = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation3 , {
          headers: {
              authorization: `Bearer ${accessToken}`
          }
        });
        if (response3.data.state === "dontExist"){
            await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation3, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
            getConversations();
        }

        await axiosJWT.put(`${apiUrl}/api/chats/sendMessage/${chatId}`, message, {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
        });
        if (conversations.length > 0){
          if (selectedConv.receiverId === calleeId){
            setMessages((prev) => [...prev, message]) 
          }
        }
        await axiosJWT.put(`${apiUrl}/api/chats/${chatId}`, {haveSeen: false}, {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
        });

        socket.emit("sendMessage", {
            senderId: currentUser._id,
            receiverId: calleeId,
            text: "",
            callType: callType,
            callDuration: accepted ? true : false,
            callInfo: accepted ? message.callInfo : null
        })

        const userIds = [currentUser._id, calleeId];
        userIds.forEach(async (id) => {
            conversation.isSeen = currentUser._id === id ? true : false;
            conversation.lastMessage = !accepted ? 
                                  currentUser._id === id ? "They missed a call." : "You missed a call."
                                  : 
                                  "The call ended." ,
            await axiosJWT.put(`${apiUrl}/api/conversations/updateConv/${chatId}/${id}`, conversation, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
        })

        setConversations((prevConversations) => {
            const updatedConversations = prevConversations.map((conv) =>
                conv.chatId === chatId && conv.receiverId === calleeId
                    ? {...conv, lastMessage: !accepted ? "They missed a call." : "The call ended." , isSeen: true, updatedAt: Date.now()}
                    : conv
                );
            return updatedConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        });

        socket.emit("updateConversation", {
            conversationOwner: calleeId,
            receiverId: currentUser._id,
            chatId: chatId,
            lastMessage: accepted ? "The call ended." : "You missed a call."
        })

        setHaveSeenMessage(false)
        setHaveSeenIndicator(false);
      }
      catch(err){
        console.log(err);
      }
      
    }

    if (!theOtherUser){
      return;
    }

    return (
        <div className="callPage-container">

          <div className="videos-section">
            <div className={callType === "video" ? "remote-video" : ""}>
              <video ref={remoteVideoRef} 
                      autoPlay 
                      style={{ display: !hideRemoteCamera ? "none" : "" }} 
              />
            </div> 
            <div className="local-video">
              <video ref={localVideoRef} 
                      autoPlay 
                      muted 
                      style={{ display: !cameraEnabled ? "none" : "" }} 
              />
            </div>      
          </div>
          
          {(!(callType === "video" && isCallAccepted === true) || !hideRemoteCamera) &&
            <div className="user-info">
              <div className={isCallAccepted === true ? "inCall" : undefined}>
                <img src={
                        theOtherUser?.profilePicture ? theOtherUser?.profilePicture : 
                        theOtherUser?.gender === "Male" ? 
                        "/male.jpg" :
                        "/female.jpg"
                    }  
                    alt="Profile picture" 
                />
              </div>
                  
              <h2>{theOtherUser?.firstName + " " + theOtherUser?.middleName + " " + theOtherUser?.lastName}</h2>
              {isCallAccepted === false ? "Call declined"
                : isCallAccepted ? "In call"
                : notCallingStatus === "busy" ? "This person is in another call right now." 
                : !notCallingStatus ? "Ringing ..." 
                : "This person is not online at this moment"
              }
              {isCallAccepted &&
                <div className="call-duration">
                    <p> 
                        {String(hours).padStart(2, '0')}:
                        {String(minutes).padStart(2, '0')}:
                        {String(seconds).padStart(2, '0')}
                    </p>
                </div>
              }    
            </div>
          }

          <div className="btn-section-callPage">
            {isCallAccepted === false ? 
              <>
                <button className="styled-btn call" title="Redial" onClick={handleRedial}>
                  <Call className="icon-btn"/>
                </button>
                <button className="styled-btn close" title="Close" onClick={() => handleEndCall("close")}>
                  <Close className="icon-btn"/>
                </button>
              </>
              :
              <>
                {callType === "video" &&
                  <button className={!isCallAccepted ? "styled-btn disabled-btn-status" : "styled-btn"} 
                          title="Toggle camera" 
                          disabled={!isCallAccepted} 
                          onClick={handleToggleCamera}>
                    {cameraEnabled ? <Videocam className="icon-btn" /> : <VideocamOff className="icon-btn" />}
                  </button>
                }
                
                <button className={!isCallAccepted ? "styled-btn disabled-btn-status" : "styled-btn"}  
                        title="Toggle microphone" 
                        disabled={!isCallAccepted} 
                        onClick={handleToggleMic}>
                    {micEnabled ? <Mic className="icon-btn"/> : <MicOff className="icon-btn"/>}
                </button>

                {notCallingStatus === "busy" ? 
                  <button className="styled-btn close" title="Close" onClick={() => handleEndCall("close")}>
                    <Close className="icon-btn"/>
                  </button>
                  :
                  <button className="styled-btn callEnd" title="End call" onClick={() => handleEndCall("callEnd")}>
                    <CallEnd className="icon-btn"/>
                  </button>
                }
              </>
            }

          </div>
        </div>
    )
}

export default CallPage;