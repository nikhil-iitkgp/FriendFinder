"use client";

import React from "react";
import { User, Clock, Check, X, UserMinus } from "lucide-react";
import { useFriends } from "@/context/FriendsContext";
import { toast } from "sonner";

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

interface FriendRequestCardProps {
  request: FriendRequest;
  type: "received" | "sent";
}

export default function FriendRequestCard({
  request,
  type,
}: FriendRequestCardProps) {
  const { respondToRequest, cancelRequest } = useFriends();
  const [isLoading, setIsLoading] = React.useState(false);

  const user = type === "received" ? request.from : request.to;
  if (!user) return null;

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      console.log("Accepting friend request:", request.id);
      const result = await respondToRequest(request.id, "accept");
      if (!result.success) {
        console.error("Failed to accept request:", result.error);
        toast.error(
          `Failed to accept request: ${result.error || "Unknown error"}`
        );
      } else {
        toast.success("Friend request accepted!");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error(
        `Error accepting request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      console.log("Rejecting friend request:", request.id);
      const result = await respondToRequest(request.id, "reject");
      if (!result.success) {
        console.error("Failed to reject request:", result.error);
        toast.error(
          `Failed to reject request: ${result.error || "Unknown error"}`
        );
      } else {
        toast.success("Friend request rejected");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error(
        `Error rejecting request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const result = await cancelRequest(request.id);
      if (!result.success) {
        console.error("Failed to cancel request:", result.error);
      }
    } catch (error) {
      console.error("Error canceling request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours =
      (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Profile Picture */}
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-gray-400" />
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{user.username}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(request.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {type === "received" ? (
            // Buttons for received requests
            <>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>Accept</span>
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </>
          ) : (
            // Button for sent requests
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <UserMinus className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Request Type Label */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            type === "received"
              ? "bg-blue-100 text-blue-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {type === "received" ? "Incoming Request" : "Sent Request"}
        </span>
      </div>
    </div>
  );
}
