import React from 'react'
import "./options.css"
import { AccountCircle, Settings, ExitToApp} from '@mui/icons-material';
import { useUserStore } from '../../../../lib/userStore';

const Options = () => {

    const {currentUser, logoutCall} = useUserStore();
    
    const handleProfilerClick = () => {
        window.open("https://wesharemedia.onrender.com/profile/" + currentUser._id, "_blank");
    }

    const handleSettingsClick = () => {
        window.open("https://wesharemedia.onrender.com/settings", "_blank");
    }

    const handleLogoutClick = async () => {
        await logoutCall();
        window.location.reload()
    }

  return (
    <div className='options'>
        
        <button onClick={handleProfilerClick}>
            <span><AccountCircle className='icon'/></span>
            <span>Go to profile</span>
        </button>
        <button onClick={handleSettingsClick}>
            <span><Settings className='icon'/></span>
            <span>Settings</span>
        </button>
        <hr />
        <button onClick={handleLogoutClick}>
            <span><ExitToApp className='icon'/></span>
            <span>Log out</span>
        </button>

    </div>
  )
}

export default Options;
