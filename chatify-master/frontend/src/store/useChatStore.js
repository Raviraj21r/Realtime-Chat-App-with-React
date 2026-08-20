import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  searchResults: [],
  followRequests: [],
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

  getFollowRequests: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/relationships/requests");
      const requests = Array.isArray(res.data) ? res.data : [];
      set({ followRequests: requests });
      return requests;
    } catch (error) {
      set({ followRequests: [] });
      toast.error(error.response?.data?.message || "Failed to load follow requests");
      return [];
    } finally {
      set({ isUsersLoading: false });
    }
  },

  respondToFollowRequest: async (relationshipId, status) => {
    try {
      await axiosInstance.put(`/relationships/accept/${relationshipId}`, { status });
      set((state) => ({
        followRequests: state.followRequests.filter((request) => request._id !== relationshipId),
      }));
      if (status === "accepted") await get().getMyChatPartners();
      toast.success(status === "accepted" ? "Follow request accepted" : "Follow request rejected");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update follow request");
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
              ...msg,
              ...realMessage,
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
      return true;
    } catch (error) {
      set((state) => ({ messages: state.messages.filter((msg) => msg._id !== tempId) }));
      toast.error(error.response?.data?.message || "Something went wrong");
      return false;
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();

    if (!socket || !authUser) {
      console.error("Socket not available for message subscription");
      return;
    }

    // Remove existing listeners to prevent duplicates
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageDeletedForMe");
    socket.off("messageDeletedForEveryone");
    socket.off("messagesRead");
    socket.off("messageDelivered");
    socket.off("chatCleared");

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

    socket.on("messageDeletedForMe", (messageId) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    });

    socket.on("messageDeletedForEveryone", (messageId) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    });

    socket.on("chatCleared", ({ userId }) => {
      const { selectedUser } = get();
      // If the cleared chat is the current chat, clear messages
      if (selectedUser && selectedUser._id === userId) {
        set({ messages: [] });
      }
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

  deleteMessage: async (messageId, deleteForEveryone = false) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`, {
        data: { deleteForEveryone }
      });
      
      // Handle delete for me (local removal)
      if (!deleteForEveryone) {
        set((state) => ({
          messages: state.messages.filter((msg) => msg._id !== messageId),
        }));
        toast.success("Message deleted for you");
      } else {
        toast.success("Message deleted for everyone");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete message");
    }
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageDeletedForMe");
    socket.off("messageDeletedForEveryone");
    socket.off("messagesRead");
    socket.off("messageDelivered");
    socket.off("chatCleared");
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

  clearChat: async (userId) => {
    try {
      await axiosInstance.delete(`/messages/clear/${userId}`);
      set({ messages: [] });
      toast.success("Chat cleared successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to clear chat");
    }
  },

  sendFollowRequest: async (userId) => {
    try {
      const res = await axiosInstance.post(`/relationships/${userId}`);
      const message = res.data.message || "Follow request sent!";
      toast.success(message);
      return res.data;
    } catch (error) {
      console.error("Follow request error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to send follow request";
      toast.error(errorMessage);
      throw error;
    }
  },

  acceptFollowRequest: async (relationshipId) => {
    try {
      const res = await axiosInstance.put(`/relationships/accept/${relationshipId}`, { status: "accepted" });
      toast.success("Follow request accepted!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept follow request");
      throw error;
    }
  },

  rejectFollowRequest: async (relationshipId) => {
    try {
      const res = await axiosInstance.put(`/relationships/accept/${relationshipId}`, { status: "rejected" });
      toast.success("Follow request rejected");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject follow request");
      throw error;
    }
  },

  followBack: async (relationshipId) => {
    try {
      const res = await axiosInstance.put(`/relationships/follow-back/${relationshipId}`);
      set((state) => ({
        followRequests: state.followRequests.filter((request) => request._id !== relationshipId),
      }));
      toast.success(res.data.message || "Following each other now");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to follow back");
      throw error;
    }
  },

  followBackByUser: async (userId) => {
    const res = await axiosInstance.put(`/relationships/follow-back-user/${userId}`);
    toast.success(res.data.message || "Following each other now");
    return res.data;
  },

  getIncomingRequests: async () => {
    return get().getFollowRequests();
  },

  getRelationshipStatus: async (userId) => {
    try {
      const res = await axiosInstance.get(`/relationships/status/${userId}`);
      console.log(`Relationship status response for ${userId}:`, res.data);
      return res.data;
    } catch (error) {
      console.error("Error fetching relationship status:", error);
      return { status: "none", relationship: null };
    }
  },

  getBulkRelationshipStatus: async (userIds) => {
    try {
      const res = await axiosInstance.post("/relationships/bulk-status", { userIds });
      console.log("Bulk relationship status response:", res.data);
      return res.data;
    } catch (error) {
      console.error("Error fetching bulk relationship status:", error);
      // Return default 'none' status for all users
      const statusMap = {};
      userIds.forEach(id => statusMap[id] = 'none');
      return statusMap;
    }
  },
}));
