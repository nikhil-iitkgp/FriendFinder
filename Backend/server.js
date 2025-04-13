const express = require("express");  
const http = require("http");        
const { Server } = require("socket.io"); 
const app = express();               
const cors = require("cors");
const compression = require("compression");
require("dotenv").config();  
const connectDB = require("./config/db"); 
const friendRoutes = require("./routes/friendRoutes");

// Connect to Database
connectDB();

const User = require("./models/User");
const Notification = require("./models/Notification"); 

// Define a test route
app.get("/", (req, res) => {
    res.send("FriendFinder Backend is Running!");
});

// Middleware
app.use(express.json()); 
app.use(cors());
app.use(compression());

app.use("/api", require("./routes/authRoutes"));
app.use("/api", require("./routes/chatRoutes"));
app.use("/api", require("./routes/postRoutes"));
app.use("/api", require("./routes/profileRoutes"));
app.use("/api", require("./routes/notificationRoutes"));
app.use("/api", require("./routes/blockReportRoutes"));
app.use("/api/friends", friendRoutes);
app.use("/uploads", express.static("uploads"));

// Set up WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// Store user connections
const usersOnline = {}; 

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    // User Online Tracking
    socket.on("userOnline", async (userId) => {
        usersOnline[userId] = socket.id;
        await User.findByIdAndUpdate(userId, { isOnline: true });
        io.emit("updateUser Status", { userId, isOnline: true });
    });

    // Emit user's socket ID
    socket.emit("me", socket.id);

    // Handle real-time messages
    socket.on("sendMessage", ({ senderId, receiverId, message }) => {
        io.to(usersOnline[receiverId]).emit(`receiveMessage-${receiverId}`, { senderId, message });
    });

    // Handle Typing Indicator
    socket.on("typing", ({ senderId, receiverId }) => {
        io.to(usersOnline[receiverId]).emit(`typing-${receiverId}`, senderId);
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
        io.to(usersOnline[receiverId]).emit(`stopTyping-${receiverId}`, senderId);
    });

    // Real-time Notifications
    socket.on("sendNotification", async ({ to, from, type, message, postId }) => {
        const newNotification = new Notification({
            user: to,
            fromUser :  from,
            type,
            message,
            post: postId || null
        });

        await newNotification.save();
        io.to(usersOnline[to]).emit("newNotification", newNotification);
    });

    // Handle user disconnection
    socket.on("disconnect", async () => {
        console.log("User  disconnected:", socket.id);
        const userId = Object.keys(usersOnline).find(key => usersOnline[key] === socket.id);
        if (userId) {
            delete usersOnline[userId];
            await User.findByIdAndUpdate(userId, { isOnline: false });
            io.emit("updateUser Status", { userId, isOnline: false });
        }
    });

    // Handle user call initiation (for both audio & video)
    socket.on("callUser ", ({ to, signal, from, name, isVideo }) => {
        io.to(usersOnline[to]).emit("incomingCall", { signal, from, name, isVideo });
    });

    // Handle answering the call
    socket.on("answerCall", ({ to, signal }) => {
        io.to(usersOnline[to]).emit("callAccepted", signal);
    });

    // Handle call rejection
    socket.on("rejectCall", ({ to }) => {
        io.to(usersOnline[to]).emit("callRejected");
    });

    // Handle call ended
    socket.on("endCall", ({ to }) => {
        io.to(usersOnline[to]).emit("callEnded");
    });
});

// Start server
const PORT = process.env.PORT || 7000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});