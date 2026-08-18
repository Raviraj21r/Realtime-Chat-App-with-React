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
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true, // flag to identify optimistic messages (optional)
    };
    // immidetaly update the ui by adding the message
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: messages.concat(res.data) });
    } catch (error) {
      // remove optimistic message on failure
      set({ messages: messages });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      const currentMessages = get().messages;
      set({ messages: [...currentMessages, newMessage] });

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");

        notificationSound.currentTime = 0; // reset to start
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
      
      // Update messages sent by current user that were read by the selected user
      if (senderId === authUser._id && receiverId === selectedUser._id) {
        const updatedMessages = currentMessages.map((msg) => 
          msg.senderId === authUser._id ? { ...msg, isRead: true } : msg
        );
        set({ messages: updatedMessages });
      }
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
