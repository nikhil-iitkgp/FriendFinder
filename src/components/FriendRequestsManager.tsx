"use client";

import React, { useState } from "react";
import { Inbox, Send, RefreshCw } from "lucide-react";
import { useFriends } from "@/context/FriendsContext";
import FriendRequestCard from "./FriendRequestCard";

export default function FriendRequestsManager() {
  const {
    receivedRequests,
    sentRequests,
    requestsLoading,
    requestsError,
    refreshRequests,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const activeRequests =
    activeTab === "received" ? receivedRequests : sentRequests;

  if (requestsLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
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

  if (requestsError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{requestsError}</p>
          <button
            onClick={refreshRequests}
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
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Friend Requests
          </h2>
          <button
            onClick={refreshRequests}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex">
          <button
            onClick={() => setActiveTab("received")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "received"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Received ({receivedRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sent")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "sent"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Sent ({sentRequests.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeRequests.length === 0 ? (
          <div className="text-center py-8">
            {activeTab === "received" ? (
              <>
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending friend requests</p>
                <p className="text-sm text-gray-400 mt-1">
                  When someone sends you a friend request, it will appear here.
                </p>
              </>
            ) : (
              <>
                <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No sent requests</p>
                <p className="text-sm text-gray-400 mt-1">
                  Friend requests you send will appear here until they're
                  accepted or rejected.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeRequests.map((request) => (
              <FriendRequestCard
                key={request.id}
                request={request}
                type={activeTab}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
