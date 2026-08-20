import express from "express";
import {
  getIncomingRequests,
  getRelationshipStatus,
  sendFollowRequest,
  updateFollowRequest,
  getBulkRelationshipStatus,
  followBack,
  followBackByUser,
} from "../controllers/relationship.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);
router.get("/requests", getIncomingRequests);
router.put("/follow-back/:id", followBack);
router.put("/follow-back-user/:id", followBackByUser);
router.get("/status/:id", getRelationshipStatus);
router.post("/bulk-status", getBulkRelationshipStatus);
router.post("/:id", sendFollowRequest);
router.put("/accept/:id", updateFollowRequest);

export default router;
