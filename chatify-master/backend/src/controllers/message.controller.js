import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    // Filter out messages deleted for the current user or deleted for everyone
    const filteredMessages = messages.filter(msg => {
      // If deleted for everyone, don't show to anyone
      if (msg.deletedForEveryone) return false;
      
      // If deleted for current user, don't show
      if (msg.deletedFor && msg.deletedFor.includes(myId)) return false;
      
      return true;
    });

    res.status(200).json(filteredMessages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image && !video) {
      return res.status(400).json({ message: "Text, image, or video is required." });
    }
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;
    let videoUrl;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "image",
      });
      imageUrl = uploadResponse.secure_url;
    }

    if (video) {
      const uploadResponse = await cloudinary.uploader.upload(video, {
        resource_type: "video",
      });
      videoUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
      isDelivered: true,
    });

    await newMessage.save();

    // Emit to receiver using consistent string IDs
    const receiverSocketId = getReceiverSocketId(receiverId.toString());
    const senderSocketId = getReceiverSocketId(senderId.toString());
    
    console.log("Sending message to socket:", receiverSocketId, "for receiver:", receiverId.toString());
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    
    // Emit delivery confirmation to sender
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageDelivered", { messageId: newMessage._id.toString() });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // find all the messages where the logged-in user is either sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;
    const { deleteForEveryone } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is authorized (sender or receiver)
    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: "Unauthorized to delete this message" });
    }

    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (!isSender) {
        return res.status(403).json({ error: "Only sender can delete for everyone" });
      }

      // Check if message is within 24 hours (WhatsApp time limit)
      const messageTime = new Date(message.createdAt);
      const currentTime = new Date();
      const hoursDiff = (currentTime - messageTime) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        return res.status(400).json({ error: "Cannot delete messages older than 24 hours" });
      }

      // Mark as deleted for everyone
      message.deletedForEveryone = true;
      await message.save();

      // Emit real-time deletion event to both sender and receiver
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      
      console.log("Sending delete for everyone event to receiver socket:", receiverSocketId);
      console.log("Sending delete for everyone event to sender socket:", senderSocketId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeletedForEveryone", messageId);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeletedForEveryone", messageId);
      }

      res.status(200).json({ message: "Message deleted for everyone" });
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }

      // Emit deletion event to current user only
      const userSocketId = getReceiverSocketId(userId.toString());
      
      console.log("Sending delete for me event to user socket:", userSocketId);

      if (userSocketId) {
        io.to(userSocketId).emit("messageDeletedForMe", messageId);
      }

      res.status(200).json({ message: "Message deleted for you" });
    }
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const userId = req.user._id;

    // Mark all unread messages from sender to current user as read
    await Message.updateMany(
      {
        senderId,
        receiverId: userId,
        isRead: false,
      },
      { isRead: true }
    );

    // Emit read receipt to sender using consistent string IDs
    const senderSocketId = getReceiverSocketId(senderId.toString());
    console.log("Sending read receipt to socket:", senderSocketId, "for sender:", senderId.toString());
    
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        senderId: senderId.toString(),
        receiverId: userId.toString(),
      });
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const userId = req.user._id;

    // Delete all messages between current user and the specified user
    await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: userId },
      ],
    });

    // Emit chat cleared event to both users
    const userSocketId = getReceiverSocketId(userId.toString());
    const otherUserSocketId = getReceiverSocketId(userToChatId.toString());
    
    if (userSocketId) {
      io.to(userSocketId).emit("chatCleared", { userId: userToChatId.toString() });
    }
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit("chatCleared", { userId: userId.toString() });
    }

    res.status(200).json({ message: "Chat cleared successfully" });
  } catch (error) {
    console.log("Error in clearChat controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
