import express from "express";
import {
  deleteMessage,
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
  markMessagesAsRead,
  clearChat,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// Apply protection middleware to all routes
router.use(protectRoute);

// Apply arcjet protection only to specific routes that need it
router.get("/contacts", arcjetProtection, getAllContacts);
router.get("/chats", arcjetProtection, getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);
router.put("/read/:id", markMessagesAsRead);
router.delete("/delete/:id", deleteMessage);
router.delete("/clear/:id", clearChat);

export default router;
