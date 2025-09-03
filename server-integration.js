const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Connection health tracking
let connectionHealth = {
  totalConnections: 0,
  activeConnections: 0,
  errorCount: 0,
  lastError: null,
  uptime: Date.now()
};

// Random chat state
const waitingQueue = new Map();
const activeSessions = new Map();
const connectedUsers = new Map();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Initialize Socket.IO with production-ready configuration
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins = isDevelopment 
    ? [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:3003",
      ]
    : [
        "https://friendfinder-0i02.onrender.com",
        process.env.NEXTAUTH_URL,
      ].filter(Boolean);

  console.log('Socket.IO CORS origins:', allowedOrigins);

  const io = new Server(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 20000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const isAllowed = !origin || allowedOrigins.some(allowed => 
        origin === allowed || (isDevelopment && origin.includes('localhost'))
      );
      console.log(`Socket.IO connection request from ${origin}: ${isAllowed ? 'ALLOWED' : 'DENIED'}`);
      callback(null, isAllowed);
    }
  });

  // Store io instance globally for API routes
  global.socketIO = io;

  // Enhanced connection error handling
  io.engine.on("connection_error", (err) => {
    console.error("Socket.IO connection error:", {
      req: err.req?.url,
      code: err.code,
      message: err.message,
      context: err.context,
    });
    
    connectionHealth.errorCount++;
    connectionHealth.lastError = {
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    };
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    connectionHealth.totalConnections++;
    connectionHealth.activeConnections++;

    // User registration
    socket.on("user-register", (userData) => {
      try {
        socket.userId = userData.userId;
        socket.userEmail = userData.email;
        socket.userName = userData.name;
        socket.anonymousId = userData.anonymousId || `User${Math.random().toString(36).substr(2, 4)}`;
        
        connectedUsers.set(socket.userId, {
          socket,
          userData,
          connectedAt: new Date()
        });
        
        console.log("User registered:", userData.name, `(${userData.userId})`);
        socket.emit("user-registered", { 
          success: true, 
          anonymousId: socket.anonymousId,
          userId: socket.userId 
        });
      } catch (error) {
        console.error("Error registering user:", error);
        socket.emit("error", "Failed to register user");
      }
    });

    // Random chat queue management
    socket.on("random-chat:join-queue", (preferences) => {
      try {
        console.log("User joining queue:", socket.userId, preferences);
        
        const queueEntry = {
          socket,
          userId: socket.userId,
          anonymousId: socket.anonymousId || `User${Math.random().toString(36).substr(2, 4)}`,
          preferences,
          joinedAt: new Date()
        };
        
        waitingQueue.set(socket.userId, queueEntry);
        
        // Try to find a match immediately
        const match = findMatch(queueEntry);
        if (match) {
          createSession(queueEntry, match);
        } else {
          socket.emit("random-chat:queue-joined", {
            position: waitingQueue.size,
            estimatedWaitTime: Math.min(waitingQueue.size * 30, 300),
            anonymousId: queueEntry.anonymousId
          });
        }
      } catch (error) {
        console.error("Error joining queue:", error);
        socket.emit("error", "Failed to join queue");
      }
    });

    socket.on("random-chat:leave-queue", () => {
      try {
        waitingQueue.delete(socket.userId);
        socket.emit("random-chat:queue-left");
      } catch (error) {
        console.error("Error leaving queue:", error);
        socket.emit("error", "Failed to leave queue");
      }
    });

    socket.on("random-chat:end-session", async (sessionId) => {
      try {
        console.log("User ending session:", socket.userId, sessionId);
        const session = activeSessions.get(sessionId);
        if (session) {
          // Notify other user first
          const otherSocket = session.user1.userId === socket.userId ? session.user2.socket : session.user1.socket;
          if (otherSocket && otherSocket.connected) {
            otherSocket.emit("random-chat:session-ended", { 
              sessionId, 
              reason: "partner_left",
              timestamp: new Date().toISOString()
            });
          }
          
          // Remove session
          activeSessions.delete(sessionId);
          
          // Leave socket rooms
          if (session.user1.socket && session.user1.socket.connected) {
            session.user1.socket.leave(`session-${sessionId}`);
          }
          if (session.user2.socket && session.user2.socket.connected) {
            session.user2.socket.leave(`session-${sessionId}`);
          }
        }
        
        // Confirm to the user who ended the session
        socket.emit("random-chat:session-ended", { 
          sessionId, 
          reason: "user_left",
          timestamp: new Date().toISOString()
        });
        socket.leave(`session-${sessionId}`);
        
      } catch (error) {
        console.error("Error ending session:", error);
        socket.emit("error", "Failed to end session");
      }
    });

    socket.on("random-chat:message-send", (data) => {
      try {
        if (!data || !data.sessionId || !data.content) {
          socket.emit("error", "Invalid message data");
          return;
        }

        console.log("Random chat message:", data);

        // Broadcast to session participants
        socket
          .to(`session-${data.sessionId}`)
          .emit("random-chat:message-received", {
            messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sessionId: data.sessionId,
            anonymousId: socket.anonymousId || "Anonymous",
            content: data.content,
            timestamp: new Date().toISOString(),
            type: data.type || "text",
            isOwn: false,
          });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    socket.on("random-chat:join-session", (sessionId) => {
      try {
        if (!sessionId) {
          socket.emit("error", "Invalid session ID");
          return;
        }
        socket.join(`session-${sessionId}`);
        console.log(`User ${socket.userId} joined session ${sessionId}`);
        
        // Notify user of successful join
        socket.emit('random-chat:session-joined', {
          sessionId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', 'Failed to join session');
      }
    });

    socket.on("random-chat:typing-start", (sessionId) => {
      try {
        socket.to(`session-${sessionId}`).emit("random-chat:typing-start", {
          anonymousId: socket.anonymousId || "Anonymous"
        });
      } catch (error) {
        console.error("Error handling typing start:", error);
      }
    });

    socket.on("random-chat:typing-stop", (sessionId) => {
      try {
        socket.to(`session-${sessionId}`).emit("random-chat:typing-stop", {
          anonymousId: socket.anonymousId || "Anonymous"
        });
      } catch (error) {
        console.error("Error handling typing stop:", error);
      }
    });

    // WebRTC Events
    socket.on('random-chat:webrtc-offer', (data) => {
      try {
        socket.to(`session-${data.sessionId}`).emit('random-chat:webrtc-offer-received', data);
      } catch (error) {
        console.error('Error handling WebRTC offer:', error);
      }
    });

    socket.on('random-chat:webrtc-answer', (data) => {
      try {
        socket.to(`session-${data.sessionId}`).emit('random-chat:webrtc-answer-received', data);
      } catch (error) {
        console.error('Error handling WebRTC answer:', error);
      }
    });

    socket.on('random-chat:webrtc-ice-candidate', (data) => {
      try {
        socket.to(`session-${data.sessionId}`).emit('random-chat:webrtc-ice-candidate-received', data);
      } catch (error) {
        console.error('Error handling WebRTC ICE candidate:', error);
      }
    });

    // Disconnect handling
    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, reason);
      connectionHealth.activeConnections--;
      
      // Clean up user data
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        waitingQueue.delete(socket.userId);
        
        // Handle active sessions
        for (const [sessionId, session] of activeSessions.entries()) {
          if (session.user1.userId === socket.userId || session.user2.userId === socket.userId) {
            const otherUser = session.user1.userId === socket.userId ? session.user2 : session.user1;
            if (otherUser.socket && otherUser.socket.connected) {
              otherUser.socket.emit("random-chat:session-ended", { 
                sessionId, 
                reason: "partner_disconnected" 
              });
            }
            activeSessions.delete(sessionId);
            break;
          }
        }
      }
    });
  });

  // Helper functions
  function findMatch(queueEntry) {
    for (const [userId, entry] of waitingQueue.entries()) {
      if (userId !== queueEntry.userId && 
          entry.preferences.chatType === queueEntry.preferences.chatType) {
        waitingQueue.delete(userId);
        return entry;
      }
    }
    return null;
  }

  function createSession(user1, user2) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      sessionId,
      user1: {
        userId: user1.userId,
        socket: user1.socket,
        anonymousId: user1.anonymousId
      },
      user2: {
        userId: user2.userId,
        socket: user2.socket,
        anonymousId: user2.anonymousId
      },
      chatType: user1.preferences.chatType,
      startTime: new Date(),
      messages: []
    };
    
    activeSessions.set(sessionId, session);
    
    // Join both users to session room
    user1.socket.join(`session-${sessionId}`);
    user2.socket.join(`session-${sessionId}`);
    
    // Notify both users
    const sessionData = {
      sessionId,
      chatType: session.chatType,
      startTime: session.startTime.toISOString(),
      messagesCount: 0
    };
    
    user1.socket.emit("random-chat:match-found", {
      ...sessionData,
      userAnonymousId: user1.anonymousId,
      partner: {
        anonymousId: user2.anonymousId,
        username: user2.anonymousId,
        isActive: true
      }
    });
    
    user2.socket.emit("random-chat:match-found", {
      ...sessionData,
      userAnonymousId: user2.anonymousId,
      partner: {
        anonymousId: user1.anonymousId,
        username: user1.anonymousId,
        isActive: true
      }
    });
    
    console.log(`Session created: ${sessionId} between ${user1.anonymousId} and ${user2.anonymousId}`);
  }

  // Health check endpoint
  httpServer.on('request', (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        uptime: Date.now() - connectionHealth.uptime,
        connections: {
          total: connectionHealth.totalConnections,
          active: connectionHealth.activeConnections,
          errors: connectionHealth.errorCount
        },
        queues: {
          waiting: waitingQueue.size,
          activeSessions: activeSessions.size
        },
        lastError: connectionHealth.lastError,
        timestamp: new Date().toISOString()
      }));
      return;
    }
  });

  httpServer
    .once("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`✅ Socket.IO server integrated with Next.js on port ${port}`);
      console.log(`🔗 Health endpoint: http://${hostname}:${port}/health`);
    });
});
