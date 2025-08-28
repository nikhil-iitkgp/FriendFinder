"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

interface Friend {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  lastSeen: Date;
  isOnline: boolean;
}

interface FriendRequest {
  id: string;
  from?: {
    id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
  to?: {
    id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

interface FriendsContextType {
  // Friends
  friends: Friend[];
  friendsLoading: boolean;
  friendsError: string | null;

  // Friend Requests
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  requestsLoading: boolean;
  requestsError: string | null;

  // Actions
  sendFriendRequest: (
    targetUserId: string
  ) => Promise<{ success: boolean; error?: string }>;
  respondToRequest: (
    requestId: string,
    action: "accept" | "reject"
  ) => Promise<{ success: boolean; error?: string }>;
  cancelRequest: (
    requestId: string
  ) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (
    friendId: string
  ) => Promise<{ success: boolean; error?: string }>;
  refreshFriends: () => Promise<void>;
  refreshRequests: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function useFriends() {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error("useFriends must be used within a FriendsProvider");
  }
  return context;
}

interface FriendsProviderProps {
  children: ReactNode;
}

export function FriendsProvider({ children }: FriendsProviderProps) {
  const { data: session, status } = useSession();

  // State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Fetch friends
  const refreshFriends = async () => {
    if (!session?.user) return;

    setFriendsLoading(true);
    setFriendsError(null);

    try {
      const response = await fetch("/api/friends", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch friends");
      }

      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      setFriendsError(
        error instanceof Error ? error.message : "Failed to fetch friends"
      );
    } finally {
      setFriendsLoading(false);
    }
  };

  // Fetch friend requests
  const refreshRequests = async () => {
    if (!session?.user) return;

    setRequestsLoading(true);
    setRequestsError(null);

    try {
      // Fetch received requests
      const receivedResponse = await fetch(
        "/api/friends/request?type=received",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Fetch sent requests
      const sentResponse = await fetch("/api/friends/request?type=sent", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!receivedResponse.ok || !sentResponse.ok) {
        throw new Error("Failed to fetch friend requests");
      }

      const receivedData = await receivedResponse.json();
      const sentData = await sentResponse.json();

      setReceivedRequests(receivedData.requests || []);
      setSentRequests(sentData.requests || []);
    } catch (error) {
      setRequestsError(
        error instanceof Error
          ? error.message
          : "Failed to fetch friend requests"
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (
    targetUserId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to send friend request",
        };
      }

      // Refresh requests to show the new sent request
      await refreshRequests();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send friend request",
      };
    }
  };

  // Respond to friend request
  const respondToRequest = async (
    requestId: string,
    action: "accept" | "reject"
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`Sending ${action} request for ID:`, requestId);
      const response = await fetch(`/api/friends/request/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Failed to ${action} request:`, data, response.status);
        return {
          success: false,
          error:
            data.error ||
            `Failed to ${action} friend request (${response.status})`,
        };
      }

      // Refresh both friends and requests
      await Promise.all([refreshFriends(), refreshRequests()]);
      return { success: true };
    } catch (error) {
      console.error(`Error in ${action} friend request:`, error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Failed to ${action} friend request`,
      };
    }
  };

  // Cancel friend request
  const cancelRequest = async (
    requestId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/friends/request/${requestId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to cancel friend request",
        };
      }

      // Refresh requests to remove the canceled request
      await refreshRequests();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel friend request",
      };
    }
  };

  // Remove friend
  const removeFriend = async (
    friendId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/friends", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ friendId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to remove friend",
        };
      }

      // Refresh friends list
      await refreshFriends();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to remove friend",
      };
    }
  };

  // Load data when session is available
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      refreshFriends();
      refreshRequests();
    }
  }, [session, status]);

  // Auto-refresh every 30 seconds when authenticated
  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = setInterval(() => {
      refreshFriends();
      refreshRequests();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [status]);

  const value: FriendsContextType = {
    friends,
    friendsLoading,
    friendsError,
    receivedRequests,
    sentRequests,
    requestsLoading,
    requestsError,
    sendFriendRequest,
    respondToRequest,
    cancelRequest,
    removeFriend,
    refreshFriends,
    refreshRequests,
  };

  return (
    <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>
  );
}
