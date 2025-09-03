# FriendFinder Development Guide

## Quick Start

### Development Servers

FriendFinder requires two servers to run properly:

1. **Next.js Server** (port 3000) - Main application
2. **Socket.IO Server** (port 3004) - Real-time features

### Starting Development Environment

#### Option 1: Full Development (Recommended)
```bash
npm run dev:full
```
This starts:
- Next.js server on port 3000
- Socket.IO server on port 3004
- Health monitor for both services

#### Option 2: Individual Servers
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start Socket.IO
npm run dev:socket

# Terminal 3 (Optional): Start Health Monitor
npm run dev:health
```

### Production Deployment
```bash
npm run start:production
```

## Troubleshooting

### Common Issues

#### 1. Socket.IO Connection Errors (503)
**Problem**: Seeing errors like:
```
GET http://localhost:3000/api/socket.io?... 503 (Service Unavailable)
Socket connection error: Error: timeout
```

**Solution**: 
- Use `npm run dev:full` instead of just `npm run dev`
- Ensure Socket.IO server is running on port 3004
- Check the health monitor output

#### 2. React Hydration Mismatches
**Problem**: Console warnings about server/client HTML mismatches

**Solution**: 
- Already fixed in dashboard layout with proper hydration handling
- Components use `mounted` state for responsive classes

#### 3. Random Chat Page Errors
**Problem**: Random chat features not working

**Solution**:
- Ensure both servers are running with `npm run dev:full`
- Check Socket.IO connection status in dev tools
- Use the health monitor to verify server status

### Health Monitoring

The application includes comprehensive health monitoring:

- **Health Monitor Script**: Real-time status of both servers
- **Connection Status Dashboard**: Available in-app for users
- **Health API Endpoints**: 
  - `/api/health` - Next.js server health
  - `/api/socket-health` - Socket.IO server health

### Development Workflow

1. **Start Development**:
   ```bash
   npm run dev:full
   ```

2. **Monitor Status**: The health monitor will show:
   - ✅ Next.js running on port 3000
   - ✅ Socket.IO running on port 3004
   - Connection status and error counts

3. **Debugging**: If issues occur:
   - Check health monitor output
   - Use browser dev tools for client-side errors
   - Check server logs for Socket.IO issues

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Socket.IO     │
│   Port 3000     │────│   Port 3004     │
│                 │    │                 │
│ • Web Interface │    │ • Real-time     │
│ • API Routes    │    │ • Chat          │
│ • Proxy to      │    │ • Notifications │
│   Socket.IO     │    │ • Presence      │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              Health Monitor
```

### Environment Variables

```env
# Socket.IO Configuration
SOCKET_PORT=3004
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_PORT=3004
```

### Features Status

- ✅ **Connection Management**: Automatic reconnection with exponential backoff
- ✅ **Fallback Mode**: HTTP API fallback when Socket.IO is unavailable  
- ✅ **Health Monitoring**: Real-time server health tracking
- ✅ **Error Recovery**: Graceful degradation and recovery
- ✅ **Development Tools**: Comprehensive debugging and monitoring

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

The application includes comprehensive test coverage for:
- Socket.IO connection handling
- Error recovery mechanisms
- Fallback functionality
- Real-time features