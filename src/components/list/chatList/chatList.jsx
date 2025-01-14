import "./chatList.css"
import { useEffect, useState, useRef } from "react";
import { Add , Remove, Search } from '@mui/icons-material';
import AddUser from "./addUser/addUser"
import { CircularProgress } from '@mui/material';
import { axiosJWT } from "../../../lib/axiosJWT";
import Conversation from "./conversations/conversation";
import { useUserStore } from "../../../lib/userStore";
import { useChatStore } from "../../../lib/chatStore";
import { useLocation } from 'react-router-dom';
import { toast } from "react-toastify";
import playSound from "../../../lib/sounds";

const ChatList = ({openSearch, setOpenSearch, conversations, setConversations, 
                    blockedState, setSeenFunction, setBackToConvBtn, 
                    setSelectedConv, selectedConv, openAlertPopUp, openMediaViewer, 
                    setAlertOpenPopUp, incomingCall, getConversations,
                    deletedConv, setDeletedConv}) => {

    const {currentUser, accessToken, socket} = useUserStore();
    const apiUrl = import.meta.env.VITE_API_URL;
    const {changeChat} = useChatStore();

    const [initialLoad, setInitialLoad] = useState(true);
    const [convLoader, setConvLoader] = useState(true);

    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const linkConversationId = searchParams.get("conversation");
    const linkFriendId = searchParams.get("user");

    useEffect(()=> {
        getConversations();
        setConvLoader(false);
    },[currentUser._id, deletedConv])

    const [arrivalMessage, setArrivalMessage] = useState(null);
    useEffect(() => {
        const handleMessageArrival = (data) => {
            setArrivalMessage({
                senderId: data.senderId,
                message: data.text
            });
        };
    
        socket.on("getMessage", handleMessageArrival);
    
        return () => {
            socket.off("getMessage", handleMessageArrival);
        };
    }, [socket]);

    useEffect(() => {
        if (arrivalMessage){
            createConversation(arrivalMessage.senderId, arrivalMessage.message);
            playSound("/message.mp3", false);
        }
    }, [arrivalMessage])

    const createConversation = async (messageSender, message) => {
        const conversation1 = {
            conversationOwner: currentUser._id,
            receiverId: messageSender,
            lastMessage: message,
            isSeen: false
        }

        try{
            const res1 = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation1, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
        
            if (res1.data.state === "exists"){
                if (conversations.length === 0){
                    getConversations();
                    setSelectedConv(res1.data.conversation);
                    const userRes = await axiosJWT.get(`${apiUrl}/api/users/getUser/${res1.data.conversation.receiverId}/${currentUser._id}`, {
                        headers: {
                            authorization: `Bearer ${accessToken}`
                        }
                    });
                    changeChat(res1.data.conversation.chatId, userRes.data);
                }
                else{
                    const existingConv = conversations.find(conv => conv._id === res1.data.conversation._id);
                    if (!existingConv){
                        const userRes = await axiosJWT.get(`${apiUrl}/api/users/getUser/${res1.data.conversation.receiverId}/${currentUser._id}`, {
                            headers: {
                                authorization: `Bearer ${accessToken}`
                            }
                        });
                        res1.data.conversation.receiverUser = userRes.data;
                        setConversations([res1.data.conversation, ...conversations]);
                    }
                }
            }
        }
        catch(err){
            toast.error("Error! Could not get the new conversation!")
        }
        
    }

    useEffect(() => {
        if (conversations.length > 0){
            setSelectedConv(conversations[0]);
            changeChat(conversations[0].chatId, conversations[0].receiverUser);
            document.title = conversations[0].receiverUser.firstName && conversations[0].receiverUser.lastName ? 
            `${conversations[0].receiverUser.firstName} ${conversations[0].receiverUser.lastName} | W-Messenger` : "Weshare Messenger"
        }
    }, [deletedConv])

    useEffect(() => {
        if (initialLoad && conversations.length > 0) {
          setSelectedConv(conversations[0]);
          changeChat(conversations[0].chatId, conversations[0].receiverUser);
          setInitialLoad(false);
        }
    }, [conversations, initialLoad]);

    const setUpConversationFromLinks = async (conv) => {
        try{
            const userRes = await axiosJWT.get(`${apiUrl}/api/users/getUser/${conv.receiverId}/${currentUser._id}/?getBlocked=true`, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            });
            const conversationWithUserDetails = {
                ...conv,
                receiverUser: userRes.data
            }
    
            setSelectedConv(conversationWithUserDetails);
            changeChat(conversationWithUserDetails.chatId, conversationWithUserDetails.receiverUser);
            handleSelect(conversationWithUserDetails);
            document.title = conversationWithUserDetails.receiverUser.firstName && conversationWithUserDetails.receiverUser.lastName ? 
                            `${conversationWithUserDetails.receiverUser.firstName} ${conversationWithUserDetails.receiverUser.lastName} | W-Messenger` : "Weshare Messenger"
        }
        catch(err){
            toast.error("Error! Something went wrong!")
        }
    }

    useEffect(() => {
        const getConv = async () => {
            try{
                if (linkConversationId){
                    const res = await axiosJWT.get(apiUrl + "/api/conversations/getConv/" + linkConversationId, {
                        headers: {
                            authorization: `Bearer ${accessToken}`
                        }
                    });
                    const conv = res.data;
                    setUpConversationFromLinks(conv);
                }
                else if (linkFriendId){
                    const res = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, 
                        {conversationOwner: currentUser._id, 
                          receiverId: linkFriendId
                        }, {
                        headers: {
                            authorization: `Bearer ${accessToken}`
                        }
                    });
                    if (res.data.state === "exists"){
                        const conv = res.data.conversation;
                        setUpConversationFromLinks(conv);
                    }
                    else{ // if the conv with this friend doesnt exist...
                        let userResponse;
                        try{
                            // first we gonna check if the linkfriendid is a valid id of any user
                            userResponse = await axiosJWT.get(`${apiUrl}/api/users/getUser/${linkFriendId}/${currentUser._id}/?getBlocked=true`, {
                                headers: {
                                    authorization: `Bearer ${accessToken}`
                                }
                            })
                        }
                        catch(err){
                            setAlertOpenPopUp("noUserConv")
                        }
                        
                        if (userResponse?.status === 200){
                            const conversation1 = {
                                conversationOwner: currentUser._id,
                                receiverId: linkFriendId,
                                lastMessage: `Say hi to your friend.`,
                                isSeen: true
                            }
        
                            const conversation2 = {
                                conversationOwner: linkFriendId,
                                receiverId: currentUser._id,
                            }
        
                            const res2 = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation2, {
                                headers: {
                                    authorization: `Bearer ${accessToken}`
                                }
                            });
                            if (res2.data.state !== "exists"){
                                const response = await axiosJWT.post(apiUrl + "/api/chats", {}, {
                                    headers: {
                                        authorization: `Bearer ${accessToken}`
                                    }
                                });
                                conversation1.chatId = response.data._id;
                                const createdConv = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation1, {
                                    headers: {
                                        authorization: `Bearer ${accessToken}`
                                    }
                                });
                                getConversations();
                                setUpConversationFromLinks(createdConv.data);
                            }
                            else if (res2.data.state === "exists") {
                                conversation1.chatId = res2.data.conversation.chatId;
                                const createdConv = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation1, {
                                    headers: {
                                        authorization: `Bearer ${accessToken}`
                                    }
                                });
                                getConversations();
                                setUpConversationFromLinks(createdConv.data);
                            }
                            else{
                                return;
                            }
                        }
                    }
                }
                else{
                    return;
                }
            }
            catch(err){
                toast.error("Error! Something went wrong!")
            }
        }
        getConv()
    }, [linkConversationId, linkFriendId])

    useEffect(() => {
        const handleGetConversation = (data) => {
            const { receiverId, chatId, lastMessage, isSeen } = data;
            
            setConversations((prevConversations) => {
                const updatedConversations = prevConversations.map((conv) =>
                    conv.chatId === chatId && conv.receiverId === receiverId
                        ? { ...conv, lastMessage, isSeen, updatedAt: Date.now() }
                        : conv
                );
    
                return updatedConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            });
        };
    
        socket.on("getConversation", handleGetConversation);
        
        return () => {
            socket.off("getConversation", handleGetConversation);
        };
    }, [socket]);

    const handleSelect = async (conversation) => {
        try{
            const res = await axiosJWT.get(`${apiUrl}/api/users/getUser/${conversation.receiverId}/${currentUser._id}/?getBlocked=true`, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
            })
            changeChat(conversation.chatId, res.data);
            setSelectedConv(conversation)
            setBackToConvBtn(false)
            document.title = res.data.firstName && res.data.lastName ? 
                            `${res.data.firstName} ${res.data.lastName} | W-Messenger` : "Weshare Messenger"

            if (!conversation.isSeen){
                await axiosJWT.put(apiUrl + "/api/conversations/" + conversation._id, {isSeen: true}, {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                });
                setConversations((prevConversations) => {
                    return prevConversations.map((conv) =>
                            conv.chatId === conversation.chatId && conv.receiverId === conversation.receiverId
                                ? {...conv, isSeen: true}
                                : conv
                    )
                })

                setSeenFunction(true);
            }
        }
        catch(err){
            toast.error("Error! Something went wrong!")
        }
    }

    const [input, setInput] = useState("");
    const filteredConversations = conversations.filter((conv) => {
        const fullName = `${conv.receiverUser?.firstName} ${conv.receiverUser?.middleName || ''} ${conv.receiverUser?.lastName}`.toLowerCase();
        const searchInput = input.replace(/\s+/g, ' ').toLowerCase().trim();

        const searchWords = searchInput.split(' ');

        return searchWords.every((word) => fullName.indexOf(word) !== -1);
    });

    const openSearchBtn = useRef();
    const openSearchComponent = useRef();
    useEffect(() => {
        if (openSearch){
          const handleButton = (e) => {
            if (!openSearchBtn.current.contains(e.target) && !openSearchComponent.current.contains(e.target)){
              setOpenSearch(false);
            }
          }
      
          document.addEventListener("mousedown", handleButton);
    
          return () => {
            document.removeEventListener("mousedown", handleButton);
          }
        }
    })

    useEffect(() => {
        if (openAlertPopUp || openMediaViewer || incomingCall){
            document.getElementById("main-chatList").classList.add("blur-background");
            if (incomingCall){
                setOpenSearch(false);
            }  
        }
        else{
            document.getElementById("main-chatList").classList.remove("blur-background");
        }
    }, [openAlertPopUp, openMediaViewer, incomingCall])

    return (
        <div id="main-chatList" className="chatList">
            <div className="search">
                <div className="searchBar">
                    <label htmlFor="search"><Search style={{marginTop: "3.5px"}}/></label>
                    <input type="text" id="search" placeholder="Search" onChange={(e) => setInput(e.target.value)}/>
                </div>
                <button className="add" 
                        type="button"
                        ref={openSearchBtn} 
                        title={openSearch ? "Close" : "Create new conversation"} 
                        onClick={() => setOpenSearch(!openSearch)}
                    >
                    {openSearch ? <Remove /> : <Add />} 
                </button>
            </div>
    
            {!convLoader ? 
                filteredConversations.length !== 0 ?
                filteredConversations.map((conv) => (
                        <div key={conv.receiverId} 
                            style={{backgroundColor: selectedConv._id === conv._id ? "rgba(17, 25, 40, 0.35)" : "transparent"}} 
                            onClick={() => handleSelect(conv)}
                        >
                            <Conversation conversation={conv} 
                                          accessToken={accessToken} 
                                          currentUser={currentUser}
                                          setDeletedConv={setDeletedConv}
                                          deletedConv={deletedConv}
                                          blockedState={blockedState}
                                          allConversations={conversations}
                            />
                        </div>
                    ))
                    :
                    <span className='message-loader-text'>Your conversation list is empty!</span>

                :

                <div className='message-loader-text'>
                    <CircularProgress size="35px" className="icon-loader" />
                </div>
            }
                
            {openSearch && <div ref={openSearchComponent}>
                <AddUser currentUser={currentUser} 
                        accessToken={accessToken} 
                        onConversationUpdate={getConversations}
                        setOpenSearch={setOpenSearch}
                        changeChat={changeChat}
                        handleSelect={handleSelect}
                /></div>
            }
        </div>
    )
}

export default ChatList;