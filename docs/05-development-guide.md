# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+
- npm 8+
- MongoDB (local or Atlas)
- Git

### Environment Setup

1. **Clone the repository:**

```bash
git clone <repository-url>
cd friendfinder
```

2. **Install dependencies:**

```bash
npm install
```

3. **Environment Configuration:**
   Create a `.env.local` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/friendfinder
# or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/friendfinder

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# External Services
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id
```

4. **Start development server:**

```bash
npm run dev
```

5. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

### Code Structure

```
src/
├── app/           # Next.js App Router pages and API routes
├── components/    # Reusable React components
├── context/       # React Context providers
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and configurations
├── models/        # Database models (Mongoose schemas)
└── types/         # TypeScript type definitions
```

### Coding Standards

#### TypeScript

- Use strict TypeScript configuration
- Define explicit types for all props and function parameters
- Use interface for object shapes, type for unions
- Avoid `any` type - use `unknown` when necessary

#### React Components

```typescript
// Good: Proper TypeScript component
interface UserCardProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  onSelect: (userId: string) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return <div onClick={() => onSelect(user.id)}>{/* Component content */}</div>;
}
```

#### API Routes

```typescript
// Good: Properly typed API route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate input
    // Process request
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error message" },
      { status: 500 }
    );
  }
}
```

### Database Development

#### Schema Design

```typescript
// Good: Well-structured Mongoose schema
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    profile: {
      avatar: String,
      bio: String,
      location: {
        city: String,
        country: String,
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
    },
    privacy: {
      showLocation: { type: Boolean, default: false },
      allowFriendRequests: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);
```

#### Database Operations

- Use transactions for multiple related operations
- Implement proper error handling
- Add appropriate indexes for query performance
- Use connection pooling

### Testing Strategy

#### Unit Tests

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Integration Tests

```bash
# Run API integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

#### Example Test

```typescript
// Good: Comprehensive test
describe("UserService", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it("should create a new user", async () => {
    const userData = {
      email: "test@example.com",
      username: "testuser",
      password: "password123",
    };

    const user = await UserService.create(userData);

    expect(user).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.passwordHash).not.toBe(userData.password);
  });
});
```

## Real-Time Development

### Socket.IO Setup

```typescript
// Client-side socket connection
import { useSocket } from "@/hooks/useSocket";

export function ChatComponent() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on("message-received", handleMessageReceived);

    return () => {
      socket.off("message-received", handleMessageReceived);
    };
  }, [socket, isConnected]);
}
```

### WebRTC Implementation

```typescript
// Peer connection setup
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

// Handle ICE candidates
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("ice-candidate", {
      candidate: event.candidate,
      targetUserId: recipientId,
    });
  }
};
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
const ChatWindow = lazy(() => import("@/components/chat/ChatWindow"));
const VideoCall = lazy(() => import("@/components/calls/VideoCall"));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ChatWindow />
</Suspense>;
```

### Image Optimization

```typescript
// Use Next.js Image component
import Image from "next/image";

<Image
  src={user.avatar}
  alt={user.name}
  width={50}
  height={50}
  className="rounded-full"
/>;
```

### Database Optimization

```typescript
// Good: Efficient queries with projection
const users = await User.find(
  { "profile.location.city": city },
  "username profile.avatar profile.bio"
).limit(20);

// Good: Use indexes
UserSchema.index({ "profile.location.coordinates": "2dsphere" });
UserSchema.index({ username: "text", "profile.bio": "text" });
```

## Debugging

### Development Tools

1. **React Developer Tools** - Component inspection
2. **Redux DevTools** - State management debugging
3. **Network Tab** - API request monitoring
4. **Socket.IO Debugger** - Real-time event monitoring

### Logging

```typescript
// Good: Structured logging
import { logger } from "@/lib/logger";

logger.info("User authenticated", {
  userId: user.id,
  timestamp: new Date().toISOString(),
});

logger.error("Database connection failed", {
  error: error.message,
  stack: error.stack,
});
```

### Error Handling

```typescript
// Good: Comprehensive error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error("Operation failed", { error });

  if (error instanceof ValidationError) {
    return { success: false, error: "Invalid input" };
  }

  if (error instanceof DatabaseError) {
    return { success: false, error: "Database error" };
  }

  return { success: false, error: "Internal server error" };
}
```

## Common Issues and Solutions

### Socket.IO Connection Issues

```typescript
// Check connection status
if (!socket?.connected) {
  // Implement fallback mechanism
  return fallbackToHTTPPolling();
}
```

### Database Connection Problems

```typescript
// Implement connection retry logic
const connectWithRetry = async (retries = 5) => {
  try {
    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return connectWithRetry(retries - 1);
    }
    throw error;
  }
};
```

### Memory Leaks Prevention

```typescript
// Clean up event listeners
useEffect(() => {
  const handleResize = () => {
    // Handle window resize
  };

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

---

_This development guide provides the foundation for contributing to FriendFinder. Follow these practices to maintain code quality and project consistency._
