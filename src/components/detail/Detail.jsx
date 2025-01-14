import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { axiosJWT } from "../../lib/axiosJWT";
import "./detail.css"
import { ChevronRight, ArrowBack } from '@mui/icons-material';
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import Media from "./sharedMedia/Media";

const Detail = ({openSearch, blockedState, moreBtn, setMoreBtn, setBackToConvBtn, messages, 
                openAlertPopUp, setMediaViewer, openMediaViewer, incomingCall}) => {

    const {currentUser, accessToken, socket} = useUserStore();
    const apiUrl = import.meta.env.VITE_API_URL;
    const {theOtherUser} = useChatStore();

    const handleProfilerClick = () => {
        window.open("https://wesharemedia.onrender.com/profile/" + theOtherUser._id, "_blank");
    }

    const [callMediaComponent, setCallMediaComponent] = useState(false)
    const handleSharedMedia = () => {
        setCallMediaComponent(true);
        setMoreBtn(true);
        setBackToConvBtn(false)
    }

    const [callFilesComponent, setCallFilesComponent] = useState(false)
    const handleSharedFiles = () => {
        setCallFilesComponent(true);
        setMoreBtn(true);
        setBackToConvBtn(false)
    }

    const handleBlocking = async () => {
        try{
            const res = await axiosJWT.put(`${apiUrl}/api/users/${theOtherUser._id}/blockUnblockUser`, 
                {userId: currentUser._id}, 
                {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                }
            );
            if (blockedState[theOtherUser._id] === "blockedByYou" || currentUser.blockList.includes(theOtherUser._id)){
                socket.emit("unBlockUser", {
                    currentUserId: currentUser._id,
                    theBlockedOneId: theOtherUser._id
                })
            }
            else{
                socket.emit("blockUser", {
                    currentUserId: currentUser._id,
                    theBlockedOneId: theOtherUser._id
                })
            }
            toast.success(res.data);
        }
        catch(err){
            toast.error("Error! Could not perform this action!")
        }
    }

    useEffect(() => {
        if (openSearch || openAlertPopUp || openMediaViewer || incomingCall){
            if (!callMediaComponent && !callFilesComponent){
                document.getElementById("main-details-div").classList.add("blur-background");
            }
        }
        else{
            if (!callMediaComponent && !callFilesComponent){
                document.getElementById("main-details-div").classList.remove("blur-background");
            }
        }
    }, [openSearch, openAlertPopUp, openMediaViewer, incomingCall])

    if (callMediaComponent || callFilesComponent){
        return <Media callMediaComponent={callMediaComponent} 
                      callFilesComponent={callFilesComponent} 
                      setCallMediaComponent={setCallMediaComponent}
                      setCallFilesComponent={setCallFilesComponent} 
                      openSearch={openSearch}
                      openAlertPopUp={openAlertPopUp}
                      messages={messages} 
                      theOtherUser={theOtherUser}
                      setMediaViewer={setMediaViewer}
                      openMediaViewer={openMediaViewer}
                      incomingCall={incomingCall} />
    }

    const blockOrBlocked = (theOtherUser.state === "blockedByYou" || (blockedState[theOtherUser._id] === "blockedByYou")) || 
                        (theOtherUser === "blockedByThem" || (blockedState[theOtherUser._id] === "blockedByThem"))

    return (
        <div id="main-details-div" className={!moreBtn ? "detail-container-hiding" : "detail-container"}>                         
            <div className="back-to-conversation-btn">
                <button className="styled-btn" onClick={() => setMoreBtn(!moreBtn)}>
                    <ArrowBack  style={{marginTop: "3px", fontSize: "25px"}} />
                </button>
            </div>
            <div className="user">
                <img src={blockOrBlocked ?
                                "/blockedUser.png"
                                :
                                theOtherUser?.profilePicture ? theOtherUser?.profilePicture : 
                                theOtherUser?.gender === "Male" ? 
                                "/male.jpg" :
                                "/female.jpg"
                        }  
                        alt="profile pic" />
                <h2>
                    {blockOrBlocked ? "User"
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
                </h2>
                {!blockOrBlocked &&
                        <div>
                            <button title="Profile" onClick={handleProfilerClick}>
                                <img src="./Wesharefavicon.ico" />
                            </button>
                            <span>Weshare Profile</span>
                        </div>
                }
            </div>
            <div className="info">
                <button className={blockOrBlocked ? "option blocked-state" : "option"} 
                        onClick={handleSharedMedia} 
                        disabled={blockOrBlocked}>
                    <div className="title">
                        <span>Shared Media</span>
                        <ChevronRight />
                    </div>
                </button>
                <button className={blockOrBlocked ? "option blocked-state" : "option"} 
                        onClick={handleSharedFiles} 
                        disabled={blockOrBlocked}>
                    <div className="title">
                        <span>Shared Files</span>
                        <ChevronRight />
                    </div>
                </button>
                {currentUser._id !== theOtherUser._id &&    
                    (theOtherUser !== "blockedByThem" && blockedState[theOtherUser._id] !== "blockedByThem") &&
                    <div className="block-btn-div">
                        <button onClick={handleBlocking}>
                            {(theOtherUser.state === "blockedByYou" || (blockedState[theOtherUser._id] === "blockedByYou")) ? "Unblock User" : "Block User"}
                        </button> 
                    </div>
                }
            </div>
        </div>
    )
}

export default Detail;