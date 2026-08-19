import express from "express";
import {
  getIncomingRequests,
  getRelationshipStatus,
  sendFollowRequest,
  updateFollowRequest,
} from "../controllers/relationship.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);
router.get("/requests", getIncomingRequests);
router.get("/status/:id", getRelationshipStatus);
router.post("/:id", sendFollowRequest);
router.patch("/:id", updateFollowRequest);

export default router;
