import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import net from "net";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import statusRoutes from "./routes/status.route.js";
import relationshipRoutes from "./routes/relationship.route.js";
import notificationRoutes from "./routes/notification.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const __dirname = path.resolve();

// Function to check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};

// Function to find available port
const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (port < startPort + 100) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
};

const DEFAULT_PORT = ENV.PORT || 3000;
let PORT = DEFAULT_PORT;

// Try to find an available port if the default is in use
if (ENV.NODE_ENV !== 'production') {
  try {
    PORT = await findAvailablePort(DEFAULT_PORT);
    if (PORT !== DEFAULT_PORT) {
      console.log(`Port ${DEFAULT_PORT} is in use, using port ${PORT} instead`);
    }
  } catch (error) {
    console.error('Error finding available port:', error.message);
    PORT = DEFAULT_PORT;
  }
}

app.use(express.json({ limit: "5mb" })); // req.body
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://realtime-chat-app-with-react-delta.vercel.app",
      ENV.CLIENT_URL
    ].filter(Boolean), // Filter out undefined/null values
    credentials: true,
  })
);
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/notifications", notificationRoutes);

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("Server running on port: " + PORT);
  connectDB();
});
