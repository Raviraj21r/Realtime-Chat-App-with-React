import mongoose from "mongoose";
import Relationship from "../models/Relationship.js";
import User from "../models/User.js";

export const sendFollowRequest = async (req, res) => {
  try {
    const followerId = req.user._id;
    const { id: followingId } = req.params;

    if (!mongoose.isValidObjectId(followingId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (followerId.toString() === followingId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }
    if (!(await User.exists({ _id: followingId }))) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = await Relationship.findOne({ followerId, followingId });
    if (existing) {
      if (existing.status === "rejected") {
        existing.status = "pending";
        await existing.save();
      }
      return res.status(200).json(existing);
    }

    const incoming = await Relationship.findOne({ followerId: followingId, followingId: followerId });
    if (incoming?.status === "pending") {
      return res.status(409).json({ message: "This user has already sent you a follow request." });
    }

    const relationship = await Relationship.create({ followerId, followingId, status: "pending" });
    res.status(201).json(relationship);
  } catch (error) {
    console.error("Error sending follow request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getIncomingRequests = async (req, res) => {
  try {
    const requests = await Relationship.find({ followingId: req.user._id, status: "pending" })
      .populate("followerId", "_id fullName email profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching follow requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFollowRequest = async (req, res) => {
  try {
    const { id: relationshipId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(relationshipId)) {
      return res.status(400).json({ message: "Invalid request id" });
    }
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be accepted or rejected" });
    }

    const relationship = await Relationship.findOne({
      _id: relationshipId,
      followingId: req.user._id,
      status: "pending",
    });
    if (!relationship) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    relationship.status = status;
    await relationship.save();
    res.status(200).json(relationship);
  } catch (error) {
    console.error("Error updating follow request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getRelationshipStatus = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    if (!mongoose.isValidObjectId(otherUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const relationship = await Relationship.findOne({
      $or: [
        { followerId: req.user._id, followingId: otherUserId },
        { followerId: otherUserId, followingId: req.user._id },
      ],
    });

    res.status(200).json({ status: relationship?.status || "none", relationship });
  } catch (error) {
    console.error("Error fetching relationship status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
