import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { getReceiverSocketId } from "../lib/socket.js";
import { io } from "../lib/socket.js";

export const createNotification = async (userId, senderId, type, relatedId = null) => {
  try {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(senderId)) {
      console.error("Invalid user IDs for notification:", { userId, senderId });
      return null;
    }

    const notification = await Notification.create({
      userId,
      senderId,
      type,
      relatedId,
    });

    // Emit real-time notification (with error handling)
    try {
      const receiverSocketId = getReceiverSocketId(userId.toString());
      if (receiverSocketId && io) {
        io.to(receiverSocketId).emit("notification:new", notification);
        console.log("Notification emitted to socket:", receiverSocketId);
      }
    } catch (socketError) {
      console.error("Error emitting notification to socket:", socketError);
      // Don't fail the notification creation if socket emit fails
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - let the caller handle the error
    return null;
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate("senderId", "_id fullName email profilePic")
      .populate("relatedId")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
