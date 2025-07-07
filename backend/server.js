import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { v2 as cloudinary} from "cloudinary";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import postRoutes from "./routes/post.routes.js"
import userRoutes from "./routes/user.routes.js"
import authRoutes from "./routes/auth.routes.js";
import connectMongoDB from "./db/connectMongoDB.js";
import notificationsRoutes from "./routes/notification.routes.js"

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

app.use(cookieParser())
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ extended: true}));


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationsRoutes)



// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);
  
  // Track user connections
  socket.on("join-user", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their personal room`);
  });
  
  socket.on("join-chat", (data) => {
    const { userId, partnerId } = data;
    const roomId = [userId, partnerId].sort().join('-');
    socket.join(roomId);
    console.log(`User ${userId} joined chat room: ${roomId}`);
  });
  
  socket.on("typing-start", (data) => {
    const { userId, partnerId } = data;
    const roomId = [userId, partnerId].sort().join('-');
    socket.to(roomId).emit("user-typing", { userId, isTyping: true });
  });
  
  socket.on("typing-stop", (data) => {
    const { userId, partnerId } = data;
    const roomId = [userId, partnerId].sort().join('-');
    socket.to(roomId).emit("user-typing", { userId, isTyping: false });
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT , ()=> {
    console.log(`server is running on port ${PORT}`);
    connectMongoDB();
});

export { io };