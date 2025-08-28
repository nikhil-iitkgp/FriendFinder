"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { MessagingProvider } from "@/context/MessagingContext";
import ChatInterface from "@/components/ChatInterface";

export default function MessagingTestPage() {
  const { data: session, status } = useSession();
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch friends for testing
  useEffect(() => {
    const fetchFriends = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch("/api/friends");
        if (response.ok) {
          const data = await response.json();
          setFriends(data.friends || []);
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchFriends();
    }
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to test messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <MessagingProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">Real-time Messaging Test</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Friends List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-4">Friends</h2>

                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    No friends yet. Add some friends to start messaging!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <button
                        key={friend._id}
                        onClick={() => setSelectedFriend(friend._id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedFriend === friend._id
                            ? "bg-blue-100 border-blue-300 border"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="font-medium">{friend.name}</div>
                        <div className="text-sm text-gray-600">
                          {friend.email}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              {selectedFriend ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">
                      Chat with{" "}
                      {friends.find((f) => f._id === selectedFriend)?.name}
                    </h3>
                  </div>
                  <ChatInterface
                    friendId={selectedFriend}
                    friendName={
                      friends.find((f) => f._id === selectedFriend)?.name ||
                      "Friend"
                    }
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow flex items-center justify-center h-96">
                  <div className="text-center text-gray-500">
                    <p>Select a friend to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">Socket.IO Connection Status</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">
                Real-time messaging enabled
              </span>
            </div>
          </div>

          {/* Testing Instructions */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Testing Instructions</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Select a friend from the list to open a chat</li>
              <li>• Send messages to test real-time delivery</li>
              <li>
                • Open another browser tab/window to test bidirectional
                messaging
              </li>
              <li>
                • Watch for typing indicators when the other user is typing
              </li>
              <li>• Check message delivery status (sent, delivered, read)</li>
            </ul>
          </div>
        </div>
      </div>
    </MessagingProvider>
  );
}
