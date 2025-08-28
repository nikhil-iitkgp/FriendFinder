"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Loader2,
  Check,
} from "lucide-react";
import {
  sendFriendRequest,
  cancelFriendRequest,
  respondToFriendRequest,
} from "@/server/actions/friend-actions";
import { toast } from "sonner";

interface FriendRequestButtonProps {
  targetUserId: string;
  targetUserName: string;
  currentStatus?: "none" | "pending" | "friends" | "received_request";
  onStatusChange?: (newStatus: string) => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
}

export default function FriendRequestButton({
  targetUserId,
  targetUserName,
  currentStatus,
  onStatusChange,
  size = "sm",
  variant = "outline",
}: FriendRequestButtonProps) {
  const [status, setStatus] = useState<string>(currentStatus || "none");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(!currentStatus);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Fetch relationship status if not provided
  useEffect(() => {
    if (!currentStatus) {
      fetchRelationshipStatus();
    }
  }, [targetUserId, currentStatus]);

  const fetchRelationshipStatus = async () => {
    try {
      const response = await fetch(`/api/friends/relationship/${targetUserId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setRequestId(data.requestId || null);
      }
    } catch (error) {
      console.error("Error fetching relationship status:", error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  const handleSendFriendRequest = async () => {
    setIsLoading(true);
    try {
      const result = await sendFriendRequest(targetUserId);

      if (result.success) {
        handleStatusChange("pending");
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to send friend request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    setIsLoading(true);
    try {
      const result = await cancelFriendRequest(targetUserId);

      if (result.success) {
        handleStatusChange("none");
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to cancel friend request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!requestId) {
      toast.error("Request ID not found");
      return;
    }

    setIsLoading(true);
    try {
      const result = await respondToFriendRequest(requestId, "accept");

      if (result.success) {
        handleStatusChange("friends");
        toast.success(result.message || "Friend request accepted!");
      } else {
        toast.error(result.message || "Failed to accept friend request");
      }
    } catch (error) {
      toast.error("Failed to accept friend request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!requestId) {
      toast.error("Request ID not found");
      return;
    }

    setIsLoading(true);
    try {
      const result = await respondToFriendRequest(requestId, "reject");

      if (result.success) {
        handleStatusChange("none");
        toast.success(result.message || "Friend request rejected");
      } else {
        toast.error(result.message || "Failed to reject friend request");
      }
    } catch (error) {
      toast.error("Failed to reject friend request");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <Button size={size} variant="outline" disabled className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (status === "friends") {
    return (
      <Button size={size} variant="secondary" disabled className="gap-2">
        <UserCheck className="w-4 h-4" />
        Friends
      </Button>
    );
  }

  if (status === "pending") {
    return (
      <Button
        size={size}
        variant="outline"
        onClick={handleCancelFriendRequest}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        {isLoading ? "Cancelling..." : "Pending"}
      </Button>
    );
  }

  if (status === "received_request") {
    return (
      <div className="flex gap-1">
        <Button
          size={size}
          variant="default"
          onClick={handleAcceptFriendRequest}
          disabled={isLoading}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isLoading ? "Accepting..." : "Accept"}
        </Button>
        <Button
          size={size}
          variant="outline"
          onClick={handleRejectFriendRequest}
          disabled={isLoading}
          className="gap-2 text-red-600 border-red-600 hover:bg-red-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserX className="w-4 h-4" />
          )}
          {isLoading ? "Rejecting..." : "Reject"}
        </Button>
      </div>
    );
  }

  // Default: no relationship, show "Add Friend" button
  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleSendFriendRequest}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {isLoading ? "Sending..." : "Add Friend"}
    </Button>
  );
}
