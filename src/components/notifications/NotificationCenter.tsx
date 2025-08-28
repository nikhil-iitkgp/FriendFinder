"use client";

import { useState, useEffect } from "react";
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
  Bell,
  BellRing,
  UserPlus,
  UserCheck,
  UserX,
  MessageSquare,
  X,
  Check,
  Clock,
} from "lucide-react";

interface FriendRequestNotification {
  id: string;
  type: "friend_request" | "friend_response" | "message";
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  metadata?: {
    requestId?: string;
    action?: "accepted" | "rejected";
  };
}

interface NotificationCenterProps {
  onFriendRequestAction?: (
    requestId: string,
    action: "accept" | "reject"
  ) => Promise<void>;
}

export default function NotificationCenter({
  onFriendRequestAction,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<
    FriendRequestNotification[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Simulated notifications for demo - in real app this would come from Socket.IO
  useEffect(() => {
    // Demo notifications
    const demoNotifications: FriendRequestNotification[] = [
      {
        id: "1",
        type: "friend_request",
        fromUserId: "user1",
        fromUserName: "Alice Johnson",
        fromUserAvatar: "/api/placeholder/32/32",
        message: "Alice Johnson wants to be your friend!",
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isRead: false,
        metadata: { requestId: "req_1" },
      },
      {
        id: "2",
        type: "friend_response",
        fromUserId: "user2",
        fromUserName: "Bob Smith",
        fromUserAvatar: "/api/placeholder/32/32",
        message: "Bob Smith accepted your friend request!",
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        isRead: false,
        metadata: { action: "accepted" },
      },
      {
        id: "3",
        type: "message",
        fromUserId: "user3",
        fromUserName: "Carol Williams",
        fromUserAvatar: "/api/placeholder/32/32",
        message: "Hey! How are you doing?",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isRead: true,
      },
    ];

    setNotifications(demoNotifications);
    setUnreadCount(demoNotifications.filter((n) => !n.isRead).length);
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification && !notification.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleFriendRequestAction = async (
    notificationId: string,
    action: "accept" | "reject"
  ) => {
    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification?.metadata?.requestId) return;

    try {
      await onFriendRequestAction?.(notification.metadata.requestId, action);

      // Remove the notification after action
      removeNotification(notificationId);

      // Show success toast
      toast.success(
        action === "accept"
          ? `You are now friends with ${notification.fromUserName}!`
          : `Friend request from ${notification.fromUserName} declined.`
      );
    } catch (error) {
      toast.error(`Failed to ${action} friend request`);
      console.error("Friend request action error:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case "friend_response":
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "friend_request":
        return "border-l-blue-500";
      case "friend_response":
        return "border-l-green-500";
      case "message":
        return "border-l-purple-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {unreadCount > 0 && (
              <CardDescription>
                You have {unreadCount} unread notification
                {unreadCount !== 1 ? "s" : ""}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-l-4 hover:bg-muted/50 transition-colors ${getNotificationColor(
                      notification.type
                    )} ${
                      !notification.isRead
                        ? "bg-blue-50/50 dark:bg-blue-950/20"
                        : ""
                    }`}
                    onClick={() =>
                      !notification.isRead && markAsRead(notification.id)
                    }
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={notification.fromUserAvatar} />
                        <AvatarFallback>
                          {notification.fromUserName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getNotificationIcon(notification.type)}
                          <span className="font-medium text-sm">
                            {notification.fromUserName}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(
                              new Date(notification.timestamp),
                              { addSuffix: true }
                            )}
                          </span>

                          {notification.type === "friend_request" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFriendRequestAction(
                                    notification.id,
                                    "reject"
                                  );
                                }}
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFriendRequestAction(
                                    notification.id,
                                    "accept"
                                  );
                                }}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Accept
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
