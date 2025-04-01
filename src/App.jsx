import {BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Login from "./components/login/Login"
import List from "./components/list/List"
import Detail from "./components/detail/Detail"
import Chat from "./components/chat/Chat"
import { axiosJWT } from "./lib/axiosJWT"
import { useState, useEffect, useRef } from "react"
import Notification from "./components/notification/Notification"
import { useUserStore } from "./lib/userStore"
import { CircularProgress } from '@mui/material';
import { useChatStore } from "./lib/chatStore"
import Alert from "./components/chat/alertPopUp/alert"
import MediaViewer from "./components/mediaViwer/MediaViewer"
import { toast } from "react-toastify"
import CallPage from "./components/callPage/callProcess/callPage";
import IncomingCallPopUp from "./components/callPage/incomingCall/incomingCall";
import playSound from "./lib/sounds";

const App = () => {

  const apiUrl = import.meta.env.VITE_API_URL;
  const {currentUser, accessToken, socket, isLoading, initialize} = useUserStore();
  const {theOtherUser, changeChat, updateOtherUser} = useChatStore();
  const [openSearch, setOpenSearch] = useState(false)
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState([]);
  const [seenFunction, setSeenFunction] = useState(false);

  const [deletedConv, setDeletedConv] = useState(false);

  const [haveSeenIndicatior, setHaveSeenIndicator] = useState(false);
  const [haveSeenMessage, setHaveSeenMessage] = useState(false);

  const [messages, setMessages] = useState([]);

  const [moreBtn, setMoreBtn] = useState(false);
  const [backToConvBtn, setBackToConvBtn] = useState(true);

  const [openAlertPopUp, setAlertOpenPopUp] = useState(false)
  const maxUploadingSize = 25;

  const [openMediaViewer, setMediaViewer] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (conversations.length === 0){
      changeChat(null, null);
      setBackToConvBtn(true)
    }
  }, [conversations])

  const [blockedState, setBlockedState] = useState({});
  useEffect(() => {
      const handleBlockedState = (data) => {
        setBlockedState(prevState => ({
          ...prevState,
          [data.theOtherUserId]: data.state
        }));
      }
      const handleUnBlockedState = async (data) => {
        try{
          const res = await axiosJWT.get(`${apiUrl}/api/users/getUser/${data.theOtherUserId}/${currentUser._id}`, {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
          })
          if (selectedConv.receiverId === res.data._id){
            updateOtherUser(res.data)
          }
          setBlockedState(prevState => ({
            ...prevState,
            [data.theOtherUserId]: ""
          }));
        }
        catch(err){
          toast.error("Error! Something went wrong!")
        }
      };
      socket?.on("getBlockedState", handleBlockedState);
      socket?.on("getUnBlockedState", handleUnBlockedState);

      return () => {
        socket?.off("getBlockedState", handleBlockedState);
        socket?.off("getUnBlockedState", handleUnBlockedState);
      };
  },[socket, selectedConv])

  const getConversations = async () =>{
    try{
        const res = await axiosJWT.get(apiUrl + "/api/conversations/" + currentUser._id, {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
        });

        const conversationWithUserDetails = await Promise.all(
            res.data.map(async (conv) => {
                const userRes = await axiosJWT.get(`${apiUrl}/api/users/getUser/${conv.receiverId}/${currentUser._id}/?getBlocked=true`, {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                });
                return {
                    ...conv,
                    receiverUser: userRes.data
                }
            })
        )

        setConversations(conversationWithUserDetails.sort((a,b) => {
            return new Date(b.updatedAt) - new Date(a.updatedAt)
        }));
        setDeletedConv(false);
    }
    catch(err){
        toast.error("Error! Could not get the conversations!");
    }
  }



  // calling functionality
  const calleeId = useRef(null); // better than usestate for webrtc connections
  // const [calleeId, setCalleeId] = useState(null);
  const [callType, setCallType] = useState("");
  const [weCalling, setWeCalling] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [notCallingStatus, setNotCallingStatus] = useState(false)

  const mediaStreamRef = useRef(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState(null);
  const [hideRemoteCamera, setHideRemoteCamera] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const peerConnectionRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [remoteOffer, setRemoteOffer] = useState(null);

  const isInCallRef = useRef(false);

  const [isCallAccepted, setIsCallAccepted] = useState(null);

  const callSoundRef = useRef(null);
  const callRingingRef = useRef(null);
  const busyLineSoundRef = useRef(null);

  useEffect(() => {
    socket?.on("receiveOffer", handleIncomingCall);
    socket?.on("receiveAnswer", handleAnswer);
    socket?.on('receiveIceCandidate', handleCandidate);
    socket?.on("callEnded", handleCallEnded);
    socket?.on("callingThem", handleCallingThemStatus);
    socket?.on("toggleCamera", handleRemoteCamera);
  
    return () => {
      socket?.off('receiveOffer', handleIncomingCall);
      socket?.off('receiveAnswer', handleAnswer);
      socket?.off('receiveIceCandidate', handleCandidate);
      socket?.off('callEnded', handleCallEnded);
      socket?.off('callingThem', handleCallingThemStatus);
      socket?.off('toggleCamera', handleRemoteCamera);
    };
  }, [socket])

  const handleIncomingCall = async (data) => {
    if (isInCallRef.current){
      socket.emit("sendAnswer", {
        receiverId: data.callerId,
        answer: "busy"
      })
      return;
    }
    calleeId.current = data.callerId;
    // setCalleeId(data.callerId);
    setRemoteOffer(data.offer);
    setCallType(data.callType);
    setChatId(data.chatId);
    setIncomingCall(true);
  }

  const handleAnswer = (data) => {
    if (data.answer !== "busy"){
      if (peerConnectionRef.current){
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setIsCallAccepted(true);
        isInCallRef.current = true;
  
        if (callSoundRef.current){
          callSoundRef.current.pause()
          callSoundRef.current.currentTime = 0;
        }
      }
    }
    else{
      setNotCallingStatus("busy");
      if (callSoundRef.current){
        callSoundRef.current.pause()
        callSoundRef.current.currentTime = 0;
      }
      busyLineSoundRef.current = playSound("/busyLine.mp3", true);

      if (mediaStreamRef.current){
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
  
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close(); 
        peerConnectionRef.current = null;
      }
    }
  };

  const handleCandidate = (data) => {
    if (peerConnectionRef.current){
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const handleCallEnded = (data) => {
      if (data.senderId === calleeId?.current){
        if (callRingingRef.current){
          callRingingRef.current.pause()
          callRingingRef.current.currentTime = 0;
        }
    
        if (mediaStreamRef.current){
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
    
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close(); 
          peerConnectionRef.current = null;
        }
        setRemoteMediaStream(null)
        setCameraEnabled(false);
        console.log("call ended.")
    
        if (data.status === "callEnded"){
          setWeCalling(false);
          setIncomingCall(false)
          setIsCallAccepted(null);
          setHideRemoteCamera(true);
          isInCallRef.current = false;
        }
        // down here is declined, not ended
        else{
          if (callSoundRef.current){
            callSoundRef.current.pause()
            callSoundRef.current.currentTime = 0;
          }
          busyLineSoundRef.current = playSound("/busyLine.mp3", true);
          setIsCallAccepted(false);
        }
      }
      else if (data.senderId === undefined || data.status !== "callEnded") {
        if (callSoundRef.current){
          callSoundRef.current.pause()
          callSoundRef.current.currentTime = 0;
        }
        busyLineSoundRef.current = playSound("/busyLine.mp3", true);
        setIsCallAccepted(false);
      }
  }

  const handleCallingThemStatus = (data) => {
    if (data.state === "offline"){
      setNotCallingStatus(true);
      if (callSoundRef.current){
        callSoundRef.current.pause()
        callSoundRef.current.currentTime = 0;
      }
      busyLineSoundRef.current = playSound("/busyLine.mp3", true);

      if (mediaStreamRef.current){
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
  
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close(); 
        peerConnectionRef.current = null;
      }
    }
  }

  const handleRemoteCamera = (data) => {
    if (data.status === false){
      setHideRemoteCamera(false);
    }
    else if (data.status === true){
      setHideRemoteCamera(true);
    }
  }

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInCallRef.current) {
        socket.emit("endCall", {
          senderId: currentUser._id,
          receiverId: calleeId?.current,
          status: "callEnded"
        });
      }
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [calleeId?.current]);

  useEffect(() => {
      if (incomingCall){
          callRingingRef.current = playSound("/ringtone.mp3", true);
      }
  }, [incomingCall])
  
  const handleAccept = async () => {
      if (callRingingRef.current){
          callRingingRef.current.pause()
          callRingingRef.current.currentTime = 0;
      }

      let stream = null;
      try{
        setIncomingCall(false);
        isInCallRef.current = true;

        if (callType === "video"){
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
        else{
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        mediaStreamRef.current = stream;

        const pc = new RTCPeerConnection({iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]});
        peerConnectionRef.current = pc;

        stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          setRemoteMediaStream(event.streams[0]);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (answer){
          socket.emit("sendAnswer", {
            receiverId: calleeId?.current,
            answer: answer
          })
        }

        pc.onicecandidate = (event) => {
          if (event.candidate){
            socket.emit("sendIceCandidate", {
              receiverId: calleeId?.current,
              candidate: event.candidate
            })
          }
        }

        setIsCallAccepted(true);
      }
      catch(err){
        if (err.name === "NotFoundError"){
          setAlertOpenPopUp("deviceNotFound");
        }
        else if (err.name === "NotAllowedError"){
          setAlertOpenPopUp("deviceNotAllowed");
        }
      } 
  }

  const handleDecline = () => {
    if (callRingingRef.current){
        callRingingRef.current.pause()
        callRingingRef.current.currentTime = 0;
    }

    setIsCallAccepted(null);
    setIncomingCall(false);

    socket.emit("endCall", {
      receiverId: calleeId?.current,
      status: "declined"
    });
  }

  const handleCall = async (callType, id, chatId) => {
    calleeId.current = id;
    // setCalleeId(id);
    setCallType(callType);
    setChatId(chatId);
    
    let stream = null;
    try{
      if (callType === "video"){
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      else{
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;

      const pc = new RTCPeerConnection({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
      peerConnectionRef.current = pc;

      stream?.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteMediaStream(event.streams[0]);
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (offer) {
        socket.emit("sendOffer", {
            callerId: currentUser._id,
            receiverId: id,
            callType: callType,
            chatId: chatId,
            offer: offer
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate){
          socket.emit("sendIceCandidate", {
            receiverId: id,
            candidate: event.candidate
          })
        }
      }

      setWeCalling(true);
    }
    catch(err){
      if (err.name === "NotFoundError"){
        setAlertOpenPopUp("deviceNotFound");
      }
      else if (err.name === "NotAllowedError"){
        setAlertOpenPopUp("deviceNotAllowed");
      }
    }
  }

  if (isLoading) return <><CircularProgress /></>

  return (
    <Router>
      <div className='container'>
          <Routes>
            <Route path="/" element={
              currentUser && accessToken && (weCalling || isCallAccepted) ?
                <CallPage 
                  weCalling={weCalling}
                  setWeCalling={setWeCalling}
                  callType={callType}
                  calleeId={calleeId.current}
                  isCallAccepted={isCallAccepted}
                  setIsCallAccepted={setIsCallAccepted}
                  notCallingStatus={notCallingStatus}
                  setNotCallingStatus={setNotCallingStatus}
                  mediaStreamRef={mediaStreamRef}
                  remoteMediaStream={remoteMediaStream}
                  setRemoteMediaStream={setRemoteMediaStream}
                  hideRemoteCamera={hideRemoteCamera}
                  setHideRemoteCamera={setHideRemoteCamera}
                  peerConnectionRef={peerConnectionRef}
                  callSoundRef={callSoundRef}
                  busyLineSoundRef={busyLineSoundRef}
                  handleCall={handleCall}
                  cameraEnabled={cameraEnabled} 
                  setCameraEnabled={setCameraEnabled}
                  conversations={conversations}
                  setConversations={setConversations}
                  setMessages={setMessages}
                  setHaveSeenIndicator={setHaveSeenIndicator}
                  setHaveSeenMessage={setHaveSeenMessage}
                  chatId={chatId}
                  getConversations={getConversations}
                  selectedConv={selectedConv}
                  isInCallRef={isInCallRef}
                />
              :
              currentUser && accessToken ? 
                <>
                  <List openSearch={openSearch} 
                      setOpenSearch={setOpenSearch} 
                      setConversations={setConversations}
                      conversations={conversations}
                      blockedState={blockedState}
                      setSelectedConv={setSelectedConv}
                      selectedConv={selectedConv}
                      setSeenFunction={setSeenFunction}
                      backToConvBtn={backToConvBtn}
                      setBackToConvBtn={setBackToConvBtn}
                      openAlertPopUp={openAlertPopUp}
                      openMediaViewer={openMediaViewer}
                      setAlertOpenPopUp={setAlertOpenPopUp}
                      incomingCall={incomingCall}
                      getConversations={getConversations} 
                      deletedConv={deletedConv} 
                      setDeletedConv={setDeletedConv}
                  />
                  {incomingCall && 
                      <IncomingCallPopUp 
                        calleeId={calleeId.current}
                        callType={callType}
                        handleAccept={handleAccept}
                        handleDecline={handleDecline}
                      />
                  }
                    {theOtherUser ? 
                    <>
                      <Chat openSearch={openSearch} 
                            blockedState={blockedState} 
                            setConversations={setConversations}
                            seenFunction={seenFunction} 
                            setSeenFunction={setSeenFunction}
                            moreBtn={moreBtn} 
                            setMoreBtn={setMoreBtn}
                            backToConvBtn={backToConvBtn} 
                            setBackToConvBtn={setBackToConvBtn}
                            messages={messages}
                            setMessages={setMessages}
                            openAlertPopUp={openAlertPopUp}
                            setAlertOpenPopUp={setAlertOpenPopUp}
                            maxUploadingSize={maxUploadingSize}
                            setMediaViewer={setMediaViewer}
                            openMediaViewer={openMediaViewer}
                            handleCall={handleCall}
                            incomingCall={incomingCall}
                            haveSeenIndicatior={haveSeenIndicatior} 
                            setHaveSeenIndicator={setHaveSeenIndicator}
                            haveSeenMessage={haveSeenMessage} 
                            setHaveSeenMessage={setHaveSeenMessage}
                      />
                      <Detail openSearch={openSearch} 
                              blockedState={blockedState}
                              moreBtn={moreBtn} 
                              setMoreBtn={setMoreBtn}
                              setBackToConvBtn={setBackToConvBtn} 
                              messages={messages} 
                              openAlertPopUp={openAlertPopUp}
                              setMediaViewer={setMediaViewer}
                              openMediaViewer={openMediaViewer}
                              incomingCall={incomingCall}
                              /> 
                      {openAlertPopUp && 
                          <Alert openAlertPopUp={openAlertPopUp} 
                                setAlertOpenPopUp={setAlertOpenPopUp} 
                                maxUploadingSize={maxUploadingSize} 
                                incomingCall={incomingCall}/>   
                      }
                      {openMediaViewer &&
                        <MediaViewer setMediaViewer={setMediaViewer} 
                                    openMediaViewer={openMediaViewer} 
                                    incomingCall={incomingCall} />
                      }
                    </>
                    :
                    conversations.length !== 0 ? 
                      <div className="loading-circular-progress">
                        <CircularProgress />
                      </div>
                    :
                      <div className={incomingCall ? "blur-background loading-circular-progress div-hiding" : "loading-circular-progress div-hiding"}>
                        <h2>Chat with your friends. <br /> The messages will appear here.</h2>
                      </div>
                    }
                </>
                :
                <Login />
              } />

            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
          
        <Notification /> 
      </div>
    </Router>
  )
}

export default App
