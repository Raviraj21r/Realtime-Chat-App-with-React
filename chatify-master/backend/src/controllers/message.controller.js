import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Relationship from "../models/Relationship.js";
import { createNotification } from "./notification.controller.js";

const hasAcceptedRelationship = async (userId, otherUserId) => {
  if (!otherUserId || userId.toString() === otherUserId.toString()) return false;

  return Relationship.exists({
    $or: [
      { requester: userId, receiver: otherUserId, status: "accepted" },
      { requester: otherUserId, receiver: userId, status: "accepted" },
    ],
  });
};

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Check for both new and old field names for backward compatibility
    const relationships = await Relationship.find({
      $or: [
        { requester: loggedInUserId, status: "accepted" },
        { receiver: loggedInUserId, status: "accepted" },
        { followerId: loggedInUserId, status: "accepted" },
        { followingId: loggedInUserId, status: "accepted" }
      ]
    }).select("requester receiver followerId followingId");
    
    const contactIds = relationships.map((relationship) => {
      // Handle new field names
      if (relationship.requester && relationship.receiver) {
        return relationship.requester.toString() === loggedInUserId.toString()
          ? relationship.receiver
          : relationship.requester;
      }
      // Handle old field names
      if (relationship.followerId && relationship.followingId) {
        return relationship.followerId.toString() === loggedInUserId.toString()
          ? relationship.followingId
          : relationship.followerId;
      }
      return null;
    }).filter(id => id !== null);

    console.log("Contact IDs found:", contactIds);

    const filteredUsers = await User.find({ _id: { $in: contactIds } }).select("-password");

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

    if (!(await hasAcceptedRelationship(myId, userToChatId))) {
      return res.status(403).json({ message: "Follow request must be accepted before accessing this conversation." });
    }

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

    if (!(await hasAcceptedRelationship(senderId, receiverId))) {
      return res.status(403).json({ message: "Follow request must be accepted before sending messages." });
    }

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

    let imageUrl = null;
    let videoUrl = null;

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
      image: imageUrl || null,
      video: videoUrl || null,
      isDelivered: true,
    });

    await newMessage.save();

    // Create notification for new message (non-blocking)
    try {
      await createNotification(receiverId, senderId, "new_message", newMessage._id);
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
      // Don't fail the message send if notification fails
    }

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

    // Check for both new and old field names for backward compatibility
    const relationships = await Relationship.find({
      $or: [
        { requester: loggedInUserId, status: "accepted" },
        { receiver: loggedInUserId, status: "accepted" },
        { followerId: loggedInUserId, status: "accepted" },
        { followingId: loggedInUserId, status: "accepted" }
      ]
    }).select("requester receiver followerId followingId");
    
    const chatPartnerIds = relationships.map((relationship) => {
      // Handle new field names
      if (relationship.requester && relationship.receiver) {
        return relationship.requester.toString() === loggedInUserId.toString()
          ? relationship.receiver
          : relationship.requester;
      }
      // Handle old field names
      if (relationship.followerId && relationship.followingId) {
        return relationship.followerId.toString() === loggedInUserId.toString()
          ? relationship.followingId
          : relationship.followerId;
      }
      return null;
    }).filter(id => id !== null);

    console.log("Chat partner IDs found:", chatPartnerIds);

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

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ error: "Invalid message id" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: "Unauthorized to delete this message" });
    }
    if (!(await hasAcceptedRelationship(message.senderId, message.receiverId))) {
      return res.status(403).json({ error: "Follow request must be accepted for this conversation" });
    }

    if (deleteForEveryone) {
      if (!isSender) {
        return res.status(403).json({ error: "Only sender can delete for everyone" });
      }

      const hoursDiff = (new Date() - new Date(message.createdAt)) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        return res.status(400).json({ error: "Cannot delete messages older than 24 hours" });
      }

      message.deletedForEveryone = true;
      await message.save();

      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("messageDeletedForEveryone", messageId);
      if (senderSocketId) io.to(senderSocketId).emit("messageDeletedForEveryone", messageId);

      return res.status(200).json({ message: "Message deleted for everyone" });
    }

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    const userSocketId = getReceiverSocketId(userId.toString());
    if (userSocketId) io.to(userSocketId).emit("messageDeletedForMe", messageId);
    return res.status(200).json({ message: "Message deleted for you" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const userId = req.user._id;

    if (!(await hasAcceptedRelationship(userId, senderId))) {
      return res.status(403).json({ message: "You are not authorized to access this conversation." });
    }

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

    if (!mongoose.isValidObjectId(userToChatId)) {
      return res.status(400).json({ error: "Invalid chat user id" });
    }

    if (!(await hasAcceptedRelationship(userId, userToChatId))) {
      return res.status(403).json({ message: "You are not authorized to access this conversation." });
    }

    // Delete all messages between current user and the specified user
    const result = await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: userId },
      ],
    });

    console.log(`Cleared ${result.deletedCount} messages between ${userId} and ${userToChatId}`);

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
