import { Bounce, Flip, Slide, ToastContainer, Zoom } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"

const Notification = () => {
    return (
        <div>
            <ToastContainer transition={Flip} autoClose={3000} position="bottom-right" />
        </div>
    )
}

export default Notification;