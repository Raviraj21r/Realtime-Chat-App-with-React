import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  searchResults: [],
  activeStatuses: [],
  myStatus: null,
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  searchUsers: async (query) => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get(`/auth/search?query=${query}`);
      set({ searchResults: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to search users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      // Mark messages as read when fetching
      await get().markMessagesAsRead(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      video: messageData.video,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      isDelivered: false,
      isRead: false,
    };

    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const realMessage = {
        ...res.data,
        _id: String(res.data._id ?? ""),
        senderId: String(res.data.senderId ?? ""),
        receiverId: String(res.data.receiverId ?? ""),
      };

      set((state) => {
        const currentMessages = state.messages;
        const optimisticMatch = currentMessages.find(
          (msg) =>
            msg._id === tempId ||
            (
              msg.isOptimistic &&
              String(msg.senderId ?? "") === String(authUser._id ?? "") &&
              String(msg.receiverId ?? "") === String(selectedUser._id ?? "") &&
              (msg.text ?? "") === (messageData.text ?? "") &&
              (msg.image ?? "") === (messageData.image ?? "") &&
              (msg.video ?? "") === (messageData.video ?? "")
            )
        );

        const nextMessages = currentMessages.map((msg) => {
          const sameTemp = msg._id === tempId;
          const sameRealId = String(msg._id ?? "") === String(realMessage._id ?? "");
          const sameContent =
            String(msg.senderId ?? "") === String(realMessage.senderId ?? "") &&
            String(msg.receiverId ?? "") === String(realMessage.receiverId ?? "") &&
            (msg.text ?? "") === (realMessage.text ?? "") &&
            (msg.image ?? "") === (realMessage.image ?? "") &&
            (msg.video ?? "") === (realMessage.video ?? "");

          if (sameTemp || sameRealId || sameContent) {
            return {
              ...realMessage,
              ...msg,
              _id: realMessage._id || msg._id,
              isDelivered: true,
              isRead: false,
              isOptimistic: false,
            };
          }

          return msg;
        });

        const hasRealMessage = nextMessages.some((msg) => String(msg._id ?? "") === String(realMessage._id ?? ""));

        if (!hasRealMessage && realMessage._id) {
          return {
            messages: [
              ...nextMessages,
              { ...realMessage, isDelivered: true, isRead: false, isOptimistic: false },
            ],
          };
        }

        if (!optimisticMatch && !hasRealMessage && !realMessage._id) {
          return { messages: [...nextMessages, { ...realMessage, isDelivered: true, isRead: false, isOptimistic: false }] };
        }

        return { messages: nextMessages };
      });
    } catch (error) {
      set((state) => ({ messages: state.messages.filter((msg) => msg._id !== tempId) }));
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();

    if (!socket) {
      console.error("Socket not available for message subscription");
      return;
    }

    // Remove existing listeners to prevent duplicates
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messagesRead");
    socket.off("messageDelivered");

    console.log("Subscribing to messages for user:", selectedUser._id);

    socket.on("newMessage", (newMessage) => {
      console.log("New message received:", newMessage);

      const normalizedMessage = {
        ...newMessage,
        _id: String(newMessage._id ?? ""),
        senderId: String(newMessage.senderId ?? ""),
        receiverId: String(newMessage.receiverId ?? ""),
      };

      const selectedUserIdStr = String(selectedUser._id ?? "");
      const authUserIdStr = String(authUser._id ?? "");
      const senderIdStr = String(normalizedMessage.senderId ?? "");
      const receiverIdStr = String(normalizedMessage.receiverId ?? "");

      const isFromSelectedUser = senderIdStr === selectedUserIdStr;
      const isToSelectedUser = receiverIdStr === selectedUserIdStr;
      const isFromCurrentUser = senderIdStr === authUserIdStr;
      const isToCurrentUser = receiverIdStr === authUserIdStr;

      const isRelevantMessage =
        (isFromSelectedUser && isToCurrentUser) || (isFromCurrentUser && isToSelectedUser);

      if (!isRelevantMessage) {
        console.log("Message not relevant to current conversation");
        return;
      }

      const currentMessages = get().messages;
      const sameLogicalMatch = (msg) => {
        const msgId = String(msg._id ?? "");
        const msgSenderId = String(msg.senderId ?? "");
        const msgReceiverId = String(msg.receiverId ?? "");

        const sameId = msgId && msgId === normalizedMessage._id;
        const sameContent =
          msgSenderId === senderIdStr &&
          msgReceiverId === receiverIdStr &&
          (msg.text ?? "") === (normalizedMessage.text ?? "") &&
          (msg.image ?? "") === (normalizedMessage.image ?? "") &&
          (msg.video ?? "") === (normalizedMessage.video ?? "");

        return sameId || sameContent;
      };

      const existingMatch = currentMessages.find((msg) => sameLogicalMatch(msg));
      if (existingMatch) {
        const optimisticReplacement = currentMessages.find(
          (msg) =>
            msg.isOptimistic &&
            String(msg.senderId ?? "") === senderIdStr &&
            String(msg.receiverId ?? "") === receiverIdStr &&
            (msg.text ?? "") === (normalizedMessage.text ?? "") &&
            (msg.image ?? "") === (normalizedMessage.image ?? "") &&
            (msg.video ?? "") === (normalizedMessage.video ?? "")
        );

        if (optimisticReplacement) {
          set({
            messages: currentMessages.map((msg) =>
              msg._id === optimisticReplacement._id
                ? { ...normalizedMessage, isDelivered: true, isRead: false, isOptimistic: false }
                : msg
            ),
          });
        }

        console.log("Duplicate message detected, skipping");
        return;
      }

      if (isFromCurrentUser && isToSelectedUser) {
        console.log("Outgoing socket echo ignored because it matches an optimistic local message");
        return;
      }

      console.log("Adding new message to state");
      set({ messages: [...currentMessages, normalizedMessage] });

      if (isSoundEnabled && isFromSelectedUser) {
        const notificationSound = new Audio("/sounds/notification.mp3");

        notificationSound.currentTime = 0;
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    socket.on("messageDeleted", (messageId) => {
      const currentMessages = get().messages;
      const message = currentMessages.find((msg) => msg._id === messageId);
      
      // Skip if already being deleted (to avoid duplicate animations)
      if (message?.isDeleting) return;
      
      // Add animation before removal for remote deletions
      set({ messages: currentMessages.map((msg) =>
        msg._id === messageId ? { ...msg, isDeleting: true } : msg
      )});

      // Remove after animation
      setTimeout(() => {
        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== messageId),
        }));
      }, 300);
    });

    socket.on("messagesRead", ({ senderId, receiverId }) => {
      const { authUser } = useAuthStore.getState();
      const currentMessages = get().messages;
      
      // Ensure consistent string comparison
      const authUserIdStr = authUser._id.toString();
      const selectedUserIdStr = selectedUser._id.toString();
      const senderIdStr = senderId?.toString();
      const receiverIdStr = receiverId?.toString();
      
      // Update messages sent by current user that were read by the selected user
      if (senderIdStr === authUserIdStr && receiverIdStr === selectedUserIdStr) {
        console.log("Updating read status for messages from authUser to selectedUser");
        const updatedMessages = currentMessages.map((msg) => 
          msg.senderId.toString() === authUserIdStr ? { ...msg, isRead: true } : msg
        );
        set({ messages: updatedMessages });
      }
    });

    socket.on("messageDelivered", ({ messageId }) => {
      const currentMessages = get().messages;
      console.log("Message delivered:", messageId);
      
      const updatedMessages = currentMessages.map((msg) =>
        msg._id === messageId ? { ...msg, isDelivered: true, isOptimistic: false } : msg
      );
      set({ messages: updatedMessages });
    });
  },

  deleteMessage: async (messageId) => {
    try {
      // Trigger animation immediately for instant feedback
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, isDeleting: true } : msg
        ),
      }));

      await axiosInstance.delete(`/messages/delete/${messageId}`);
      
      // Remove after animation for local deletions (socket won't handle this for local user)
      setTimeout(() => {
        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== messageId),
        }));
      }, 300);
      
      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messagesRead");
    socket.off("messageDelivered");
  },

  markMessagesAsRead: async (senderId) => {
    try {
      await axiosInstance.put(`/messages/read/${senderId}`);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  createStatus: async (statusData) => {
    try {
      const res = await axiosInstance.post("/status/create", statusData);
      set({ myStatus: res.data });
      toast.success("Status created successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create status");
    }
  },

  getActiveStatuses: async () => {
    try {
      const res = await axiosInstance.get("/status/active");
      set({ activeStatuses: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch statuses");
    }
  },

  getMyStatus: async () => {
    try {
      const res = await axiosInstance.get("/status/my-status");
      set({ myStatus: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch your status");
    }
  },
}));
