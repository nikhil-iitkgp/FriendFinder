"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, Users, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMessaging } from "@/context/MessagingContext";
import { useFriends } from "@/context/FriendsContext";
import ChatInterface from "@/components/ChatInterface";

export default function MessagingTestPage() {
  const router = useRouter();
  const {
    chats,
    isConnected,
    openChat,
    closeChat,
    currentFriendId,
    refreshChats,
  } = useMessaging();
  const { friends } = useFriends();

  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Auto-refresh chats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshChats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleOpenChat = async (friendId: string) => {
    setSelectedFriendId(friendId);
    await openChat(friendId);
  };

  const handleCloseChat = () => {
    setSelectedFriendId(null);
    closeChat();
  };

  const selectedFriend = friends.find((f) => f.id === selectedFriendId);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <MessageCircle className="w-8 h-8 text-blue-600" />
                <span>Messaging Test</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Test real-time messaging with Socket.IO
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 ${
                  isConnected ? "text-green-600" : "text-red-600"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Friends List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Friends</span>
              </h2>
            </div>

            <div className="p-4">
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No friends yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add friends to start chatting!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleOpenChat(friend.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedFriendId === friend.id
                          ? "bg-blue-50 border-blue-200"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {friend.profilePicture ? (
                              <img
                                src={friend.profilePicture}
                                alt={friend.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-500 font-medium">
                                {friend.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {friend.username}
                          </p>
                          <p className="text-sm text-gray-500">
                            {friend.isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedFriendId && selectedFriend ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96">
                <ChatInterface
                  friendId={selectedFriendId}
                  friendName={selectedFriend.username}
                  friendAvatar={selectedFriend.profilePicture}
                  onClose={handleCloseChat}
                  onStartCall={() =>
                    setMessage(
                      `Voice call with ${selectedFriend.username} - Feature available in call test!`
                    )
                  }
                  onStartVideoCall={() =>
                    setMessage(
                      `Video call with ${selectedFriend.username} - Feature available in call test!`
                    )
                  }
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a friend to start chatting
                  </h3>
                  <p className="text-gray-500">
                    Choose a friend from the list to begin a conversation
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Chats */}
        {chats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Chats
              </h2>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                {chats.slice(0, 5).map((chat) => (
                  <button
                    key={chat.chatId}
                    onClick={() => handleOpenChat(chat.friend.id)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {chat.friend.profilePicture ? (
                            <img
                              src={chat.friend.profilePicture}
                              alt={chat.friend.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-500 font-medium">
                              {chat.friend.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {chat.friend.username}
                          </p>
                          <p className="text-sm text-gray-500 truncate max-w-48">
                            {chat.lastMessage.isFromCurrentUser ? "You: " : ""}
                            {chat.lastMessage.content}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {new Date(
                            chat.lastMessage.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full mt-1">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Debug Information */}
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">
            Debug Information
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Real-time messaging with Socket.IO</p>
            <p>• Message delivery and read receipts</p>
            <p>• Typing indicators</p>
            <p>• Online/offline status</p>
            <p>• Chat history and pagination</p>
            <p>
              • Connection status: {isConnected ? "Connected" : "Disconnected"}
            </p>
            <p>• Active chats: {chats.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
