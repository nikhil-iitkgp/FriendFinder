"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Users,
  Loader2,
} from "lucide-react";

interface PendingFriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  fromUserAvatar?: string;
  message?: string;
  createdAt: string;
  status: "pending";
}

interface RealTimeFriendRequestsProps {
  onAcceptRequest?: (requestId: string) => Promise<void>;
  onRejectRequest?: (requestId: string) => Promise<void>;
}

export default function RealTimeFriendRequests({
  onAcceptRequest,
  onRejectRequest,
}: RealTimeFriendRequestsProps) {
  const [pendingRequests, setPendingRequests] = useState<
    PendingFriendRequest[]
  >([]);
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: "accepting" | "rejecting" | null;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch pending friend requests
  const fetchPendingRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/friends/requests/pending");
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      } else {
        console.error("Failed to fetch pending requests");
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Real-time updates would be handled here with Socket.IO
  useEffect(() => {
    // TODO: Integrate with Socket.IO when the hook is working
    // const { onFriendRequestReceived } = useSocket()

    // onFriendRequestReceived((notification) => {
    //   const newRequest: PendingFriendRequest = {
    //     id: notification.requestId,
    //     fromUserId: notification.from,
    //     fromUserName: notification.fromName,
    //     fromUserEmail: '', // Would come from notification
    //     fromUserAvatar: notification.fromAvatar,
    //     message: notification.message,
    //     createdAt: notification.timestamp,
    //     status: 'pending'
    //   }
    //
    //   setPendingRequests(prev => [newRequest, ...prev])
    //
    //   // Show toast notification
    //   toast.success(`New friend request from ${notification.fromName}!`, {
    //     action: {
    //       label: 'View',
    //       onClick: () => {
    //         // Scroll to requests section or open modal
    //       }
    //     }
    //   })
    // })

    // For demo purposes, simulate receiving a new request after 5 seconds
    const timer = setTimeout(() => {
      const demoRequest: PendingFriendRequest = {
        id: `demo_${Date.now()}`,
        fromUserId: "demo_user",
        fromUserName: "Demo User",
        fromUserEmail: "demo@example.com",
        fromUserAvatar: "/api/placeholder/40/40",
        message: "Hey! I found you nearby, let's connect!",
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      setPendingRequests((prev) => [demoRequest, ...prev]);

      toast.success("New friend request from Demo User!", {
        icon: <UserPlus className="w-4 h-4" />,
        action: {
          label: "View",
          onClick: () => {
            // Could scroll to requests or open modal
          },
        },
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleAcceptRequest = async (request: PendingFriendRequest) => {
    setLoadingStates((prev) => ({ ...prev, [request.id]: "accepting" }));

    try {
      await onAcceptRequest?.(request.id);

      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));

      // Show success notification
      toast.success(`You are now friends with ${request.fromUserName}!`, {
        icon: <UserCheck className="w-4 h-4" />,
        description: "You can now send messages and make calls",
      });

      // TODO: Emit real-time notification to the requester
      // socket.emit('friend_response', {
      //   targetUserId: request.fromUserId,
      //   action: 'accepted',
      //   responderName: currentUser.name
      // })
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [request.id]: null }));
    }
  };

  const handleRejectRequest = async (request: PendingFriendRequest) => {
    setLoadingStates((prev) => ({ ...prev, [request.id]: "rejecting" }));

    try {
      await onRejectRequest?.(request.id);

      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));

      // Show notification
      toast.info(`Friend request from ${request.fromUserName} declined`, {
        icon: <UserX className="w-4 h-4" />,
      });

      // TODO: Emit real-time notification to the requester
      // socket.emit('friend_response', {
      //   targetUserId: request.fromUserId,
      //   action: 'rejected',
      //   responderName: currentUser.name
      // })
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Failed to reject friend request");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [request.id]: null }));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Friend Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Friend Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchPendingRequests}>
            Refresh
          </Button>
        </div>
        <CardDescription>
          {pendingRequests.length === 0
            ? "No pending friend requests"
            : `${pendingRequests.length} pending request${
                pendingRequests.length !== 1 ? "s" : ""
              }`}
        </CardDescription>
      </CardHeader>

      {pendingRequests.length > 0 && (
        <CardContent className="space-y-4">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={request.fromUserAvatar} />
                <AvatarFallback>
                  {request.fromUserName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{request.fromUserName}</h4>
                  <Badge variant="outline" className="text-xs">
                    New
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {request.message || "Wants to be your friend"}
                </p>

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(request.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRejectRequest(request)}
                  disabled={!!loadingStates[request.id]}
                >
                  {loadingStates[request.id] === "rejecting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )}
                  <span className="ml-1">Decline</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleAcceptRequest(request)}
                  disabled={!!loadingStates[request.id]}
                >
                  {loadingStates[request.id] === "accepting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span className="ml-1">Accept</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
