"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { User } from "@/types";
import { signInWithCredentials, signInWithGoogle } from "@/lib/auth-client";

/**
 * Extended user type for our context
 */
interface AuthUser extends Omit<User, "_id"> {
  id: string;
}

/**
 * Auth context interface
 */
interface AuthContextType {
  // User state
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Authentication methods
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  // User data management
  refreshUser: () => Promise<void>;
  updateUserProfile: (
    data: Partial<AuthUser>
  ) => Promise<{ success: boolean; error?: string }>;

  // Friend management
  sendFriendRequest: (
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  respondToFriendRequest: (
    userId: string,
    response: "accepted" | "rejected"
  ) => Promise<{ success: boolean; error?: string }>;

  // Discovery settings
  updateDiscoverySettings: (settings: {
    isDiscoveryEnabled?: boolean;
    discoveryRange?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  updateLocation: (
    latitude: number,
    longitude: number
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Create the auth context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status, update: updateSession } = useSession();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch current user data from API
   */
  const fetchUserData = async (): Promise<AuthUser | null> => {
    try {
      const response = await fetch("/api/users/me", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null; // Not authenticated
        }
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data?.user) {
        const userData = data.data.user;
        return {
          id: userData.id || userData._id,
          username: userData.username,
          email: userData.email,
          bio: userData.bio,
          profilePicture: userData.profilePicture,
          isDiscoveryEnabled: userData.isDiscoveryEnabled,
          discoveryRange: userData.discoveryRange,
          friends: userData.friends || [],
          friendRequests: userData.friendRequests || [],
          location: userData.location,
          lastSeen: new Date(userData.lastSeen),
          currentBSSID: userData.currentBSSID,
          lastSeenWiFi: userData.lastSeenWiFi
            ? new Date(userData.lastSeenWiFi)
            : undefined,
          bluetoothId: userData.bluetoothId,
          bluetoothIdUpdatedAt: userData.bluetoothIdUpdatedAt
            ? new Date(userData.bluetoothIdUpdatedAt)
            : undefined,
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt),
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    if (session?.user) {
      setIsLoading(true);
      const userData = await fetchUserData();
      setUser(userData);
      setIsLoading(false);
    }
  };

  /**
   * Login with credentials
   */
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await signInWithCredentials(email, password);

      if (result.success) {
        // Session will be updated automatically by NextAuth
        // User data will be fetched in the useEffect
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with Google
   */
  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();

      if (result.success) {
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error) {
      console.error("Google login error:", error);
      return { success: false, error: "Google login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      setUser(null);
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update user profile
   */
  const updateUserProfile = async (data: Partial<AuthUser>) => {
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Update local user state
        setUser((prev) =>
          prev ? { ...prev, ...data, updatedAt: new Date() } : null
        );
        return { success: true };
      }

      return { success: false, error: result.error || "Update failed" };
    } catch (error) {
      console.error("Update profile error:", error);
      return { success: false, error: "Update failed" };
    }
  };

  /**
   * Send friend request
   */
  const sendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ targetUserId: userId }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh user data to update friend requests
        await refreshUser();
        return { success: true };
      }

      return {
        success: false,
        error: result.error || "Failed to send friend request",
      };
    } catch (error) {
      console.error("Send friend request error:", error);
      return { success: false, error: "Failed to send friend request" };
    }
  };

  /**
   * Respond to friend request
   */
  const respondToFriendRequest = async (
    userId: string,
    response: "accepted" | "rejected"
  ) => {
    try {
      const apiResponse = await fetch("/api/friends/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ fromUserId: userId, response }),
      });

      const result = await apiResponse.json();

      if (result.success) {
        // Refresh user data to update friends and requests
        await refreshUser();
        return { success: true };
      }

      return {
        success: false,
        error: result.error || "Failed to respond to friend request",
      };
    } catch (error) {
      console.error("Respond to friend request error:", error);
      return { success: false, error: "Failed to respond to friend request" };
    }
  };

  /**
   * Update discovery settings
   */
  const updateDiscoverySettings = async (settings: {
    isDiscoveryEnabled?: boolean;
    discoveryRange?: number;
  }) => {
    return updateUserProfile(settings);
  };

  /**
   * Update user location
   */
  const updateLocation = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch("/api/users/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ latitude, longitude }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local user state
        setUser((prev) =>
          prev
            ? {
                ...prev,
                location: {
                  type: "Point",
                  coordinates: [longitude, latitude],
                },
                lastSeen: new Date(),
              }
            : null
        );
        return { success: true };
      }

      return {
        success: false,
        error: result.error || "Failed to update location",
      };
    } catch (error) {
      console.error("Update location error:", error);
      return { success: false, error: "Failed to update location" };
    }
  };

  /**
   * Effect to handle session changes
   */
  useEffect(() => {
    const handleSessionChange = async () => {
      if (status === "loading") {
        return; // Still loading
      }

      if (status === "unauthenticated" || !session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (status === "authenticated" && session?.user) {
        // Fetch full user data from API
        const userData = await fetchUserData();
        setUser(userData);
        setIsLoading(false);
      }
    };

    handleSessionChange();
  }, [session, status]);

  /**
   * Computed values
   */
  const isAuthenticated = !!session?.user && !!user;

  /**
   * Context value
   */
  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || status === "loading",
    isAuthenticated,
    login,
    loginWithGoogle,
    logout,
    refreshUser,
    updateUserProfile,
    sendFriendRequest,
    respondToFriendRequest,
    updateDiscoverySettings,
    updateLocation,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

/**
 * Hook to require authentication
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = "/login";
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}
