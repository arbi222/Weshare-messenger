import "./list.css"
import UserInfo from "./userInfo/userInfo"
import ChatList from "./chatList/chatList" 

const List = ({openSearch, setOpenSearch, setConversations, 
            conversations, blockedState,setSeenFunction, 
            setSelectedConv, selectedConv, backToConvBtn, setBackToConvBtn, 
            openAlertPopUp, openMediaViewer, setAlertOpenPopUp, incomingCall,
            getConversations, deletedConv, setDeletedConv}) => {

    return (
        <div className={backToConvBtn ? "list" : "list-hiding"}>
            <UserInfo openAlertPopUp={openAlertPopUp} openMediaViewer={openMediaViewer} incomingCall={incomingCall}/>
            <ChatList openSearch={openSearch} 
                    setOpenSearch={setOpenSearch} 
                    setConversations={setConversations}
                    conversations={conversations}
                    blockedState={blockedState}
                    setSelectedConv={setSelectedConv}
                    selectedConv={selectedConv}
                    setSeenFunction={setSeenFunction}
                    setBackToConvBtn={setBackToConvBtn}
                    openAlertPopUp={openAlertPopUp}
                    openMediaViewer={openMediaViewer}
                    setAlertOpenPopUp={setAlertOpenPopUp}
                    incomingCall={incomingCall}
                    getConversations={getConversations}
                    deletedConv={deletedConv} 
                    setDeletedConv={setDeletedConv}
            />
        </div>
    )
}

export default List;