import express from "express";
import { createStatus, getActiveStatuses, getMyStatus } from "../controllers/status.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", protectRoute, createStatus);
router.get("/active", protectRoute, getActiveStatuses);
router.get("/my-status", protectRoute, getMyStatus);

export default router;
