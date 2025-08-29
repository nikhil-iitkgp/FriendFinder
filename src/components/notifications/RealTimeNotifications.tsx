"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useFriends } from "@/context/FriendsContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Bell, UserPlus, MessageCircle } from "lucide-react";

export default function RealTimeNotifications() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { receivedRequests, refreshRequests } = useFriends();
  const [lastRequestCount, setLastRequestCount] = useState(0);
  const [lastMessageCheck, setLastMessageCheck] = useState(new Date());

  // Poll for new friend requests every 30 seconds
  useEffect(() => {
    if (!session?.user || !user) return;

    const interval = setInterval(async () => {
      try {
        await refreshRequests();
      } catch (error) {
        console.error("Error checking for new requests:", error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session, user, refreshRequests]);

  // Check for new messages every 30 seconds
  useEffect(() => {
    if (!session?.user || !user) return;

    const checkMessages = async () => {
      try {
        const response = await fetch("/api/conversations");
        if (response.ok) {
          const data = await response.json();
          const conversations = data.conversations || [];

          // Check for new messages since last check
          const newMessages = conversations.filter((conv: any) => {
            return (
              conv.latestMessage &&
              new Date(conv.latestMessage.createdAt) > lastMessageCheck &&
              conv.latestMessage.senderId !== user.id
            );
          });

          // Show notifications for new messages
          newMessages.forEach((conv: any) => {
            toast.success(`New message from ${conv.participant.username}`, {
              description:
                conv.latestMessage.content.substring(0, 50) +
                (conv.latestMessage.content.length > 50 ? "..." : ""),
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/dashboard/messages?userId=${conv.participant.id}`;
                },
              },
              icon: <MessageCircle className="h-4 w-4" />,
            });
          });

          setLastMessageCheck(new Date());
        }
      } catch (error) {
        console.error("Error checking for new messages:", error);
      }
    };

    const interval = setInterval(checkMessages, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [session, user, lastMessageCheck]);

  // Show notification when new friend requests arrive
  useEffect(() => {
    if (receivedRequests.length > lastRequestCount && lastRequestCount > 0) {
      const newRequestsCount = receivedRequests.length - lastRequestCount;

      if (newRequestsCount === 1) {
        const latestRequest = receivedRequests[receivedRequests.length - 1];
        toast.success(
          `New friend request from ${latestRequest.from?.username}`,
          {
            description: "Tap to view and respond",
            action: {
              label: "View",
              onClick: () => {
                window.location.href = "/dashboard/friends?tab=requests";
              },
            },
            icon: <UserPlus className="h-4 w-4" />,
          }
        );
      } else {
        toast.success(`${newRequestsCount} new friend requests`, {
          description: "Tap to view and respond",
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/dashboard/friends?tab=requests";
            },
          },
          icon: <UserPlus className="h-4 w-4" />,
        });
      }
    }

    setLastRequestCount(receivedRequests.length);
  }, [receivedRequests, lastRequestCount]);

  // Show online/offline status notifications
  useEffect(() => {
    if (!user) return;

    // Simulate going online
    const showOnlineStatus = () => {
      toast.success("You're now online", {
        description: "Friends can see your activity",
        icon: <Bell className="h-4 w-4" />,
      });
    };

    const timer = setTimeout(showOnlineStatus, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  return null; // This component only handles notifications, no UI
}
