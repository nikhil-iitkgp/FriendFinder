const { createServer } = require("http");
const { Server } = require("socket.io");

const SOCKET_PORT = process.env.PORT || process.env.SOCKET_PORT || 3004;

// Connection health tracking
let connectionHealth = {
  totalConnections: 0,
  activeConnections: 0,
  errorCount: 0,
  lastError: null,
  uptime: Date.now()
};

console.log('Starting Socket.IO server...');

// Create HTTP server for Socket.IO only
const socketServer = createServer();

// Initialize Socket.IO with enhanced configuration
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

const io = new Server(socketServer, {
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

// Store io instance globally
global.socketIO = io;

// Enhanced connection error handling
io.engine.on("connection_error", (err) => {
  console.error("Socket.IO connection error:", {
    req: err.req?.url,
    code: err.code,
    message: err.message,
    context: err.context
  });
  connectionHealth.errorCount++;
  connectionHealth.lastError = {
    timestamp: new Date().toISOString(),
    error: err.message,
    code: err.code
  };
});

// Socket.IO connection handling with enhanced error management
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  connectionHealth.totalConnections++;
  connectionHealth.activeConnections++;

  // Enhanced error handling for individual sockets
  socket.on("error", (error) => {
    console.error(`Socket ${socket.id} error:`, error);
    connectionHealth.errorCount++;
  });

  // Connection health monitoring
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    connectionHealth.activeConnections--;
  });

  // User registration with error handling
  socket.on("user-register", (userData) => {
    try {
      socket.userId = userData.userId;
      socket.username = userData.username;
      socket.join(`user-${userData.userId}`);
      console.log(`User registered: ${userData.username} (${userData.userId})`);
      
      // Send connection confirmation
      socket.emit('connection-confirmed', {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
        userId: userData.userId
      });
    } catch (error) {
      console.error('Error in user-register:', error);
      socket.emit('error', 'Failed to register user');
    }
  });

  // Random Chat Events
  socket.on("random-chat:join-queue", async (preferences) => {
    try {
      console.log(
        "User joining random chat queue:",
        socket.userId,
        preferences
      );

      // Add user to queue
      randomChatQueue.set(socket.userId, {
        socket,
        preferences,
        joinTime: new Date().toISOString()
      });

      // Send queue position
      const queuePosition = Array.from(randomChatQueue.keys()).indexOf(socket.userId) + 1;
      socket.emit("random-chat:queue-position", {
        position: queuePosition,
        estimatedWait: Math.max(30, queuePosition * 15),
      });

      // Try to match users
      setTimeout(() => tryMatchUsers(), 1000);
    } catch (error) {
      console.error("Error joining queue:", error);
      socket.emit("error", "Failed to join queue");
    }
  });

  socket.on("random-chat:leave-queue", async () => {
    try {
      console.log("User leaving random chat queue:", socket.userId);
      randomChatQueue.delete(socket.userId);
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

  socket.on("random-chat:message-send", async (data) => {
    try {
      if (!data || !data.sessionId || !data.content) {
        socket.emit("error", "Invalid message data");
        return;
      }

      console.log("Random chat message:", data);

      // Try to persist message to database
      try {
        // Import mongoose and models here to avoid circular dependencies
        const mongoose = require('mongoose');
        const dbConnect = require('./src/lib/mongoose').default;
        const RandomChatSession = require('./src/models/RandomChatSession').default;
        const User = require('./src/models/User').default;

        // Connect to database
        await dbConnect();

        // Find the session and user
        const session = activeSessions.get(data.sessionId);
        if (session) {
          // Find which user is sending the message
          const sendingUser = session.user1.socket === socket ? session.user1 : session.user2;
          
          if (sendingUser && sendingUser.userId) {
            // Find the database session
            const dbSession = await RandomChatSession.findOne({
              sessionId: data.sessionId,
              status: 'active'
            });

            if (dbSession) {
              // Convert string userId to ObjectId if needed
              let userObjectId;
              if (typeof sendingUser.userId === 'string') {
                userObjectId = new mongoose.Types.ObjectId(sendingUser.userId);
              } else {
                userObjectId = sendingUser.userId;
              }

              // Add message to database
              await dbSession.addMessage(
                userObjectId,
                sendingUser.anonymousId,
                data.content,
                data.type || 'text'
              );

              console.log(`Message persisted to database for session ${data.sessionId}`);
            }
          }
        }
      } catch (dbError) {
        console.error("Error persisting message to database:", dbError);
        // Continue with socket broadcast even if DB save fails
      }

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

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Remove from queue if present
    randomChatQueue.delete(socket.userId);
    
    // End any active sessions
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.user1.userId === socket.userId || session.user2.userId === socket.userId) {
        const otherSocket = session.user1.userId === socket.userId ? session.user2.socket : session.user1.socket;
        otherSocket.emit("random-chat:session-ended", { sessionId });
        activeSessions.delete(sessionId);
        break;
      }
    }
  });

  // Health check event
  socket.on('health-check', () => {
    socket.emit('health-response', {
      status: 'healthy',
      socketServer: {
        port: SOCKET_PORT,
        path: '/socket.io/',
        totalConnections: connectionHealth.totalConnections,
        activeConnections: connectionHealth.activeConnections,
        errorCount: connectionHealth.errorCount,
        lastError: connectionHealth.lastError,
        uptime: Date.now() - connectionHealth.uptime
      },
      timestamp: new Date().toISOString()
    });
  });
});

// Random Chat Queue Management (outside socket connection)
const randomChatQueue = new Map(); // userId -> { socket, preferences, joinTime }
const activeSessions = new Map(); // sessionId -> { user1, user2, startTime }

// Helper function to generate session ID
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to match users from queue
function tryMatchUsers() {
  const queueEntries = Array.from(randomChatQueue.entries());
  
  if (queueEntries.length < 2) return;
  
  console.log(`Trying to match users. Queue size: ${queueEntries.length}`);
  
  // Simple matching - take first two users with compatible preferences
  for (let i = 0; i < queueEntries.length - 1; i++) {
    for (let j = i + 1; j < queueEntries.length; j++) {
      const [userId1, user1] = queueEntries[i];
      const [userId2, user2] = queueEntries[j];
      
      // Check if preferences are compatible
      if (user1.preferences.chatType === user2.preferences.chatType) {
        // Create session
        const sessionId = generateSessionId();
        const session = {
          sessionId,
          user1: {
            userId: userId1,
            socket: user1.socket,
            anonymousId: `User${Math.random().toString(36).substr(2, 4)}`,
            isActive: true
          },
          user2: {
            userId: userId2,
            socket: user2.socket,
            anonymousId: `User${Math.random().toString(36).substr(2, 4)}`,
            isActive: true
          },
          chatType: user1.preferences.chatType,
          startTime: new Date().toISOString(),
          messagesCount: 0
        };
        
        // Remove users from queue
        randomChatQueue.delete(userId1);
        randomChatQueue.delete(userId2);
        
        // Add to active sessions
        activeSessions.set(sessionId, session);
        
        // Join socket rooms
        user1.socket.join(`session-${sessionId}`);
        user2.socket.join(`session-${sessionId}`);
        
        // Notify both users of match
        const sessionData = {
          sessionId,
          chatType: session.chatType,
          startTime: session.startTime,
          messagesCount: 0
        };
        
        user1.socket.emit('random-chat:session-matched', {
          ...sessionData,
          partner: {
            anonymousId: session.user2.anonymousId,
            isActive: session.user2.isActive
          }
        });
        
        user2.socket.emit('random-chat:session-matched', {
          ...sessionData,
          partner: {
            anonymousId: session.user1.anonymousId,
            isActive: session.user1.isActive
          }
        });
        
        console.log(`✅ Matched users ${userId1} and ${userId2} in session ${sessionId}`);
        return; // Exit after first match
      }
    }
  }
}

// Start Socket.IO server with enhanced error handling
socketServer.listen(SOCKET_PORT, (err) => {
  if (err) {
    console.error(`Failed to start Socket.IO server on port ${SOCKET_PORT}:`, err);
    process.exit(1);
  }
  console.log(`✅ Socket.IO server running on port ${SOCKET_PORT}`);
  console.log(`📊 Socket.IO ready for connections`);
});

// Create a simple HTTP health server on a different port
const healthPort = parseInt(SOCKET_PORT) + 1;
const healthServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      status: 'healthy',
      socketServer: {
        port: SOCKET_PORT,
        path: '/socket.io/',
        totalConnections: connectionHealth.totalConnections,
        activeConnections: connectionHealth.activeConnections,
        errorCount: connectionHealth.errorCount,
        lastError: connectionHealth.lastError,
        uptime: Date.now() - connectionHealth.uptime
      },
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

healthServer.listen(healthPort, () => {
  console.log(`🏥 Health endpoint: http://localhost:${healthPort}/health`);
});

socketServer.on('error', (error) => {
  console.error('Socket.IO server error:', error);
  connectionHealth.errorCount++;
  connectionHealth.lastError = {
    timestamp: new Date().toISOString(),
    error: error.message,
    code: error.code
  };
});