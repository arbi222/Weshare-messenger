import "./tfa.css"
import React , {useRef} from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import { Close } from "@mui/icons-material"
import { toast } from 'react-toastify'
import {io} from "socket.io-client";

const TFA = ({userEmail, userId, setTFA_pop_up, updateState}) => {

    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl = import.meta.env.VITE_SOCKET_URL;

    const authCode = useRef(); 

    const verifyAuthCode = async (e) => {
        e.preventDefault();

        try{
            const res = await axios.post(apiUrl + "/api/twoFactor/verifyLoginAuthCode/" + authCode.current.value, {email: userEmail});
            Cookies.set("accessToken", res.data, {
                secure: true,
                sameSite: "strict",
                path: "/"
            })

            const socket = io(socketUrl);
            socket.emit("addUser", userId);
            updateState(res.data, socket, false);   // accesstoken, socket, askingfortwofactor 
            setTFA_pop_up(false);
            toast.success("Login granted!");
        }
        catch(err){
            toast.error(err.response.data);
        }
    }

  return (
    <>
      <div className="pop-up tfa-login-container">

            <div className='tfa-login-header'>
                <h2>Two Factor Authentication</h2>
                <button title='Close' onClick={() => setTFA_pop_up(false)}>
                    <Close style={{marginTop: "3px"}}/>
                </button>
            </div>

            <hr></hr>
                
            <p>Please enter the code that you received in your email in order to login:</p>
           
            <form onSubmit={verifyAuthCode}>
                <input  
                    autoFocus
                    type='text'
                    placeholder='Authentication Code'
                    required
                    maxLength="8"
                    ref={authCode}>
                </input>                           
                <button type='submit'>Verify Code</button>
            </form>

        </div>
    </>
  )
}

export default TFA;
