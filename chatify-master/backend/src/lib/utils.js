import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (userId, res) => {
  const { JWT_SECRET } = ENV;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks: cross-site scripting
   sameSite: "none", // ⚠️ 'strict' को हटाकर 'none' करें
   secure: true,     // ⚠️ Vercel और Render दोनों HTTPS पर हैं इसलिए true रहेगा
  });

  return token;
};

// http://localhost
// https://dsmakmk.com
