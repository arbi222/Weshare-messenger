import { create } from 'zustand';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import { axiosJWT, axiosInterceptor } from './axiosJWT';
import { toast } from 'react-toastify';
import {io} from "socket.io-client";

export const useUserStore = create((set, get) => ({
    currentUser: null,
    isLoading: true,
    accessToken: null,
    askingForTwoFaCode: false,
    socket: null,
    
    // Initialization function to set up interceptors and fetch user data
    initialize: async () => {
        const { fetchUserData } = get();

        const accessToken = Cookies.get("accessToken");

        if (!accessToken) {
            set({ isLoading: false });
            return;
        }

        axiosInterceptor(accessToken);

        if (accessToken) {
            await fetchUserData(accessToken)
                .catch((err) => {
                    toast.error("Error! Could not get user!")
                    set({ currentUser: null, accessToken: null });
                })
                .finally(() => {
                    set({ isLoading: false });
                });
        } else {
            set({ isLoading: false });
        }
    },
    
    // Function to keep user loggedIn when refreshing pages
    fetchUserData: async (accessToken) => {
        if (!accessToken) return set({ currentUser: null, isLoading: false });

        const apiUrl = import.meta.env.VITE_API_URL;
        const socketUrl = import.meta.env.VITE_SOCKET_URL;
        try {
            const decodedAccessToken = jwtDecode(accessToken);

            const res = await axiosJWT.get(`${apiUrl}/api/users/getUser/${decodedAccessToken.id}/` + decodedAccessToken.id, {
                headers: {
                    authorization: `Bearer ${accessToken}`,
                },
            });

            let socket = get().socket;

            if (!socket) {
                socket = io(socketUrl);
                socket.emit("addUser", decodedAccessToken.id);
            }
            
            set({ currentUser: res.data, isLoading: false, accessToken: accessToken, socket: socket});

        } catch (err) {
            toast.error("Error! Could not get user!")
            set({ currentUser: null, isLoading: false });
        }
    },

    // Function to fetch user information when trying to log in
    logInUserwithCredentials: async (username, password) => {
        if (!username && !password) return set({currentUser: null, isLoading: false})

        const apiUrl = import.meta.env.VITE_API_URL;
        const socketUrl = import.meta.env.VITE_SOCKET_URL;
        try{
            const res = await axios.post(apiUrl + "/api/auth/login", {username, password}, {
                withCredentials: true
            });
            if (res.data.userInfo.isTwoFactorAuthOn){
                try{
                    const response = await axios.post(apiUrl + "/api/twoFactor/sendEmailLoginCode", {email: res.data.userInfo.username});
                    set({currentUser: res.data.userInfo, isLoading: false, askingForTwoFaCode: true});
                    toast.success(response.data);
                }
                catch(err){
                    set({currentUser: null, isLoading: false});
                    toast.error(err.response.data)
                }
            }
            else{
                Cookies.set("accessToken", res.data.accessToken, {
                    secure: true,
                    sameSite: "strict",
                    path: "/"
                })

                const socket = io(socketUrl)
                socket.emit("addUser", res.data.userInfo._id);

                axiosInterceptor(res.data.accessToken);
                
                set({ currentUser: res.data.userInfo, accessToken: res.data.accessToken, isLoading: false, socket: socket});
                toast.success("Logged in successfully!")
            }

        }
        catch(err){
            set({currentUser: null, isLoading: false, accessToken: null});
            return err;
        }
    },

    // function to set state after verifying the authentication code
    updateState: (accessToken, socket, askingForTwoFaCode) => {
        set({accessToken: accessToken, socket: socket, askingForTwoFaCode: askingForTwoFaCode})
    },

    logoutCall: async () => {
        const apiUrl = import.meta.env.VITE_API_URL;
        try{
            const res = await axios.get(apiUrl + "/api/auth/logout");
            if (res.status === 200){
                const { socket } = get();
                if (socket){
                    socket.disconnect();
                }
                set({currentUser: null, isLoading: false, accessToken: null, socket: null});
                Cookies.remove("accessToken");
            }
        }
        catch(err){
            console.log(err);
        }
    }
}));
