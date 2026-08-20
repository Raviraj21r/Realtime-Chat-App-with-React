import mongoose from "mongoose";
import Relationship from "../models/Relationship.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { createNotification } from "./notification.controller.js";

export const sendFollowRequest = async (req, res) => {
  try {
    const requester = req.user._id;
    const { id: receiver } = req.params;

    console.log(`Send follow request: requester=${requester}, receiver=${receiver}`);

    if (!requester) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!mongoose.isValidObjectId(receiver)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    
    if (requester.toString() === receiver.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }
    
    if (!(await User.exists({ _id: receiver }))) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!mongoose.isValidObjectId(requester) || !mongoose.isValidObjectId(receiver)) {
      return res.status(400).json({ message: "Invalid requester or receiver id" });
    }

    // Check for existing relationship with new field names (requester/receiver)
    let existing = await Relationship.findOne({ requester, receiver });
    
    // Also check for old field names (followerId/followingId) for backward compatibility
    if (!existing) {
      existing = await Relationship.findOne({ followerId: requester, followingId: receiver });
      // If found with old field names, migrate to new field names
      if (existing) {
        console.log("Migrating old relationship to new field names");
        existing.requester = requester;
        existing.receiver = receiver;
        existing.followerId = undefined;
        existing.followingId = undefined;
        await existing.save();
      }
    }
    
    if (existing) {
      console.log(`Existing relationship found: status=${existing.status}`);
      // Handle different statuses appropriately
      if (existing.status === "pending") {
        const notificationExists = await Notification.exists({
          userId: receiver,
          senderId: requester,
          type: "follow_request",
          relatedId: existing._id,
          isRead: false,
        });

        if (!notificationExists) {
          await createNotification(receiver, requester, "follow_request", existing._id);
        }

        return res.status(200).json({ message: "Follow request already sent", relationship: existing });
      }
      if (existing.status === "accepted") {
        return res.status(200).json({ message: "You are already following this user", relationship: existing });
      }
      if (existing.status === "rejected") {
        existing.status = "pending";
        await existing.save();
        // Create notification for re-sent request
        try {
          await createNotification(receiver, requester, "follow_request", existing._id);
        } catch (notifError) {
          console.error("Error creating notification:", notifError);
        }
        return res.status(200).json({ message: "Follow request re-sent", relationship: existing });
      }
      return res.status(200).json({ message: "Relationship already exists", relationship: existing });
    }

    // Check for incoming request with new field names
    let incoming = await Relationship.findOne({ requester: receiver, receiver: requester });
    
    // Also check for old field names for backward compatibility
    if (!incoming) {
      incoming = await Relationship.findOne({ followerId: receiver, followingId: requester });
    }
    
    if (incoming?.status === "pending") {
      console.log("Incoming follow request found");
      return res.status(200).json({ message: "This user has already sent you a follow request.", relationship: incoming });
    }

    console.log("Creating new relationship");
    const relationship = await Relationship.create({
      requester: requester.toString(),
      receiver: receiver.toString(),
      status: "pending",
    });
    console.log("Relationship created:", relationship);
    
    // Create notification for follow request (non-blocking)
    try {
      await createNotification(receiver, requester, "follow_request", relationship._id);
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }
    
    res.status(201).json({ message: "Follow request sent successfully", relationship });
  } catch (error) {
    console.error("Error sending follow request:", error);
    
    // Handle duplicate key error - treat as success
    if (error.code === 11000) {
      console.log("Duplicate key error, treating as success");
      return res.status(200).json({ message: "Relationship already exists" });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      console.log("Validation error:", error.message);
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getIncomingRequests = async (req, res) => {
  try {
    const currentRequests = await Relationship.find({
      receiver: req.user._id,
      status: "pending",
    })
      .populate("requester", "_id fullName email profilePic")
      .sort({ createdAt: -1 })
      .lean();

    const legacyRequests = await Relationship.find({
      followingId: req.user._id,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    const requests = [...currentRequests, ...legacyRequests];

    const legacyRequesterIds = requests
      .filter((request) => !request.requester && request.followerId)
      .map((request) => request.followerId);
    const legacyRequesters = await User.find({ _id: { $in: legacyRequesterIds } })
      .select("_id fullName email profilePic")
      .lean();
    const legacyRequesterMap = new Map(
      legacyRequesters.map((requester) => [requester._id.toString(), requester])
    );

    const normalizedRequests = requests.map((request) => ({
      ...request,
      requester:
        request.requester || legacyRequesterMap.get(request.followerId?.toString()) || null,
    }));

    res.status(200).json(normalizedRequests);
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
      $or: [
        { receiver: req.user._id, status: "pending" },
        { followingId: req.user._id, status: "pending" },
      ],
    });
    if (!relationship) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    if (!relationship.requester && relationship.followerId) {
      relationship.requester = relationship.followerId;
      relationship.receiver = relationship.followingId;
    }

    relationship.status = status;
    await relationship.save();

    // Create notification for accepted/rejected (non-blocking)
    const notificationType = status === "accepted" ? "follow_accepted" : "follow_rejected";
    try {
      await createNotification(relationship.requester, req.user._id, notificationType, relationship._id);
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
      // Don't fail the request if notification fails
    }

    res.status(200).json(relationship);
  } catch (error) {
    console.error("Error updating follow request:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const followBack = async (req, res) => {
  try {
    const { id: relationshipId } = req.params;

    if (!mongoose.isValidObjectId(relationshipId)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const incomingRelationship = await Relationship.findOne({
      _id: relationshipId,
      $or: [
        { receiver: req.user._id, status: "pending" },
        { followingId: req.user._id, status: "pending" },
      ],
    });

    if (!incomingRelationship) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    if (!incomingRelationship.requester && incomingRelationship.followerId) {
      incomingRelationship.requester = incomingRelationship.followerId;
      incomingRelationship.receiver = incomingRelationship.followingId;
    }

    incomingRelationship.status = "accepted";
    await incomingRelationship.save();

    await Relationship.findOneAndUpdate(
      { requester: req.user._id, receiver: incomingRelationship.requester },
      {
        $set: {
          requester: req.user._id,
          receiver: incomingRelationship.requester,
          status: "accepted",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await createNotification(
      incomingRelationship.requester,
      req.user._id,
      "follow_accepted",
      incomingRelationship._id
    );

    res.status(200).json({
      message: "You are now following each other",
      relationship: incomingRelationship,
    });
  } catch (error) {
    console.error("Error following back:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const followBackByUser = async (req, res) => {
  try {
    const { id: requesterId } = req.params;
    if (!mongoose.isValidObjectId(requesterId)) {
      return res.status(400).json({ message: "Invalid requester id" });
    }

    const incomingRelationship = await Relationship.findOne({
      requester: requesterId,
      receiver: req.user._id,
      status: "pending",
    });
    if (!incomingRelationship) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    incomingRelationship.status = "accepted";
    await incomingRelationship.save();
    await Relationship.findOneAndUpdate(
      { requester: req.user._id, receiver: requesterId },
      { $set: { requester: req.user._id, receiver: requesterId, status: "accepted" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await createNotification(requesterId, req.user._id, "follow_accepted", incomingRelationship._id);

    res.status(200).json({ message: "You are now following each other" });
  } catch (error) {
    console.error("Error following back by user:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getRelationshipStatus = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const currentUserId = req.user._id;

    console.log(`Fetching relationship status: current=${currentUserId}, other=${otherUserId}`);

    if (!mongoose.isValidObjectId(otherUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Check for both new and old field names for backward compatibility
    const relationship = await Relationship.findOne({
      $or: [
        { requester: currentUserId, receiver: otherUserId },
        { requester: otherUserId, receiver: currentUserId },
        { followerId: currentUserId, followingId: otherUserId },
        { followerId: otherUserId, followingId: currentUserId },
      ],
    });

    console.log(`Relationship found:`, relationship);

    res.status(200).json({ status: relationship?.status || "none", relationship });
  } catch (error) {
    console.error("Error fetching relationship status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBulkRelationshipStatus = async (req, res) => {
  try {
    const { userIds } = req.body;
    const currentUserId = req.user._id;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Invalid user IDs array" });
    }

    console.log(`Fetching bulk relationship status for ${userIds.length} users`);

    // Check for both new and old field names for backward compatibility
    const relationships = await Relationship.find({
      $or: [
        { requester: currentUserId, receiver: { $in: userIds } },
        { requester: { $in: userIds }, receiver: currentUserId },
        { followerId: currentUserId, followingId: { $in: userIds } },
        { followerId: { $in: userIds }, followingId: currentUserId },
      ],
    }).select("requester receiver followerId followingId status").lean();

    const statusMap = {};
    const outgoingStatuses = {};
    const acceptedIncomingUsers = new Set();
    
    // Initialize all users with 'none' status
    userIds.forEach(id => {
      statusMap[id] = 'none';
    });

    relationships.forEach(rel => {
      let otherUserId;
      let isOutgoing = false;

      if (rel.requester && rel.receiver) {
        isOutgoing = rel.requester.toString() === currentUserId.toString();
        otherUserId = isOutgoing ? rel.receiver.toString() : rel.requester.toString();
      }
      else if (rel.followerId && rel.followingId) {
        isOutgoing = rel.followerId.toString() === currentUserId.toString();
        otherUserId = isOutgoing ? rel.followingId.toString() : rel.followerId.toString();
      }

      if (otherUserId) {
        if (isOutgoing) {
          const currentStatus = outgoingStatuses[otherUserId];
          const statusPriority = { accepted: 3, pending: 2, rejected: 1 };
          if (!currentStatus || statusPriority[rel.status] > statusPriority[currentStatus]) {
            outgoingStatuses[otherUserId] = rel.status;
          }
        } else if (rel.status === "accepted") {
          acceptedIncomingUsers.add(otherUserId);
        } else if (rel.status === "pending" && !outgoingStatuses[otherUserId]) {
          outgoingStatuses[otherUserId] = "incoming_pending";
        }
      }
    });

    userIds.forEach(id => {
      const normalizedId = id.toString();
      statusMap[normalizedId] = outgoingStatuses[normalizedId]
        || (acceptedIncomingUsers.has(normalizedId) ? "accepted" : "none");
    });

    console.log("Bulk relationship status map:", statusMap);

    res.status(200).json(statusMap);
  } catch (error) {
    console.error("Error fetching bulk relationship status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
