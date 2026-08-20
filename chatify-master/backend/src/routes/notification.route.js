import express from "express";
import {
  createNotification,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
} from "../controllers/notification.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/mark-read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
