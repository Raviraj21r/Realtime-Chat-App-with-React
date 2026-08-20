import mongoose from "mongoose";

const relationshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true }
);

relationshipSchema.index({ requester: 1, receiver: 1 }, { unique: true });

const Relationship = mongoose.model("Relationship", relationshipSchema);

export default Relationship;
