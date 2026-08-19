import express from "express";
import { signup, login, logout, updateProfile, searchUsers } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// Apply arcjet protection only to protected routes, not to signup/login
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, arcjetProtection, updateProfile);

router.get("/check", protectRoute, (req, res) => res.status(200).json(req.user));

router.get("/search", protectRoute, arcjetProtection, searchUsers);

export default router;
