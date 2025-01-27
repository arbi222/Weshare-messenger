import "./chat.css"
import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { Phone, VideoCall, MoreHoriz, ArrowBack, 
        Send, AddPhotoAlternate, EmojiEmotions, 
        Check, Mic, Delete, PlayCircleOutline, Gif, Search } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";
import axios from "axios";
import { format } from "timeago.js"
import upload from "../../lib/upload";
import { toast } from "react-toastify";
import { axiosJWT } from "../../lib/axiosJWT";

const Chat = ({openSearch, blockedState, setConversations, 
            seenFunction, setSeenFunction, moreBtn, 
            setMoreBtn, backToConvBtn, setBackToConvBtn,
            messages, setMessages, openAlertPopUp, setAlertOpenPopUp, 
            maxUploadingSize, setMediaViewer, openMediaViewer, incomingCall, handleCall,
            haveSeenMessage, setHaveSeenMessage, haveSeenIndicatior, setHaveSeenIndicator}) => {

    const {currentUser, socket, accessToken} = useUserStore();
    const apiUrl = import.meta.env.VITE_API_URL;
    const {chatId, theOtherUser} = useChatStore();

    // gifs
    const getTrendingGifs = async () => {
        const apiKey = import.meta.env.VITE_GIPHY_API;
        const response = await axios.get(`https://api.giphy.com/v1/gifs/trending`, {
          params: {
            api_key: apiKey,
            limit: 5, // using free api 
          },
        });
        return response.data.data;
    };

    const searchGifs = async (query) => {
        const apiKey = import.meta.env.VITE_GIPHY_API;
        const res = await axios.get("https://api.giphy.com/v1/gifs/search", {
            params: {
                api_key: apiKey,
                q: query,
                limit: 5, // using free api 
            }
        })
        return res.data.data;
    }

    const [openGifs, setOpenGifs] = useState(false);
    const [gifs, setGifs] = useState([]);
    const handleSearch = async (query) => {
        let results;
        if (query){
            results = await searchGifs(query);
        }
        else{
            results = await getTrendingGifs();
        }
        setGifs(results);
    };

    const gifInput = useRef();
    useEffect(() => {
        if (openGifs || gifInput.current){
            gifInput.current.focus();
            getTrendingGifs().then((trendingGifs) => setGifs(trendingGifs));
        }
    }, [openGifs]);


    // recording
    const [mediaStream, setMediaStream] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioChunks, setAudioChunks] = useState([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const intervalId = useRef(null);

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        setAudioChunks([]);
        setRecordingTime(0);
        setMediaStream(stream);

        if (intervalId.current){
            clearInterval(intervalId.current);
        }
        intervalId.current = setInterval(() => {
            setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setAudioChunks((prev) => [...prev, event.data]);
            } else {
              console.log("Empty audio chunk received");
            }
        };

        recorder.onstop = () => { 
            stream.getTracks().forEach(track => track.stop());
            clearInterval(intervalId.current);
            setRecordingTime(0);
            setMediaStream(null);
        };

        recorder.start(1000);
        setIsRecording(true);
      } catch (error) {
        setAlertOpenPopUp("Microphone");
      }
    };

    const deleteRecording = () => {
        if (mediaRecorder){
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        clearInterval(intervalId.current);
        setRecordingTime(0);
        setMediaRecorder(null);
        setIsRecording(false);
        setAudioChunks([]);
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        setMediaStream(null);
    }

    const SendRecording = async () => {
        if (audioChunks.length === 0) {
            console.error("No audio chunks recorded");
            setRecordingTime(0);
            clearInterval(intervalId.current);
            return;
        }
        mediaRecorder.stop();
        setIsRecording(false);
        clearInterval(intervalId.current);
        setRecordingTime(0);
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        setMediaStream(null);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            let file = new File([audioBlob], 'voiceMessage.webm', { type: 'audio/webm' });
            try {
                const response = await checkBlockStatus(currentUser._id, theOtherUser._id);
                if (response === "blockedByYou"){
                    toast.error("You can not send a message to a user that you have already blocked!");
                }
                else if (response === "blockedByThem"){
                    toast.error("You have been blocked by this user!");
                }
                else if (response === "noBlocked"){
                    const downloadURL = await upload(file, (progress) => {
                        // console.log(`Upload progress: ${progress}%`);
                    });
                  
                    let message = {
                      senderId: currentUser._id,
                      receiverId: theOtherUser._id,
                      text: "",
                      fileUrl: downloadURL,
                      fileType: 'voice',
                      fileName: 'voice',
                      haveSeen: false,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    }
      
                    sendMessageFunction("voice", message);
                }             
            } catch (error) {
                toast.error("Error! Audio upload failed!");
            }
        };
    };

    const [onlineFriends, setOnlineFriends] = useState([]);
    useEffect(() => {
        socket.emit("addUser", currentUser._id);

        socket.on("getUsers", users => {
            try{
                setOnlineFriends(currentUser.friends.filter((friendId) => users.some((usr) => usr.userId === friendId)))
            }
            catch(err){
                console.log(err);
            }
        })

        return () => {
            socket.off("getUsers");
        };
    },[currentUser])

    const [loader, setLoader] = useState(true)

    useEffect(() => {
        const getMessages = async () => {
            try{
                const res = await axiosJWT.get(`${apiUrl}/api/chats/${chatId}`, {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                });
                const userCutOff = res.data.deletionCutoff.find(cutoff => cutoff.user === currentUser._id);
                let visibleMessages = res.data.messages;

                if (userCutOff){
                    visibleMessages = visibleMessages.filter(message => message.createdAt > userCutOff.timestamp);
                }

                setMessages(visibleMessages);
                setLoader(false)
                setHaveSeenIndicator(res.data.haveSeen);
            }
            catch(err){
                toast.error("Error! Could not get the messages!");
                setLoader(false)
            }
        }
        getMessages();
    }, [chatId])

    
    useEffect(() => {
        if (messages.length !== 0){
            const lastMessage = messages[messages.length - 1]
            if (haveSeenIndicatior){
                setHaveSeenIndicator(true);
            }
            else{
                if (lastMessage?.senderId === currentUser._id){
                    setHaveSeenIndicator(false);
                }
                else{
                    setHaveSeenIndicator(true);
                }
            }
        }
    }, [messages])

    useEffect(() => {
        const handleHaveSeenMessage = (data) => {
            setHaveSeenMessage({
                senderId: data.senderId,
                haveSeen: data.haveSeen,
            });
        };
 
        socket.on("haveSeenMessage", handleHaveSeenMessage);

        return () => {
            socket.off("haveSeenMessage", handleHaveSeenMessage);
        };
    }, [socket]);

    const [arrivalMessage, setArrivalMessage] = useState(null);
    useEffect(() => {
        const handleMessageArrival = (data) => {
            setArrivalMessage({
                senderId: data.senderId,
                text: data.text,
                callType: data.callType,
                callDuration: data.callDuration,
                callInfo: data.callInfo,
                fileUrl: data.fileUrl,
                fileType: data.fileType,
                fileName: data.fileName,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        };
    
        socket.on("getMessage", handleMessageArrival);
    
        return () => {
            socket.off("getMessage", handleMessageArrival);
        };
    }, [socket]);

    useEffect(() => {
        arrivalMessage && 
            theOtherUser._id === arrivalMessage.senderId &&
                setMessages((prev) => [...prev, arrivalMessage])
                setHaveSeenMessage(false)
    },[arrivalMessage])

    const [text, setText] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const [img, setImg] = useState({
        file: null,
        url: ""
    });

    
    const handleFiles = (e) => {
        if (e.target.files[0]){
            const maxSize = maxUploadingSize * 1024 * 1024;
            const file = e.target.files[0];
            const fileType = file.type;

            if (file.size > maxSize){
                setAlertOpenPopUp(true);
                const file = document.getElementById("file");
                if (file){
                    file.value = null;
                }
                return;
            }       

            if (fileType.startsWith("image/") || fileType.startsWith("video/")){
                setImg({
                    file: file,
                    url: URL.createObjectURL(file)
                })
            }
            else {
                setImg({
                    file: file,
                    url: file.name
                })
            }
        } 
    }

    const textAreaRef = useRef();
    useEffect(() => {
        if (textAreaRef.current){
            textAreaRef.current.focus();
        }

        setText("");
        setImg({
            file: null,
            url: ""
        });
        const file = document.getElementById("file");
        if (file){
            file.value = null;
        }
    }, [theOtherUser])


    const handleClick = async () => {

        if (textAreaRef.current){
            textAreaRef.current.focus();
        }

        setConversations((prevConversations) => {
            return prevConversations.map((conv) => {
                if (conv.chatId === chatId && conv.receiverId === theOtherUser._id) {
                    if (!conv.isSeen) {
                        updateConversation(conv);
                    }
                    return { ...conv, isSeen: true };
                }
                return conv;
            });
        });
        
        const updateConversation = async (conv) => {
            try {
                await axiosJWT.put(apiUrl + "/api/conversations/" + conv._id, {isSeen: true} , {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                });
            } catch (err) {
                toast.error("Error! Something went wrong!");
            }
        };
        
        setSeenFunction(true);
    }
    
    useEffect(() => {
        const seenMessage = async () => {
            if (messages.length !== 0){
                if (currentUser._id !== theOtherUser._id){
                    if (haveSeenIndicatior && messages[messages.length - 1].senderId !== currentUser._id){
                        socket.emit("seeMessage", {
                            senderId: currentUser._id,
                            receiverId: theOtherUser._id,
                            haveSeen: true
                        })
                        
                        try{
                            const res = await axiosJWT.put(`${apiUrl}/api/chats/${chatId}`, {haveSeen: true} , {
                                headers: {
                                    authorization: `Bearer ${accessToken}`
                                }
                            });
                            setHaveSeenIndicator(res.data.haveSeen);
                        }
                        catch(err){
                            toast.error("Error! Something went wrong!");
                        }
                    }
                }
            }
        }
        seenMessage()
        setSeenFunction(false);
    }, [seenFunction])

    const gifButton = useRef()
    const emoji = useRef()
    const [openEmoji, setOpenEmoji] = useState(false);
    const handleEmoji = (e) => {
        const newMessage = text.slice(0, cursorPosition) + e.emoji + text.slice(cursorPosition);
        setText(newMessage);
        setCursorPosition((prevPosition) => prevPosition + e.emoji.length);

        setTimeout(() => {
            if (textAreaRef.current) {
              textAreaRef.current.selectionStart =
                textAreaRef.current.selectionEnd = cursorPosition + e.emoji.length;
            }
          }, 0);
    }
    useEffect(() => {
        if (openEmoji || gifButton){
          const handleButton = (e) => {
            if (!emoji.current.contains(e.target)){
                setOpenEmoji(false);
            }
            if (!gifButton.current.contains(e.target)){
                setOpenGifs(false);
            }
          }
          document.addEventListener("mousedown", handleButton);
    
          return () => {
            document.removeEventListener("mousedown", handleButton);
          }
        }
    })
    
    const endRef = useRef(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({behavior: "auto"});
    },[chatId, messages, img.file, haveSeenMessage])

    const [SendMessageBtnState, setSendMessageBtnState] = useState(false);
    useEffect(() => {
        function isEmptyOrSpaces(str){
            return str === null || str.match(/^ *$/) !== null;
        }

        if (img.file){
            setSendMessageBtnState(true);
        }
        else if (!isEmptyOrSpaces(text)){
            setSendMessageBtnState(true);
        }
        else{
            setSendMessageBtnState(false);
        }
    },[img.file, text])


    const handlePhotoDelete = () => {
        setImg({file: null, url: ""});
        document.getElementById("file").value = null;
    }
    
    const handleSendGiff = async (gifUrl) => {
        let message = {
            senderId: currentUser._id,
            receiverId: theOtherUser._id,
            text: "",
            fileUrl: gifUrl,
            fileType: 'gif',
            fileName: 'GIF',
            haveSeen: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        
        const response = await checkBlockStatus(currentUser._id, theOtherUser._id);
        if (response === "blockedByYou"){
            toast.error("You can not send a message to a user that you have already blocked!");
        }
        else if (response === "blockedByThem"){
            toast.error("You have been blocked by this user!");
        }
        else if (response === "noBlocked"){
            sendMessageFunction("gif", message);
        } 
    }

    const [progress, setProgress] = useState(0);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        let fileUrl = null;

        let message = {
            senderId: currentUser._id,
            receiverId: theOtherUser._id,
            text: text,
            haveSeen: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        if (SendMessageBtnState){

            const response = await checkBlockStatus(currentUser._id, theOtherUser._id);
            if (response === "blockedByYou"){
                toast.error("You can not send a message to a user that you have already blocked!");
            }
            else if (response === "blockedByThem"){
                toast.error("You have been blocked by this user!");
            }
            else if (response === "noBlocked"){
                if (img.file){
                    fileUrl = await upload(img.file, (progress) => { 
                        setProgress(progress);
                    }); 
                    if (img.file.type.startsWith("image/")){
                        message.fileUrl = fileUrl;
                        message.fileType = "image";
                        message.fileName = img.file.name;
                    } 
                    else if (img.file.type.startsWith("video/")){
                        message.fileUrl = fileUrl;
                        message.fileType = "video";
                        message.fileName = img.file.name;
                    } 
                    else if (img.file.type === "application/pdf"){
                        message.fileUrl = fileUrl;
                        message.fileType = "pdf";
                        message.fileName = img.file.name;
                    } 
                    else if (img.file.type === "text/plain"){
                        message.fileUrl = fileUrl;
                        message.fileType = "text";
                        message.fileName = img.file.name;
                    }
                    else {
                        message.fileUrl = fileUrl;
                        message.fileType = "document";
                        message.fileName = img.file.name;
                    }
                }
    
                sendMessageFunction("simpleMessage" , message);
            }
        }
    }

    const checkBlockStatus = async (senderId, receiverId) => {
        try{
            const res = await axiosJWT.get(`${apiUrl}/api/users/blockStatus/${senderId}/${receiverId}`, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
    
            return res.data;
        }
        catch(err){
            toast.error("Error! Something went wrong!");
        }
    }

    const sendMessageFunction = async (messageType, message) => {

        let conversation;

        if (messageType === "simpleMessage"){
            conversation = {          
                lastMessage: text ? text : 
                    img.file?.type.startsWith("image/") ? "Image" : 
                    img.file?.type.startsWith("video/") ? "Video" : 
                    "File",
                updatedAt: Date.now()
            }
        }
        else if (messageType === "gif"){
            conversation = {          
                lastMessage: "GIF",
                updatedAt: Date.now()
            }
        }
        else if (messageType === "voice"){
            conversation = {          
                lastMessage: "Voice message",
                updatedAt: Date.now()
            }
        }
        else{
            return;
        }

        try{
            // here we are creating a conv for the other user if it doesnt exist 
            const conversation2 = {
                conversationOwner: theOtherUser._id,
                receiverId: currentUser._id,
                lastMessage: conversation.lastMessage,
                chatId: chatId,
                isSeen: false
            }
            const response = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation2 , {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
            if (response.data.state === "dontExist"){
                await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation2, {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                });
            }

            await axiosJWT.put(`${apiUrl}/api/chats/sendMessage/${chatId}`, message, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
            setMessages((prev) => [...prev, message]) 
            await axiosJWT.put(`${apiUrl}/api/chats/${chatId}`, {haveSeen: false}, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });

            if (currentUser._id !== theOtherUser._id){
                socket.emit("sendMessage", {
                    senderId: currentUser._id,
                    receiverId: theOtherUser._id,
                    text: message.text,
                    fileUrl: message.fileUrl,
                    fileType: message.fileType,
                    fileName: message.fileName
                })
            }

            const userIds = [currentUser._id, theOtherUser._id];
            userIds.forEach(async (id) => {
                conversation.isSeen = currentUser._id === id ? true : false;
                await axiosJWT.put(`${apiUrl}/api/conversations/updateConv/${chatId}/${id}`, conversation, {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                });
            })

            setConversations((prevConversations) => {
                const updatedConversations = prevConversations.map((conv) =>
                    conv.chatId === chatId && conv.receiverId === theOtherUser._id
                        ? {...conv, lastMessage: conversation.lastMessage, isSeen: true, updatedAt: Date.now()}
                        : conv
                    );
                return updatedConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            });

            if (currentUser._id !== theOtherUser._id){
                socket.emit("updateConversation", {
                    conversationOwner: theOtherUser._id,
                    receiverId: currentUser._id,
                    chatId: chatId,
                    lastMessage: conversation.lastMessage
                })
            }

            setHaveSeenMessage(false)
            setHaveSeenIndicator(false);
            setText("");
            setImg({
                file: null,
                url: ""
            });

            const file = document.getElementById("file");
            if (file){
                file.value = null;
            }

            setOpenGifs(false);
            setAudioChunks([])
            setMediaRecorder(null)
        }
        catch(err){
            toast.error("Error! Something went wrong!")
        }
    }

    useEffect(() => {
        const keyDownHandler = (event) => {
            if (event.key === "Enter"){
                handleSendMessage(event);
            }
        }
        document.addEventListener("keydown", keyDownHandler);

        return () => {
            document.removeEventListener("keydown", keyDownHandler)
        }
    })

    useEffect(() => {
        if (openSearch || openAlertPopUp || openMediaViewer || incomingCall){
            document.getElementById("main-div").classList.add("blur-background")
        }
        else{
            document.getElementById("main-div").classList.remove("blur-background")
        }
    }, [openSearch, openAlertPopUp, openMediaViewer, incomingCall])

    const blockOrBlocked = (theOtherUser.state === "blockedByYou" || (blockedState[theOtherUser._id] === "blockedByYou")) || 
                        (theOtherUser === "blockedByThem" || (blockedState[theOtherUser._id] === "blockedByThem"))


    return (
        <div id="main-div" className={!backToConvBtn ? 
                                    moreBtn ? "chat-hiding" : "chat"
                                    :
                                    "chat-hiding2"}>
            <div className="top">
                <div className="top-back-btn-section">
                    <div className="back-conversation-btn">
                        <button className="styled-btn" onClick={() => setBackToConvBtn(!backToConvBtn)}>
                            <ArrowBack  style={{marginTop: "3px", fontSize: "25px"}} />
                        </button>
                    </div>
                    <div className="user">
                        <img className="post-profile-picture" 
                            src={blockOrBlocked ?
                                    "/blockedUser.png"
                                    :
                                    theOtherUser?.profilePicture ? theOtherUser?.profilePicture : 
                                    theOtherUser?.gender === "Male" ? 
                                    "/male.jpg" :
                                    "/female.jpg"
                                } 
                            alt="profile pic" 
                        />
                        <div className="texts">
                            <span>{blockOrBlocked ? "User"
                                    :
                                    theOtherUser._id === currentUser._id ?
                                        theOtherUser?.firstName + " " + 
                                        theOtherUser?.middleName + " " + 
                                        theOtherUser?.lastName + " (You)"
                                    :
                                        theOtherUser?.firstName + " " + 
                                        theOtherUser?.middleName + " " + 
                                        theOtherUser?.lastName
                                }
                            </span>
                            {
                            !blockOrBlocked ?
                                currentUser.friends.includes(theOtherUser._id) ?
                                    onlineFriends.includes(theOtherUser._id) ? 
                                       <p>Online</p> : <p>Offline</p>
                                :
                                <></>
                            :
                            <></>
                            }
                        </div>
                    </div>
                </div>
                
                <div className="icons">
                    {currentUser._id !== theOtherUser._id && !blockOrBlocked &&
                        <>
                            <button className="styled-btn" 
                                    onClick={() => handleCall('voice', theOtherUser._id, chatId)}>
                                        <Phone titleAccess="Start a voice call" className="icon" />
                            </button>
                            <button className="styled-btn" 
                                    onClick={() => handleCall('video', theOtherUser._id, chatId)}>
                                        <VideoCall titleAccess="Start a video call" className="icon" />
                            </button>
                        </>
                    }
                    <button onClick={() => {setMoreBtn(!moreBtn)
                                           setBackToConvBtn(false)
                    }} className="styled-btn hide-more-btn">
                        <MoreHoriz titleAccess="Conversation information" className="icon" />
                    </button>       
                </div>
            </div>
            <div className="center">
                
                {loader ?
                    <div className="loading-messages"><CircularProgress /></div>
                    :
                    messages.length !== 0 ? 
                        messages.map((message, i) => (
                            <div className={message.senderId === currentUser._id ? "message own" : "message"} 
                                key={i}>
                                <div className="texts">
                                    {message.fileType === "image" && 
                                        <img src={message.fileUrl} alt="message photo" onClick={() => setMediaViewer(message)} /> 
                                    }
                                    {message.fileType === "gif" && 
                                        <img src={message.fileUrl} alt="gif" /> 
                                    }
                                    {message.fileType === "video" && 
                                        <div className="video-message" onClick={() => setMediaViewer(message)}>
                                            <video src={message.fileUrl} alt="video message" />
                                            <span>
                                                <PlayCircleOutline className="icon" />
                                            </span> 
                                        </div>
                                    }
                                    <p className={message.fileType === "voice" && message.senderId !== currentUser._id && "p-color"}>
                                        {message.fileType === "voice" && 
                                            <i className="audio-player">
                                                <audio controls>
                                                    <source src={message.fileUrl} type="audio/webm" />
                                                    Your browser does not support the audio tag.
                                                </audio>
                                            </i>
                                        }
                                        {message.fileType === "pdf" || message.fileType === "document" ?
                                                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    {message.fileName}
                                                </a>
                                            :
                                                message.fileType === "text" &&
                                                <a href={message.fileUrl} target="_blank" download>
                                                   {message.fileName}
                                                </a>
                                        }
                                        {message.callType === "video" && <label htmlFor="" className="call-msg-div">
                                            <button className="styled-btn call-msg-btn" onClick={() => handleCall('video', theOtherUser._id, chatId)}>
                                                <VideoCall titleAccess="Start a video call" />
                                            </button>
                                            <span style={{marginBottom: message.callDuration ? "7px" : "0"}}>
                                                {message.callDuration === true ? 
                                                    "Call duration: " + message.callInfo.hours + "h " + message.callInfo.minutes + "m " + message.callInfo.seconds + "s"
                                                    :
                                                    message.senderId === currentUser._id ?
                                                    "They missed a call from you. Call them again." :
                                                    "You missed a call from them."
                                                }
                                            </span>
                                        </label>
                                            
                                        }
                                        {message.callType === "voice" && <label htmlFor="" className="call-msg-div">
                                            <button className="styled-btn call-msg-btn" onClick={() => handleCall('voice', theOtherUser._id, chatId)}>
                                                <Phone titleAccess="Start a voice call" />
                                            </button>
                                            <span style={{marginBottom: message.callDuration ? "8px" : "0"}}>
                                                {message.callDuration === true ? 
                                                    "Call duration: " + message.callInfo.hours + "h " + message.callInfo.minutes + "m " + message.callInfo.seconds + "s"
                                                    :
                                                    message.senderId === currentUser._id ?
                                                    "They missed a call from you. Call them again." :
                                                    "You missed a call from them."
                                                }
                                            </span>
                                        </label> 
                                        }
                                        
                                        {(() => {
                                            const splittedMessage = message.text.split(" ");

                                            return (
                                                <>
                                                    {splittedMessage.map((word, index) => 
                                                        word.startsWith("https://") || word.startsWith("http://") ? 
                                                        <a key={index} href={word} target="_blank" rel="noopener noreferrer">
                                                            {word}
                                                        </a>
                                                        :
                                                        word
                                                    ).reduce((prev, current) => [prev, " ", current])}
                                                </>
                                            )
                                        })()}
                                        <span>{format(message.createdAt)}</span>
                                    </p>
                                </div>
                            </div>
                        ))
                    :
                    !blockOrBlocked ?
                        theOtherUser._id !== currentUser._id ?
                            !img.file &&
                                <div className="first-time-chat">Start chatting now with {theOtherUser?.firstName}</div> 
                        :
                        !img.file &&
                            <div className="first-time-chat">Keep your notes safe here with yourself.</div>
                    :
                    <></> 
                }
                
                {messages.length !== 0 &&
                    (haveSeenMessage?.senderId === theOtherUser._id || (messages[messages.length - 1].senderId === currentUser._id && haveSeenIndicatior)) &&
                        <div className="hasSeenMessage">
                            <Check style={{fontSize: "16px"}}/>
                            <p>Seen</p>
                        </div>
                }
                
                

                {img.url && 
                    <div className="message own">
                        <div className="texts">
                            {img.file.type.startsWith("image/") ? 
                                <img src={img.url} alt="send photo" /> 
                                :
                                img.file.type.startsWith("video/") ?
                                    <video src={img.url} width={300} height={250} controls alt="send video" /> 
                            :
                                <p>{img.url}</p>
                            }
                        </div>
                        {img.file.type.startsWith("image/") || img.file.type.startsWith("video/") ? 
                            <div className={img.file.type.startsWith("video/") ? "delete-img-chat dlt-btn-position" : "delete-img-chat"}>
                                <button title="Delete attachment" onClick={handlePhotoDelete}>
                                    <Delete style={{marginTop: "3px"}}/>
                                </button>
                            </div>
                        :
                            <div className="delete-file-chat">
                                <button title="Delete attachment" onClick={handlePhotoDelete}>
                                    <Delete style={{marginTop: "3px"}}/>
                                </button>
                            </div>
                        }

                        {progress > 0 && progress < 100 && (
                            <div className="progress-bar-container">
                                <progress value={progress} max="100">{progress}</progress>
                            </div>
                        )}   
                    </div>
                }
                
                <div ref={endRef}></div> 
            </div>
            
            <div className="bottom">
                {!blockOrBlocked ? 
                    <form onSubmit={handleSendMessage}>
                        <div className="icons" ref={gifButton}>
                            {!isRecording && 
                            <>
                                <label htmlFor="file" className="styled-btn">
                                    <AddPhotoAlternate titleAccess="Attach a file" className="icon"/>
                                </label>
                                <input type="file" 
                                        id="file" 
                                        className="hide" 
                                        accept="image/*,.mp4,.mov,.avi,.mkv,.pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                                        onChange={handleFiles}
                                />
                                <button type="button" 
                                        className="styled-btn" 
                                        title="Choose a gif" 
                                        onClick={() => setOpenGifs(!openGifs)}>
                                    <Gif className="icon" style={{fontSize: "25px"}}/>
                                </button>
                            </>
                            }
                            {openGifs &&
                                <div className="gif-picker">
                                    <div className="search-bar">
                                        <label htmlFor="gif-input"><Search /></label>
                                        <input type="text" 
                                                id="gif-input"
                                                placeholder="Search for GIFs"
                                                ref={gifInput}
                                                onChange={(e) => handleSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="gif-results">
                                        {gifs.map((gif) => (
                                          <img
                                            key={gif.id}
                                            src={gif.images.fixed_height.url}
                                            alt={gif.title}
                                            onClick={() => handleSendGiff(gif.images.fixed_height.url)}
                                          />
                                        ))}
                                    </div>
                                </div>
                            }
                            {isRecording ? 
                                <button type="button" 
                                        className="styled-btn"
                                        onClick={deleteRecording}>
                                    <Delete titleAccess="Delete recorded voice" className="icon"/>
                                </button>
                            :
                                <button type="button" 
                                        className="styled-btn"
                                        onClick={startRecording}
                                >
                                    <Mic titleAccess="Send a voice clip" className="icon"/>
                                </button>
                            }   
                        </div>
                        {isRecording ?  
                            <p className="recording">Recording... {recordingTime} seconds</p>
                        : 
                            <textarea type="text"
                                    value={text}
                                    ref={textAreaRef}
                                    onClick={handleClick}
                                    placeholder="Write a message..."
                                    onChange={e => setText(e.target.value)}
                                    onSelect={(e) => setCursorPosition(e.target.selectionStart)}
                            />
                        }
                        <div className="emoji" ref={emoji}>
                            <button type="button" className="styled-btn" title="Choose an emoji">
                                <EmojiEmotions className="icon" onClick={() => setOpenEmoji(!openEmoji)}/>
                            </button>
                            <div className="picker">
                                <EmojiPicker open={openEmoji} 
                                            emojiStyle='facebook' 
                                            skinTonesDisabled 
                                            searchDisabled 
                                            width={300} 
                                            height={300}
                                            onEmojiClick={handleEmoji} 
                                />
                            </div>
                        </div>
                        {isRecording ? 
                            <button className="sendButton" 
                                    title="Send voice clip"
                                    type="button"
                                    onClick={SendRecording}
                                    > 
                                <Send className="btn-icon"/>
                            </button>
                        :
                            <button className="sendButton" 
                                    title={SendMessageBtnState ? "Send message" : ""}
                                    type="submit"
                                    disabled={!SendMessageBtnState}
                                    > 
                                <Send className="btn-icon"/>
                            </button>
                        }
                        
                    </form>
                :
                    <div className="blocked-alert">You can not reply to this conversation anymore.</div>
                }
            </div>  
        </div>
    )
}

export default Chat;
