import Status from "../models/Status.js";
import cloudinary from "../lib/cloudinary.js";

export const createStatus = async (req, res) => {
  try {
    const { text, image } = req.body;

    if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required" });
    }

    const userId = req.user._id;
    let imageUrl = "";

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newStatus = new Status({
      userId,
      text,
      image: imageUrl,
      expiresAt,
    });

    await newStatus.save();

    res.status(201).json(newStatus);
  } catch (error) {
    console.log("Error in create status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getActiveStatuses = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all statuses that haven't expired yet
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "_id fullName profilePic")
      .sort({ createdAt: -1 });

    // Group statuses by user and get the latest status per user
    const userStatusMap = new Map();
    
    for (const status of statuses) {
      const userIdStr = status.userId._id.toString();
      if (!userStatusMap.has(userIdStr)) {
        userStatusMap.set(userIdStr, status);
      }
    }

    // Convert map back to array and filter out current user's status
    const activeStatuses = Array.from(userStatusMap.values()).filter(
      (status) => status.userId._id.toString() !== currentUserId.toString()
    );

    res.status(200).json(activeStatuses);
  } catch (error) {
    console.log("Error in get active statuses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const myStatus = await Status.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.status(200).json(myStatus || null);
  } catch (error) {
    console.log("Error in get my status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
