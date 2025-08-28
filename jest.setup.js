import "@testing-library/jest-dom";
import "whatwg-fetch";

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/dashboard";
  },
}));

// Mock Next.js server components
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((input, init) => {
    return new Request(input, init);
  }),
  NextResponse: {
    json: jest.fn((body, init) => {
      const response = {
        status: init?.status || 200,
        headers: new Headers(init?.headers),
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      };
      return response;
    }),
    redirect: jest.fn((url, status = 302) => ({
      status,
      headers: new Headers({ Location: url }),
      url,
    })),
  },
}));

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        username: "testuser",
        image: null,
      },
    },
    status: "authenticated",
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Mock Geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

Object.defineProperty(global.navigator, "geolocation", {
  value: mockGeolocation,
});

// Mock MongoDB and Mongoose
const mockUser = {
  _id: "test-user-id",
  username: "testuser",
  email: "test@example.com",
  friends: [],
  friendRequests: [],
  sentFriendRequests: [],
  populate: jest.fn().mockReturnThis(),
  save: jest.fn(),
};

jest.mock("mongoose", () => ({
  connect: jest.fn(),
  connection: {
    readyState: 1,
  },
  Schema: jest.fn().mockImplementation(() => ({})),
  model: jest.fn(),
  models: {
    User: {
      findById: jest.fn().mockResolvedValue(mockUser),
      findOne: jest.fn().mockResolvedValue(mockUser),
      find: jest.fn().mockResolvedValue([mockUser]),
      create: jest.fn().mockResolvedValue(mockUser),
    },
  },
}));

// Mock auth utilities
jest.mock("@/lib/auth", () => ({
  getServerSession: jest.fn(() =>
    Promise.resolve({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        username: "testuser",
      },
    })
  ),
}));

// Mock Socket.IO
jest.mock("socket.io", () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
  })),
}));

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

// Mock console methods for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
