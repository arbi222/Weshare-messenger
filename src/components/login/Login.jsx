import "./login.css"
import { useState , useEffect } from "react";
import { Visibility , VisibilityOff } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useUserStore } from "../../lib/userStore"
import TFA from "./twoFactorPopUp/TFA";
import { toast } from "react-toastify";


const Login = () => {

    const {currentUser, logInUserwithCredentials, askingForTwoFaCode, updateState} = useUserStore();

    const [loading, setLoading] = useState(false);
    const [openTFA_pop_up, setTFA_pop_up] = useState(false);

    const [isShowPassOpen, setIsShowPassOpen] = useState(false);
    const [LoginValues, setLoginValues] = useState({email: '', pass: ''});

    const credentialsHandler = (credentials) => {
        return (event) => {
            setLoginValues({...LoginValues, [credentials]: event.target.value});
        };
    };

    useEffect(() => {
        if (askingForTwoFaCode) {
            setTFA_pop_up(true);
        }
        else{
            setTFA_pop_up(false);
        }
    },[askingForTwoFaCode])


    const handleLogin = async (e) => {
        e.preventDefault();

        setLoading(true);
        const res = await logInUserwithCredentials(LoginValues.email, LoginValues.pass);
        if (res){
            if (res.response.status === 401){
                toast.error("Wrong password!")
                setLoading(false);
            }
            else if (res.response.status === 404){
                toast.error(res.response.data)
                setLoading(false);
            }
            else{   
                setLoading(false);
            }   
        }
        else{
            setLoading(false);
        }
    }


    useEffect(() => {
        if (LoginValues.pass === ''){
            document.getElementsByClassName("show-hide-pass")[0].classList.add("hide");
            document.getElementsByClassName("show-hide-pass")[1].classList.add("hide");
        }
        else{
            if (isShowPassOpen){
                document.getElementsByClassName("show-hide-pass")[0].classList.remove("hide");
                document.getElementsByClassName("show-hide-pass")[1].classList.add("hide");
                }
            else{
                document.getElementsByClassName("show-hide-pass")[1].classList.remove("hide");
                }
        }
    },[LoginValues.pass])

    useEffect(() => {
        if (isShowPassOpen){
            document.getElementById("pass-enter").type = "text";
        }
        else{
            document.getElementById("pass-enter").type = "password";
            }
    },[isShowPassOpen])

    const handleRegisterClick = () => {
        window.open("https://wesharemedia.onrender.com/login?registerFromMessenger=true", "_blank");
    }

    const handleForgotPassClick = () => {
        window.open("https://wesharemedia.onrender.com/login?recoverPassFromMessenger=true", "_blank");
    }

    return (
        <>
            <div className={openTFA_pop_up ? "login blur-background" : "login"}>
                <div className='main-class-item item1'>
                    <div>
                        <h1>Weshare</h1>
                        <h1 className="last-item">Messenger</h1>
                    </div>
                    <p>Weshare Messenger makes it easy and fun to stay close to your favorite people.</p>
                </div>
                <div className="main-class-item item2">
                    <div>
                        <form onSubmit={handleLogin}>
                            <input type="email"
                                   placeholder="Email"
                                   onInvalid={e => e.target.setCustomValidity("Please enter your email")} 
                                   onInput={e => e.target.setCustomValidity('')} 
                                   autoFocus
                                   required 
                                   onChange={credentialsHandler("email")}/>
                            <input id="pass-enter" 
                                   type="password"
                                   autoComplete="off"
                                   onInvalid={e => e.target.setCustomValidity("Please enter your password")} 
                                   onInput={e => e.target.setCustomValidity('')} 
                                   required
                                   minLength="6" 
                                   placeholder="Password" 
                                   onChange={credentialsHandler("pass")} />
                            <button type="submit" disabled={loading}>
                                    {loading ? 
                                        <>
                                            <CircularProgress color='#fff' size="20px"/>
                                        </> 
                                        : 
                                        "Log In"
                                    }
                            </button>

                            <a role='button' onClick={handleForgotPassClick}>Forgot password?</a>

                            <hr></hr>

                            <button className="create-account" type="button" onClick={handleRegisterClick}>Create new account</button>
                        </form>

                        <button onClick={() => {setIsShowPassOpen(!isShowPassOpen)}} 
                                            className={`${isShowPassOpen ? "show-hide-pass" : "show-hide-pass hide"}`}>
                                            <Visibility />
                        </button>
                        <button onClick={() => {setIsShowPassOpen(!isShowPassOpen)}} 
                                            className={`${isShowPassOpen ? "show-hide-pass hide" : "show-hide-pass"}`}>
                                            <VisibilityOff />
                        </button>
                    </div>
                </div>
            </div>

            {openTFA_pop_up && 
                <TFA userEmail={currentUser.username}
                    userId={currentUser._id} 
                    setTFA_pop_up={setTFA_pop_up} 
                    updateState={updateState}
                />
            }
        </>
    )
}

export default Login;