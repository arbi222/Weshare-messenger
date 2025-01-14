import React, { useEffect, useState } from 'react'
import "./incomingCall.css"
import { useUserStore } from '../../../lib/userStore';
import { axiosJWT } from '../../../lib/axiosJWT';

const IncomingCallPopUp = ({calleeId, callType, handleAccept, handleDecline}) => {

    const {currentUser, accessToken} = useUserStore();
    const apiUrl = import.meta.env.VITE_API_URL;

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
                toast.error("Could not get the user's data!");
            }
        }
        getCaller();
    }, [calleeId])

    if (!theOtherUser) return;
    
    return (
        <div className='pop-up incomingcallPopUp'>
            
            <div className='user-call-info'>
                <img src={theOtherUser?.profilePicture ? theOtherUser?.profilePicture : 
                        theOtherUser?.gender === "Male" ? 
                        "/male.jpg" :
                        "/female.jpg"} 
                    alt="profile-picture" />
                <h3>{`${theOtherUser?.firstName} ${theOtherUser?.middleName} ${theOtherUser?.lastName} `}  
                    is {callType === "voice" ? "voice" : "video"} calling...
                </h3>
            </div>
            
            <div className='choosing-btns'>
                <button className='styled-btn accept' onClick={handleAccept}>Accept</button>
                <button className='styled-btn decline' onClick={handleDecline}>Decline</button>
            </div>
    
        </div>
    )
}

export default IncomingCallPopUp;