import { useRef, useState } from "react"
import "./addUser.css"
import { axiosJWT } from "../../../../lib/axiosJWT";
import { toast } from "react-toastify";

const AddUser = ({currentUser, accessToken, onConversationUpdate, setOpenSearch, handleSelect}) => {

    const apiUrl = import.meta.env.VITE_API_URL;
    const [foundedUsers, setFoundedUsers] = useState([]);
    const [notFoundedUsers, setNotFoundedUsers] = useState(false);
    const query = useRef();

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!query.current.value) {
            setFoundedUsers([]);
            return;
        }
        
        try{
            const res = await axiosJWT.get(`${apiUrl}/api/users/search/people?q=${query.current.value}&userId=${currentUser._id}`, {
                headers: {
                    authorization: `Bearer ${accessToken}`
                }
              });
              if (res.data.length !== 0){
                setFoundedUsers(res.data);
                setNotFoundedUsers(false);
              }
              else{
                setNotFoundedUsers(true);
              }
        }
        catch(err){
            toast.error("Error! Could not any user!")
        }
    }

    const createConversation = async (user) => {
        try{
            if (currentUser._id === user._id){ // it means we wanna create or get a conversation with ourself
                const conversation = {
                    conversationOwner: currentUser._id,
                    receiverId: currentUser._id,
                    lastMessage: "",
                    isSeen: true
                }

                const res = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation , {
                    headers: {
                        authorization: `Bearer ${accessToken}`
                    }
                });
                if (res.data.state !== "exists"){
                    const response = await axiosJWT.post(apiUrl + "/api/chats", {}, {
                        headers: {
                            authorization: `Bearer ${accessToken}`
                        }
                    });
                    conversation.chatId = response.data._id;
                    const createdConv = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation , {
                        headers: {
                            authorization: `Bearer ${accessToken}`
                        }
                    });
                    handleSelect(createdConv.data);
                }
                else{
                    toast.warn("Chat already exists!");
                    handleSelect(res.data.conversation);
                }
            }
            else{       // it means we wanna create or get a conversation with other people
                const conversation1 = {
                    conversationOwner: currentUser._id,
                    receiverId: user._id,
                    lastMessage: `Say hi to ${user.firstName}`,
                    isSeen: true
                }

                const conversation2 = {
                    conversationOwner: user._id,
                    receiverId: currentUser._id,
                }

                const res1 = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation1 , {
                  headers: {
                      authorization: `Bearer ${accessToken}`
                  }
                });
                const res2 = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create?find=true`, conversation2 , {
                  headers: {
                      authorization: `Bearer ${accessToken}`
                  }
                });
                if (res1.data.state !== "exists" && res2.data.state !== "exists"){
                    const response = await axiosJWT.post(apiUrl + "/api/chats", {}, {
                        headers: {
                            authorization: `Bearer ${accessToken}`
                        }
                    });
                    conversation1.chatId = response.data._id;
                    const createdConv = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation1 , {
                      headers: {
                          authorization: `Bearer ${accessToken}`
                      }
                    });
                    handleSelect(createdConv.data);
                }
                else if (res1.data.state !== "exists" && res2.data.state === "exists"){
                    conversation1.chatId = res2.data.conversation.chatId;
                    const createdConv = await axiosJWT.post(`${apiUrl}/api/conversations/find_or_create`, conversation1 , {
                      headers: {
                          authorization: `Bearer ${accessToken}`
                      }
                    });
                    handleSelect(createdConv.data);
                }
                else{
                    toast.warn("Chat already exists!");
                    handleSelect(res1.data.conversation);
                }
            }

            onConversationUpdate();
            setOpenSearch(false);
        }   
        catch(err){
            toast.error("Error! Something went wrong!")
        }
    }

    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder="Search users" ref={query} autoFocus/>
                <button type="submit">Search</button>
            </form>
            {notFoundedUsers ? 
                <div style={{textAlign: "center", marginTop:"20px"}}>No users found.</div>
            :
                <div className={foundedUsers.length !== 0 ? "scroller" : "hide"}>
                    {foundedUsers.map((user) => (
                        <div className="user" key={user._id}>
                            <div className="detail">
                                <img src={user?.profilePicture ? user?.profilePicture
                                        :
                                        user.gender === "Male" ? "/male.jpg" 
                                        : 
                                        "/female.jpg"
                                    } 
                                    alt="profile pic" />
                                <span>{user?.firstName + " " + user?.middleName + " " + user?.lastName}</span>
                            </div>
                            <button onClick={() => createConversation(user)}>Message</button>
                        </div>
                    ))}
                </div>
            }   
        </div>
    )
}

export default AddUser;