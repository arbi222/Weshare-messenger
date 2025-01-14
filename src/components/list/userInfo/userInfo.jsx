import "./userInfo.css"
import { MoreVert } from '@mui/icons-material';
import Options from "./options/Options";
import { useState, useEffect, useRef } from "react";
import { useUserStore } from "../../../lib/userStore";

const UserInfo = ({openAlertPopUp , openMediaViewer, callPopUp, incomingCall}) => {

    const {currentUser} = useUserStore();

    const [optionsButton, setOptionsButton] = useState(false);
    const optionsMenu = useRef();

    useEffect(() => {
        if (optionsButton){
          const handleOptionButton = (e) => {
            if (!optionsMenu.current.contains(e.target)){
                setOptionsButton(false);
            }
          }
          document.addEventListener("mousedown", handleOptionButton);
    
          return () => {
            document.removeEventListener("mousedown", handleOptionButton);
          }
        }  
      })

    return (
        <div className={openAlertPopUp || openMediaViewer || callPopUp || incomingCall ? "user-info blur-background" : "user-info"} ref={optionsMenu}>
            <div className="user">
              <img className="post-profile-picture" 
                src={currentUser?.profilePicture ? currentUser?.profilePicture : 
                        currentUser?.gender === "Male" ? 
                        "/male.jpg" :
                        "/female.jpg"
                    } 
                alt="profile pic" 
              />
              <h2>{currentUser?.firstName + " " + currentUser?.middleName + " " + currentUser?.lastName}</h2>
            </div>
            <div className="icons" title={optionsButton ? "Close" : "See options"} onClick={() => setOptionsButton(!optionsButton)}>
                <button style={{color: "#fff"}} className="styled-btn"><MoreVert className="icon" /></button>
            </div>
                
            {optionsButton && 
              <div className="options-component">
                <Options />
              </div>
            }
        </div>
    )
}

export default UserInfo;