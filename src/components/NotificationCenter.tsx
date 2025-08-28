"use client";

import React, { useEffect, useState } from "react";
import { Bell, X, Check, UserPlus } from "lucide-react";
import { useFriends } from "@/context/FriendsContext";

interface Notification {
  id: string;
  type: "friend_request" | "friend_accepted" | "friend_rejected";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  data?: any;
}

export default function NotificationCenter() {
  const { receivedRequests, respondToRequest } = useFriends();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Generate notifications from friend requests
  useEffect(() => {
    const newNotifications: Notification[] = receivedRequests.map(
      (request) => ({
        id: request.id,
        type: "friend_request" as const,
        title: "New Friend Request",
        message: `${request.from?.username} sent you a friend request`,
        timestamp: new Date(request.createdAt),
        isRead: false,
        data: request,
      })
    );

    setNotifications(newNotifications);
  }, [receivedRequests]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await respondToRequest(requestId, "accept");
      // Remove from notifications
      setNotifications((prev) => prev.filter((n) => n.id !== requestId));
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await respondToRequest(requestId, "reject");
      // Remove from notifications
      setNotifications((prev) => prev.filter((n) => n.id !== requestId));
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.25rem]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close notifications"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <UserPlus className="w-6 h-6 text-blue-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>

                          {notification.type === "friend_request" && (
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={() =>
                                  handleAcceptRequest(notification.id)
                                }
                                className="flex items-center space-x-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                              >
                                <Check className="w-3 h-3" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectRequest(notification.id)
                                }
                                className="flex items-center space-x-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
