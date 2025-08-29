import { render, screen, waitFor, act } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import RealTimeNotifications from "@/components/notifications/RealTimeNotifications";
import { customRender } from "@/lib/test-utils";

// Mock next-auth
jest.mock("next-auth/react");
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock useAuth context
const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useFriends context
const mockUseFriends = jest.fn();
jest.mock("@/context/FriendsContext", () => ({
  useFriends: () => mockUseFriends(),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock timers
jest.useFakeTimers();

describe("Real-time Notifications Tests", () => {
  const mockUser = {
    id: "user123",
    email: "test@example.com",
    username: "testuser",
  };

  const mockSession = {
    user: {
      id: "user123",
      email: "test@example.com",
      name: "Test User",
      username: "testuser",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: jest.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: mockUser,
    });

    mockUseFriends.mockReturnValue({
      receivedRequests: [],
      refreshRequests: jest.fn(),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Friend Request Notifications", () => {
    it("should show notification for new friend request", async () => {
      const refreshRequests = jest.fn();

      // Start with no requests
      mockUseFriends.mockReturnValue({
        receivedRequests: [],
        refreshRequests,
      });

      const { rerender } = customRender(<RealTimeNotifications />);

      // Simulate new friend request
      const newRequest = {
        id: "req123",
        from: {
          id: "user456",
          username: "newuser",
          email: "new@example.com",
        },
        status: "pending",
        createdAt: new Date(),
      };

      mockUseFriends.mockReturnValue({
        receivedRequests: [newRequest],
        refreshRequests,
      });

      rerender(<RealTimeNotifications />);

      expect(mockToast.success).toHaveBeenCalledWith(
        "New friend request from newuser",
        expect.objectContaining({
          description: "Tap to view and respond",
          action: expect.objectContaining({
            label: "View",
          }),
        })
      );
    });

    it("should show notification for multiple friend requests", async () => {
      const refreshRequests = jest.fn();

      // Start with one request
      mockUseFriends.mockReturnValue({
        receivedRequests: [
          {
            id: "req1",
            from: { id: "user1", username: "user1" },
            status: "pending",
          },
        ],
        refreshRequests,
      });

      const { rerender } = customRender(<RealTimeNotifications />);

      // Add two more requests
      mockUseFriends.mockReturnValue({
        receivedRequests: [
          {
            id: "req1",
            from: { id: "user1", username: "user1" },
            status: "pending",
          },
          {
            id: "req2",
            from: { id: "user2", username: "user2" },
            status: "pending",
          },
          {
            id: "req3",
            from: { id: "user3", username: "user3" },
            status: "pending",
          },
        ],
        refreshRequests,
      });

      rerender(<RealTimeNotifications />);

      expect(mockToast.success).toHaveBeenCalledWith(
        "2 new friend requests",
        expect.objectContaining({
          description: "Tap to view and respond",
        })
      );
    });

    it("should refresh friend requests periodically", async () => {
      const refreshRequests = jest.fn();

      mockUseFriends.mockReturnValue({
        receivedRequests: [],
        refreshRequests,
      });

      customRender(<RealTimeNotifications />);

      // Fast-forward time by 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(refreshRequests).toHaveBeenCalled();
    });
  });

  describe("Message Notifications", () => {
    it("should show notification for new messages", async () => {
      const conversations = [
        {
          participant: {
            id: "user456",
            username: "friend1",
          },
          latestMessage: {
            content: "Hey, how are you doing?",
            createdAt: new Date().toISOString(),
            senderId: "user456",
          },
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ conversations }),
      } as Response);

      customRender(<RealTimeNotifications />);

      // Fast-forward time to trigger message check
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/conversations");
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "New message from friend1",
          expect.objectContaining({
            description: "Hey, how are you doing?",
            action: expect.objectContaining({
              label: "View",
            }),
          })
        );
      });
    });

    it("should truncate long message content in notifications", async () => {
      const longMessage =
        "This is a very long message that should be truncated when shown in the notification to prevent the notification from being too long and overwhelming";

      const conversations = [
        {
          participant: {
            id: "user456",
            username: "friend1",
          },
          latestMessage: {
            content: longMessage,
            createdAt: new Date().toISOString(),
            senderId: "user456",
          },
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ conversations }),
      } as Response);

      customRender(<RealTimeNotifications />);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "New message from friend1",
          expect.objectContaining({
            description: longMessage.substring(0, 50) + "...",
          })
        );
      });
    });

    it("should not show notifications for own messages", async () => {
      const conversations = [
        {
          participant: {
            id: "user456",
            username: "friend1",
          },
          latestMessage: {
            content: "This is my own message",
            createdAt: new Date().toISOString(),
            senderId: "user123", // Current user's ID
          },
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ conversations }),
      } as Response);

      customRender(<RealTimeNotifications />);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });

  describe("Online Status Notifications", () => {
    it("should show online status notification", async () => {
      customRender(<RealTimeNotifications />);

      // Fast-forward time to trigger online status
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        "You're now online",
        expect.objectContaining({
          description: "Friends can see your activity",
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle friend request refresh errors gracefully", async () => {
      const refreshRequests = jest
        .fn()
        .mockRejectedValue(new Error("API Error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockUseFriends.mockReturnValue({
        receivedRequests: [],
        refreshRequests,
      });

      customRender(<RealTimeNotifications />);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error checking for new requests:",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it("should handle message check errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockFetch.mockRejectedValue(new Error("Network Error"));

      customRender(<RealTimeNotifications />);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error checking for new messages:",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup intervals on unmount", () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      const { unmount } = customRender(<RealTimeNotifications />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe("Authentication States", () => {
    it("should not start timers when user is not authenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: jest.fn(),
      });

      customRender(<RealTimeNotifications />);

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not start timers when user data is missing", () => {
      mockUseAuth.mockReturnValue({
        user: null,
      });

      customRender(<RealTimeNotifications />);

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
