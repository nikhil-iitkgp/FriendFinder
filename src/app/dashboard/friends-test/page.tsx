"use client";

import React, { useState } from "react";
import { Users, UserPlus, Search, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import FriendsList from "@/components/FriendsList";
import FriendRequestsManager from "@/components/FriendRequestsManager";
import UserSearch from "@/components/UserSearch";
import { useFriends } from "@/context/FriendsContext";
import { useLocation } from "@/context/LocationContext";

export default function FriendsTestPage() {
  const router = useRouter();
  const { sendFriendRequest } = useFriends();
  const { nearbyUsers } = useLocation();

  const [targetUserId, setTargetUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) return;

    setIsLoading(true);
    setMessage("");

    try {
      const result = await sendFriendRequest(targetUserId.trim());
      if (result.success) {
        setMessage("Friend request sent successfully!");
        setTargetUserId("");
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage("Error sending friend request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = (friendId: string) => {
    console.log("Starting chat with friend:", friendId);
    // TODO: Implement chat functionality in next steps
    setMessage(`Chat with friend ${friendId} - Feature coming in next steps!`);
  };

  const handleStartCall = (friendId: string) => {
    console.log("Starting call with friend:", friendId);
    // TODO: Implement call functionality with existing WebRTC
    setMessage(`Call with friend ${friendId} - Feature coming in next steps!`);
  };

  const handleSendRequestToNearby = async (userId: string) => {
    setIsLoading(true);
    try {
      const result = await sendFriendRequest(userId);
      if (result.success) {
        setMessage("Friend request sent to nearby user!");
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage("Error sending friend request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-600" />
                <span>Friends & Requests Test</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Test friend request system and manage your connections
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.includes("Error") || message.includes("Failed")
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-green-100 text-green-700 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* User Search Component */}
        <div className="mb-6">
          <UserSearch onSendRequest={sendFriendRequest} />
        </div>

        {/* Send Friend Request Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Send Friend Request by ID</span>
          </h2>

          <form onSubmit={handleSendRequest} className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user ID to send friend request"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !targetUserId.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Send Request"}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-2">
            Tip: You can find user IDs by checking nearby users in the location
            test page
          </p>
        </div>

        {/* Nearby Users for Quick Friend Requests */}
        {nearbyUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Send Requests to Nearby Users</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyUsers.slice(0, 4).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">
                      {user.distance}m away
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendRequestToNearby(user.id)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Friends List */}
          <div>
            <FriendsList
              onStartChat={handleStartChat}
              onStartCall={handleStartCall}
            />
          </div>

          {/* Friend Requests */}
          <div>
            <FriendRequestsManager />
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">
            Debug Information
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Send friend requests using user IDs</p>
            <p>• Accept/reject incoming requests</p>
            <p>• Cancel sent requests</p>
            <p>• Remove friends from your friends list</p>
            <p>• View online status and last seen times</p>
          </div>
        </div>
      </div>
    </div>
  );
}
