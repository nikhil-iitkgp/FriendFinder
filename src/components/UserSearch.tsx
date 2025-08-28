"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Users,
  MessageCircle,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { useFriends } from "@/context/FriendsContext";

interface SearchResult {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  lastSeen: Date;
  isOnline: boolean;
  isDiscoveryEnabled: boolean;
  isFriend: boolean;
  hasPendingRequestFrom: boolean;
  hasPendingRequestTo: boolean;
}

interface UserSearchProps {
  initialQuery?: string;
  onSendRequest?: (
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function UserSearch({ initialQuery, onSendRequest }: UserSearchProps) {
  const { sendFriendRequest } = useFriends();
  const [query, setQuery] = useState(initialQuery || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  // Set initial query when prop changes
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await performSearch(query);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      setSearchError("Failed to search users");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setIsLoading((prev) => ({ ...prev, [userId]: true }));

    try {
      const handler = onSendRequest || sendFriendRequest;
      const result = await handler(userId);

      if (result.success) {
        // Refresh search results to update status
        if (query.trim()) {
          await performSearch(query);
        }
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffInMinutes =
      (now.getTime() - new Date(lastSeen).getTime()) / (1000 * 60);

    if (diffInMinutes < 5) {
      return "Online now";
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getActionButton = (user: SearchResult) => {
    if (user.isFriend) {
      return (
        <div className="flex items-center space-x-1 text-green-600 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Friends</span>
        </div>
      );
    }

    if (user.hasPendingRequestTo) {
      return (
        <div className="flex items-center space-x-1 text-yellow-600 text-sm">
          <Clock className="w-4 h-4" />
          <span>Sent</span>
        </div>
      );
    }

    if (user.hasPendingRequestFrom) {
      return (
        <div className="flex items-center space-x-1 text-blue-600 text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>Pending</span>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(user.id)}
        disabled={isLoading[user.id]}
        className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserPlus className="w-4 h-4" />
        <span>{isLoading[user.id] ? "Sending..." : "Add"}</span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Search Users
        </h3>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="p-4">
        {/* Loading State */}
        {isSearching && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Searching...</p>
          </div>
        )}

        {/* Error State */}
        {searchError && (
          <div className="text-center py-4">
            <p className="text-red-600">{searchError}</p>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && !searchError && query && results.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try a different search term
            </p>
          </div>
        )}

        {/* No Query State */}
        {!query && (
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Start typing to search for users</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {/* Profile Picture */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    {/* Online Status */}
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {user.username}
                    </h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">
                      {formatLastSeen(user.lastSeen)}
                    </p>
                  </div>

                  {/* User ID for testing */}
                  <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                    ID: {user.id.slice(-6)}
                  </div>
                </div>

                {/* Action Button */}
                <div>{getActionButton(user)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
