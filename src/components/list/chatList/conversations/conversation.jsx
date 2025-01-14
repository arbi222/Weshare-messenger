import "./conversation.css"
import React, { useEffect, useState } from 'react'
import { Delete } from '@mui/icons-material';
import { axiosJWT } from "../../../../lib/axiosJWT";
import { toast } from "react-toastify";
import deleteFileByURL from "../../../../lib/deleteFile";

const Conversation = ({conversation, currentUser, 
                        accessToken, setDeletedConv, blockedState }) => {
                      
    const apiUrl = import.meta.env.VITE_API_URL;
    const [theOtherUser, setTheOtherUser] = useState(null);

    const getUser = async () => {
      try{                 
        const res = await axiosJWT.get(`${apiUrl}/api/users/getUser/${conversation.receiverId}/${currentUser._id}/?getBlocked=true`, {
          headers: {
              authorization: `Bearer ${accessToken}`
          }
        });
        setTheOtherUser(res.data);
      }
      catch(err){
        toast.error("Error! Could not get the user!")
      }
    };                     
    
    useEffect(() => {
      getUser();
    },[currentUser._id, accessToken, blockedState])

    const [deletedBtnClicked, setDeletedBtnState] = useState(false)
    const [mouseOver, setMouseOver] = useState(false);


    const deleteChatFiles = async (messages) => {
      try {
          const deletePromises = messages
              .filter((message) => message.fileUrl)
              .map(async (message) => {
                  deleteFileByURL(message.fileUrl);
              });
  
          await Promise.all(deletePromises);
      } catch (error) {
          toast.error("Error! Could not delete the media in this conversation!")
      }
  };


    const handleDeleteConv = async (conv) => {
      try{
        if (currentUser._id !== theOtherUser._id){  // deleting the conversation with other people
          const res = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, 
                    {conversationOwner: conv.receiverId, 
                      receiverId: conv.conversationOwner
                    }, {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
          });
          if (res.data.state !== "exists"){
            await axiosJWT.delete(`${apiUrl}/api/conversations/${conv._id}`, {
              headers: {
                  authorization: `Bearer ${accessToken}`
              }
            });

            const chat = await axiosJWT.get(`${apiUrl}/api/chats/${conv.chatId}` , {
              headers: {
                  authorization: `Bearer ${accessToken}`
              }
            })
            const messages = chat.data.messages;
            await deleteChatFiles(messages);

            await axiosJWT.delete(`${apiUrl}/api/chats/${conv.chatId}`, {
              headers: {
                  authorization: `Bearer ${accessToken}`
              }
            });
          }
          else{
            await axiosJWT.put(`${apiUrl}/api/chats`, {
              chatId: conv.chatId,
              userId: currentUser._id,
              timestamp: new Date()
            }, {
              headers: {
                  authorization: `Bearer ${accessToken}`
              }
            });
            await axiosJWT.delete(`${apiUrl}/api/conversations/${conv._id}`, {
              headers: {
                  authorization: `Bearer ${accessToken}`
              }
            });
          }          
        }
        else{ // deleting our conversation
          await axiosJWT.delete(`${apiUrl}/api/conversations/${conv._id}`, {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
          });
          const chat = await axiosJWT.get(`${apiUrl}/api/chats/${conv.chatId}` , {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
          })
          const messages = chat.data.messages;
          await deleteChatFiles(messages);

          await axiosJWT.delete(`${apiUrl}/api/chats/${conv.chatId}`, {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
          });
        }
        setTimeout(() => {
          setDeletedConv(true);
        }, 500);
      }
      catch(err){
        toast.error("Error! Something went wrong!")
      }
    }

  return (
    <div className={deletedBtnClicked ? "item delete-conv-animation" : "item"}>
      {theOtherUser && <div onMouseOver={() => setMouseOver(true)}
                            onMouseLeave={() => setMouseOver(false)}>
        <img className="post-profile-picture" 
              src={(theOtherUser.state === "blockedByYou" || (blockedState[theOtherUser._id] === "blockedByYou")) || 
                    (theOtherUser === "blockedByThem" || (blockedState[theOtherUser._id] === "blockedByThem")) ? 
                      "./blockedUser.png"
                      :
                      theOtherUser?.profilePicture ? theOtherUser?.profilePicture : 
                          theOtherUser?.gender === "Male" ? 
                          "/male.jpg" :
                          "/female.jpg"
                      } 
              alt="profile pic" 
          />
          <div className="texts" style={{color: !conversation.isSeen ? "cyan" : ""}}>
              <span>
                  {(theOtherUser.state === "blockedByYou" || (blockedState[theOtherUser._id] === "blockedByYou")) || 
                    (theOtherUser === "blockedByThem" || (blockedState[theOtherUser._id] === "blockedByThem")) ? "User" 
                  : 
                  theOtherUser._id === currentUser._id ?
                    currentUser.firstName + " " + currentUser.middleName + " " + currentUser.lastName + " (You)"
                    :
                    theOtherUser?.firstName + " " + theOtherUser?.middleName + " " + theOtherUser?.lastName
                  }
              </span>
              <p>
                  {conversation?.lastMessage.length > 25 ? conversation?.lastMessage.slice(0, 24) + "..." : conversation?.lastMessage}
              </p>
          </div>
          {mouseOver &&
            <div className='delete-button-div'>
              <button title='Delete Conversation' 
                      onClick={() => {handleDeleteConv(conversation)
                                    setDeletedBtnState(true)}} 
                      >
                <Delete style={{marginTop: "3px"}}/>
              </button>
            </div>
          }
        </div>
      }
    </div>
  )
}

export default Conversation;