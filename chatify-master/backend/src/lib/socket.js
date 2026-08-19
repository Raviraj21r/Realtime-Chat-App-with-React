import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://realtime-chat-app-with-react-delta.vercel.app",
      ENV.CLIENT_URL
    ].filter(Boolean), // Filter out undefined/null values
    credentials: true,
  },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// we will use this function to check if the user is online or not
export function getReceiverSocketId(userId) {
  const socketIds = userSocketMap.get(userId?.toString());
  return socketIds?.values().next().value;
}

// this is for storing online users
const userSocketMap = new Map(); // {userId:Set<socketId>}

io.on("connection", (socket) => {
  console.log("A user connected", socket.user.fullName);

  // Ensure userId is stored as string for consistent comparison
  const userId = socket.userId.toString();
  const socketIds = userSocketMap.get(userId) || new Set();
  socketIds.add(socket.id);
  userSocketMap.set(userId, socketIds);

  console.log("User socket map updated:", [...userSocketMap.keys()]);

  // io.emit() is used to send events to all connected clients
  io.emit("getOnlineUsers", [...userSocketMap.keys()]);

  // Handle socket errors
  socket.on("error", (error) => {
    console.log("Socket error:", error);
  });

  // with socket.on we listen for events from clients
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.fullName);
    const activeSocketIds = userSocketMap.get(userId);
    activeSocketIds?.delete(socket.id);

    if (!activeSocketIds?.size) {
      userSocketMap.delete(userId);
    }

    console.log("User socket map after disconnect:", [...userSocketMap.keys()]);
    io.emit("getOnlineUsers", [...userSocketMap.keys()]);
  });
});

export { io, app, server };
