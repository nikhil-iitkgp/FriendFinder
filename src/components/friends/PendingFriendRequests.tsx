"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Users, Loader2, UserPlus } from "lucide-react";
import {
  getPendingFriendRequests,
  respondToFriendRequest,
} from "@/server/actions/friend-actions";
import { toast } from "sonner";

interface PendingRequest {
  id: string;
  from: string;
  fromName: string;
  fromAvatar?: string;
  createdAt: string;
  status: string;
}

interface PendingFriendRequestsProps {
  onRequestProcessed?: () => void;
}

export default function PendingFriendRequests({
  onRequestProcessed,
}: PendingFriendRequestsProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const result = await getPendingFriendRequests();
      if (result.success && result.data) {
        setRequests(result.data.requests || []);
      }
    } catch (error) {
      toast.error("Failed to load friend requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId));

    try {
      const result = await respondToFriendRequest(requestId, action);

      if (result.success) {
        // Remove the request from the list
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
        toast.success(result.message);
        onRequestProcessed?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(`Failed to ${action} friend request`);
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Friend Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Friend Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No pending friend requests</p>
            <p className="text-sm text-gray-400">
              When someone sends you a friend request, it will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Friend Requests ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => {
            const isProcessing = processingRequests.has(request.id);

            return (
              <div
                key={request.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50/50"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={request.fromAvatar}
                    alt={request.fromName}
                  />
                  <AvatarFallback>
                    {request.fromName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="font-medium text-sm">{request.fromName}</div>
                  <div className="text-xs text-gray-600">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleResponse(request.id, "accept")}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Accept
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResponse(request.id, "reject")}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
