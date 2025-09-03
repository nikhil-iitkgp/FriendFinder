"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useFriends } from "@/context/FriendsContext";
import { useAuth } from "@/context/AuthContext";
import { toastManager, ToastPriority } from "@/lib/toast-manager";
import { Bell, UserPlus, MessageCircle, Users, Wifi } from "lucide-react";

export default function RealTimeNotifications() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { receivedRequests, refreshRequests } = useFriends();
  const [lastRequestCount, setLastRequestCount] = useState(0);
  const [lastMessageCheck, setLastMessageCheck] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'reconnecting'>('online');

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      toastManager.success("You're back online", {
        icon: <Wifi className="h-4 w-4" />,
        duration: 2000,
        priority: ToastPriority.MEDIUM
      });
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      toastManager.warning("You're currently offline", {
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
        priority: ToastPriority.HIGH
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll for new friend requests every 30 seconds
  useEffect(() => {
    if (!session?.user || !user) return;

    const interval = setInterval(async () => {
      try {
        setConnectionStatus('online');
        await refreshRequests();
      } catch (error) {
        console.error("Error checking for new requests:", error);
        setConnectionStatus('reconnecting');
        
        toastManager.error("Failed to check for updates", {
          description: "We'll keep trying to reconnect",
          priority: ToastPriority.LOW,
          duration: 3000
        });
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
            const messagePreview = conv.latestMessage.content.length > 50 
              ? conv.latestMessage.content.substring(0, 50) + "..."
              : conv.latestMessage.content;

            toastManager.success(`New message from ${conv.participant.username}`, {
              description: messagePreview,
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/dashboard/messages?userId=${conv.participant.id}`;
                },
              },
              icon: <MessageCircle className="h-4 w-4" />,
              priority: ToastPriority.HIGH,
              duration: 6000
            });
          });

          setLastMessageCheck(new Date());
          setConnectionStatus('online');
        } else {
          throw new Error('Failed to fetch conversations');
        }
      } catch (error) {
        console.error("Error checking for new messages:", error);
        setConnectionStatus('reconnecting');
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
        toastManager.success(
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
            priority: ToastPriority.HIGH,
            duration: 6000
          }
        );
      } else {
        toastManager.success(`${newRequestsCount} new friend requests`, {
          description: "Tap to view and respond",
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/dashboard/friends?tab=requests";
            },
          },
          icon: <Users className="h-4 w-4" />,
          priority: ToastPriority.HIGH,
          duration: 6000
        });
      }
    }

    setLastRequestCount(receivedRequests.length);
  }, [receivedRequests, lastRequestCount]);

  // Show initial online status notification
  useEffect(() => {
    if (!user) return;

    const showOnlineStatus = () => {
      toastManager.info("You're now online", {
        description: "Friends can see your activity",
        icon: <Bell className="h-4 w-4" />,
        priority: ToastPriority.LOW,
        duration: 3000
      });
    };

    const timer = setTimeout(showOnlineStatus, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  // Show connection status changes
  useEffect(() => {
    if (connectionStatus === 'reconnecting') {
      const loadingToastId = toastManager.loading("Reconnecting...", {
        description: "Checking for updates",
        icon: <Wifi className="h-4 w-4" />,
        priority: ToastPriority.MEDIUM
      });

      // Auto-dismiss loading toast after 5 seconds
      setTimeout(() => {
        if (loadingToastId) {
          toastManager.dismiss(loadingToastId);
        }
      }, 5000);
    }
  }, [connectionStatus]);

  return null; // This component only handles notifications, no UI
}
