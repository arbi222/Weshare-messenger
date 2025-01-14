import { create } from 'zustand'

export const useChatStore = create((set) => ({
    chatId: null,
    theOtherUser: null,
    changeChat: (chatId, otherUserInfo) => {
        return set({
            chatId,
            theOtherUser: otherUserInfo,
        })
    },
    updateOtherUser: (otherUserInfo) => {
        return set({theOtherUser: otherUserInfo})
    }
}))