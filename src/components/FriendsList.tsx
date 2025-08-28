"use client";

import React from "react";
import { User, MessageCircle, Phone, UserMinus, Circle } from "lucide-react";
import { useFriends } from "@/context/FriendsContext";

interface Friend {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  lastSeen: Date;
  isOnline: boolean;
}

interface FriendCardProps {
  friend: Friend;
  onStartChat?: (friendId: string) => void;
  onStartCall?: (friendId: string) => void;
}

function FriendCard({ friend, onStartChat, onStartCall }: FriendCardProps) {
  const { removeFriend } = useFriends();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  const handleRemoveFriend = async () => {
    setIsLoading(true);
    try {
      const result = await removeFriend(friend.id);
      if (!result.success) {
        console.error("Failed to remove friend:", result.error);
      }
    } catch (error) {
      console.error("Error removing friend:", error);
    } finally {
      setIsLoading(false);
      setShowConfirmDelete(false);
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Profile Picture with Online Status */}
          <div className="relative">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {friend.profilePicture ? (
                <img
                  src={friend.profilePicture}
                  alt={friend.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-gray-400" />
              )}
            </div>
            {/* Online Status Indicator */}
            <div className="absolute -bottom-1 -right-1">
              <Circle
                className={`w-4 h-4 ${
                  friend.isOnline
                    ? "fill-green-400 text-green-400"
                    : "fill-gray-300 text-gray-300"
                }`}
              />
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{friend.username}</h3>
            <p className="text-sm text-gray-500">{friend.email}</p>
            {friend.bio && (
              <p className="text-xs text-gray-400 mt-1 truncate max-w-48">
                {friend.bio}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {formatLastSeen(friend.lastSeen)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {onStartChat && (
            <button
              onClick={() => onStartChat(friend.id)}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Start Chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}

          {onStartCall && (
            <button
              onClick={() => onStartCall(friend.id)}
              className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
              title="Start Call"
            >
              <Phone className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowConfirmDelete(!showConfirmDelete)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove Friend"
            >
              <UserMinus className="w-5 h-5" />
            </button>

            {/* Confirmation Dropdown */}
            {showConfirmDelete && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                <p className="text-sm text-gray-600 mb-2">
                  Remove {friend.username}?
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleRemoveFriend}
                    disabled={isLoading}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isLoading ? "Removing..." : "Remove"}
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FriendsListProps {
  onStartChat?: (friendId: string) => void;
  onStartCall?: (friendId: string) => void;
}

export default function FriendsList({
  onStartChat,
  onStartCall,
}: FriendsListProps) {
  const { friends, friendsLoading, friendsError, refreshFriends } =
    useFriends();

  if (friendsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (friendsError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{friendsError}</p>
          <button
            onClick={refreshFriends}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Friends ({friends.length})
        </h2>
      </div>

      <div className="p-4">
        {friends.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No friends yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Use the discovery features to find and connect with people nearby!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onStartChat={onStartChat}
                onStartCall={onStartCall}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
