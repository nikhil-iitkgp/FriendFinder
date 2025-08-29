import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import { SessionProvider } from "next-auth/react";
import { FriendsProvider } from "@/context/FriendsContext";
import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider } from "@/context/AuthContext";

// Mock session data
export const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    image: undefined,
  },
  expires: "2024-12-31",
};

// Mock user data
export const mockUser = {
  id: "test-user-id",
  username: "testuser",
  email: "test@example.com",
  bio: "Test user bio",
  profilePicture: null,
  isDiscoveryEnabled: true,
  discoveryRange: 1000,
  friends: [],
  friendRequests: [],
  location: null,
  lastSeen: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// All the providers wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider session={mockSession}>
      <AuthProvider>
        <FriendsProvider>
          <LocationProvider>{children}</LocationProvider>
        </FriendsProvider>
      </AuthProvider>
    </SessionProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender };

// Mock fetch for API testing
export const mockFetch = (data: any, ok = true, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as Response)
  );
};

// Mock API responses
export const mockApiResponse = {
  success: (data: any) => ({
    success: true,
    data,
  }),
  error: (message: string, status = 400) => ({
    success: false,
    error: message,
    status,
  }),
};

// User interaction helpers
export const createMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});

export const createMockFriend = (overrides = {}) => ({
  id: "friend-id",
  username: "frienduser",
  email: "friend@example.com",
  profilePicture: null,
  bio: "Friend bio",
  lastSeen: new Date(),
  isOnline: false,
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  _id: "message-id",
  chatId: "chat-id",
  senderId: {
    _id: "sender-id",
    username: "sender",
    profilePicture: null,
  },
  receiverId: "receiver-id",
  content: "Test message",
  type: "text" as const,
  status: "sent" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockFriendRequest = (overrides = {}) => ({
  id: "request-id",
  from: {
    id: "from-user-id",
    username: "fromuser",
    email: "from@example.com",
    profilePicture: null,
  },
  to: {
    id: "to-user-id",
    username: "touser",
    email: "to@example.com",
    profilePicture: null,
  },
  status: "pending" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Test database helpers
export const clearTestDatabase = async () => {
  // This would clear test database in real implementation
  jest.clearAllMocks();
};

export const seedTestDatabase = async () => {
  // This would seed test database in real implementation
  return Promise.resolve();
};

// Wait utilities
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock localStorage
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
};

// Setup localStorage mock
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage(),
});
