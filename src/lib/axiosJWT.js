import axios from "axios";
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';

const refreshToken =  async () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    try {
        const res = await axios.post(apiUrl + "/api/auth/refreshToken", {}, {withCredentials: true});
        Cookies.set("accessToken", res.data.accessToken, {
            secure: true,
            sameSite: "strict",
            path: "/",
        });

        return res.data;
    } catch (err) {
        console.log(err);
    }
}
export const axiosJWT = axios.create();

export function axiosInterceptor(accessToken) {
    axiosJWT.interceptors.request.use(
        async (config) => {
            let currentDate = new Date();
            const decodedToken = jwtDecode(accessToken);
            if (decodedToken.exp * 1000 < currentDate.getTime()) {
                const data = await refreshToken();
                config.headers["authorization"] = "Bearer " + data.accessToken;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );
}