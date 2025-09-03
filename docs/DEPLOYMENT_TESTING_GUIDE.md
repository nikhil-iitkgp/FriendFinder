# Socket.IO Error Handling - Deployment & Testing Guide

## Quick Start Guide

### 1. Development Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Next.js development server
npm run dev
# ✅ Next.js will run on http://localhost:3001

# 3. In a new terminal, start Socket.IO server
node server.js
# ✅ Socket.IO will run on http://localhost:3004
```

### 2. Verify Installation

#### Check Socket.IO Server Health
```bash
# Test Socket.IO server health endpoint
curl http://localhost:3004/health
```

Expected response:
```json
{
  "status": "healthy",
  "socketServer": {
    "port": 3004,
    "path": "/socket.io/",
    "totalConnections": 0,
    "activeConnections": 0,
    "errorCount": 0,
    "uptime": 12345
  },
  "timestamp": "2025-01-02T10:30:00.000Z"
}
```

#### Test Socket.IO Connection
1. Open browser to `http://localhost:3001`
2. Navigate to Settings or Dashboard
3. Look for Socket.IO Health Monitor component
4. Verify connection status shows "Connected"

## Testing Procedures

### 1. **Connection Reliability Tests**

#### Test 1: Normal Connection
```bash
# Expected: Successful WebSocket connection
# Check: Health monitor shows "Connected" status
# Transport: "websocket"
```

#### Test 2: Server Restart Recovery
```bash
# 1. Stop Socket.IO server (Ctrl+C)
# 2. Observe: Client shows "Reconnecting" status
# 3. Restart server: node server.js
# 4. Expected: Auto-reconnection within 10s
```

#### Test 3: Network Interruption
```bash
# Simulate network issues:
# 1. Disconnect internet/WiFi
# 2. Expected: Fallback mode activation
# 3. Reconnect internet
# 4. Expected: Return to normal mode
```

#### Test 4: HTTP Fallback Testing
```bash
# 1. Stop Socket.IO server completely
# 2. Try sending messages/friend requests
# 3. Expected: Operations queued for HTTP fallback
# 4. Check queue status in health monitor
```

### 2. **Error Handling Tests**

#### Test ECONNREFUSED Error
```javascript
// In browser console:
// Expected: Error classification and retry attempts
console.log('Testing connection refusal...');
```

#### Test Server Error Recovery
```javascript
// Trigger server-side error and observe recovery
// Expected: Graceful error handling and fallback activation
```

### 3. **Performance Tests**

#### Connection Speed Test
```bash
# Measure connection establishment time
# Target: <2 seconds
# Monitor via health dashboard
```

#### Message Delivery Test
```bash
# Send multiple messages rapidly
# Target: <100ms delivery latency
# Check success rate in health monitor
```

## Production Deployment

### 1. **Environment Configuration**

Create `.env.production` file:
```bash
# Production Socket.IO Configuration
SOCKET_PORT=3004
NEXT_PUBLIC_SOCKET_URL=http://your-domain.com:3004
SOCKET_CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Health Monitoring
SOCKET_PING_INTERVAL=25000
SOCKET_TIMEOUT=20000
SOCKET_RETRY_ATTEMPTS=5

# Security
NODE_ENV=production
```

### 2. **Build and Deploy**

```bash
# 1. Build production bundle
npm run build

# 2. Start production servers
npm start &                    # Next.js production server
NODE_ENV=production node server.js &  # Socket.IO server

# 3. Verify deployment
curl http://your-domain.com:3004/health
```

### 3. **Load Balancer Configuration**

#### Nginx Configuration Example
```nginx
upstream socketio_backend {
    server localhost:3004;
    # Add more servers for scaling
}

server {
    listen 80;
    server_name your-domain.com;

    # Socket.IO proxy
    location /socket.io/ {
        proxy_pass http://socketio_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring Setup

### 1. **Health Check Automation**

Create `scripts/health-check.js`:
```javascript
const fetch = require('node-fetch');

async function healthCheck() {
    try {
        const response = await fetch('http://localhost:3004/health');
        const data = await response.json();
        
        if (data.status === 'healthy') {
            console.log('✅ Socket.IO server healthy');
            process.exit(0);
        } else {
            console.log('❌ Socket.IO server unhealthy');
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ Socket.IO server unreachable');
        process.exit(1);
    }
}

healthCheck();
```

### 2. **Continuous Monitoring**

#### Cron Job Setup
```bash
# Add to crontab: crontab -e
# Check health every 5 minutes
*/5 * * * * cd /path/to/friendfinder && node scripts/health-check.js
```

#### Process Manager (PM2)
```bash
# Install PM2
npm install -g pm2

# Start services with PM2
pm2 start npm --name "nextjs" -- start
pm2 start server.js --name "socketio"

# Monitor processes
pm2 monit

# Auto-restart on failure
pm2 save
pm2 startup
```

### 3. **Alert Configuration**

#### Email Alerts (using nodemailer)
```javascript
// scripts/alert-system.js
const nodemailer = require('nodemailer');

async function sendAlert(message) {
    // Configure your email service
    const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.ALERT_EMAIL,
            pass: process.env.ALERT_PASSWORD
        }
    });

    await transporter.sendMail({
        from: 'alerts@your-domain.com',
        to: 'admin@your-domain.com',
        subject: 'FriendFinder Socket.IO Alert',
        text: message
    });
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. **"server error" Messages**
```bash
# Symptoms: Repeated "server error" in console
# Solution: Check server.js logs, verify port configuration
# Command: node server.js (check for startup errors)
```

#### 2. **Connection Timeout**
```bash
# Symptoms: "connect_error" timeout messages  
# Solution: Check firewall, network connectivity
# Test: curl http://localhost:3004/health
```

#### 3. **Port Already in Use**
```bash
# Symptoms: EADDRINUSE error on startup
# Solution: Find and kill process using port
# Commands:
netstat -ano | findstr :3004  # Find process
taskkill /PID <process-id> /F  # Kill process
```

#### 4. **Fallback Mode Stuck**
```bash
# Symptoms: Health monitor shows permanent fallback
# Solution: Check Socket.IO server status, restart if needed
# Commands:
pm2 restart socketio  # If using PM2
# OR
node server.js        # Manual restart
```

#### 5. **High Error Rate**
```bash
# Symptoms: >5% error rate in health monitor
# Solution: Check server resources, network stability
# Investigation:
# - Review error patterns in health dashboard
# - Check server CPU/memory usage
# - Verify network connectivity
```

### Debug Commands

#### Check Socket.IO Server Status
```bash
# Test server connectivity
curl -v http://localhost:3004/health

# Check server logs
tail -f server.log  # If logging to file

# Monitor real-time connections
# Use health dashboard in browser
```

#### Browser Debugging
```javascript
// Open browser console and run:
console.log('Socket status:', window.socketConnectionState);

// Check health status programmatically
fetch('/api/socket-health')
  .then(r => r.json())
  .then(console.log);
```

#### Network Diagnostics
```bash
# Test Socket.IO endpoint
curl -H "Upgrade: websocket" -H "Connection: Upgrade" \
     http://localhost:3004/socket.io/

# Check port accessibility
telnet localhost 3004
```

## Performance Optimization

### 1. **Connection Pool Settings**
```javascript
// In server.js - optimize for high concurrency
const io = new Server(socketServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    transports: ['websocket', 'polling']
});
```

### 2. **Memory Management**
```bash
# Monitor memory usage
node --max-old-space-size=4096 server.js

# Use PM2 for automatic restarts on memory limits
pm2 start server.js --max-memory-restart 500M
```

### 3. **Database Optimization**
```javascript
// Optimize MongoDB connections for Socket.IO
mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
});
```

## Security Hardening

### 1. **Production Security**
```javascript
// Enhanced CORS configuration
cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
    credentials: true,
    methods: ['GET', 'POST']
}
```

### 2. **Rate Limiting**
```javascript
// Implement connection rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
```

### 3. **Authentication Verification**
```javascript
// Add authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        const user = await verifyToken(token);
        socket.userId = user.id;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});
```

## Success Metrics

### Key Performance Indicators
- **Connection Success Rate**: >99%
- **Average Connection Time**: <2 seconds
- **Message Delivery Rate**: >99.5%
- **Error Recovery Time**: <10 seconds
- **Fallback Activation**: <5% of sessions

### Monitoring Dashboard Metrics
- Real-time connection count
- Error frequency and patterns
- Queue processing statistics
- Transport type distribution
- Geographic connection distribution

This guide provides comprehensive instructions for deploying, testing, and maintaining the Socket.IO error handling system in production environments.