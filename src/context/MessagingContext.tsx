"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import io from "socket.io-client";

type SocketType = ReturnType<typeof io>;

interface ChatMessage {
  _id: string;
  chatId: string;
  senderId: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  receiverId: string;
  content: string;
  type: "text" | "image" | "file" | "system";
  status: "sent" | "delivered" | "read";
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  deliveredAt?: Date;
}

interface Chat {
  chatId: string;
  friend: {
    id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
  lastMessage: {
    _id: string;
    content: string;
    type: string;
    senderId: string;
    isFromCurrentUser: boolean;
    createdAt: Date;
    status: string;
  };
  unreadCount: number;
  updatedAt: Date;
}

interface TypingUser {
  userId: string;
  username: string;
  chatId: string;
}

interface MessagingContextType {
  // Connection
  socket: SocketType | null;
  isConnected: boolean;

  // Chats
  chats: Chat[];
  chatsLoading: boolean;
  chatsError: string | null;

  // Current chat
  currentChatId: string | null;
  currentFriendId: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesError: string | null;

  // Typing indicators
  typingUsers: TypingUser[];
  isTyping: boolean;

  // Actions
  connectSocket: () => Promise<void>;
  disconnectSocket: () => void;
  openChat: (friendId: string) => Promise<void>;
  closeChat: () => void;
  sendMessage: (
    content: string,
    type?: "text" | "image" | "file"
  ) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (messageId?: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  refreshChats: () => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(
  undefined
);

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error("useMessaging must be used within a MessagingProvider");
  }
  return context;
}

interface MessagingProviderProps {
  children: ReactNode;
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const { data: session, status } = useSession();

  // Socket connection
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Chats
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);

  // Current chat
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentFriendId, setCurrentFriendId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Typing indicators
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to Socket.IO
  const connectSocket = async () => {
    if (!session?.user) return;

    try {
      // Initialize socket endpoint
      await fetch("/api/socket");

      const newSocket = io({
        path: "/api/socket",
        auth: {
          token: session.user.email, // Using email as token for now
        },
      });

      newSocket.on("connect", () => {
        console.log("Connected to messaging server");
        setIsConnected(true);
        newSocket.emit("user:join");
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from messaging server");
        setIsConnected(false);
      });

      newSocket.on("message:received", (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);

        // Update chat list
        refreshChats();
      });

      newSocket.on("message:delivered", (messageId: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, status: "delivered" as const }
              : msg
          )
        );
      });

      newSocket.on("message:read", (messageId: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, status: "read" as const } : msg
          )
        );
      });

      newSocket.on(
        "typing:start",
        (data: { chatId: string; userId: string; username: string }) => {
          if (data.chatId === currentChatId) {
            setTypingUsers((prev) => {
              const existing = prev.find(
                (u) => u.userId === data.userId && u.chatId === data.chatId
              );
              if (existing) return prev;
              return [...prev, data];
            });
          }
        }
      );

      newSocket.on(
        "typing:stop",
        (data: { chatId: string; userId: string }) => {
          setTypingUsers((prev) =>
            prev.filter(
              (u) => !(u.userId === data.userId && u.chatId === data.chatId)
            )
          );
        }
      );

      newSocket.on("error", (error: string) => {
        console.error("Socket error:", error);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error("Failed to connect to messaging server:", error);
    }
  };

  // Disconnect socket
  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  // Load chat list
  const refreshChats = async () => {
    if (!session?.user) return;

    setChatsLoading(true);
    setChatsError(null);

    try {
      const response = await fetch("/api/messages/chats");

      if (!response.ok) {
        throw new Error("Failed to load chats");
      }

      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      setChatsError("Failed to load chats");
    } finally {
      setChatsLoading(false);
    }
  };

  // Open a chat with a friend
  const openChat = async (friendId: string) => {
    if (!session?.user) return;

    setCurrentFriendId(friendId);
    setMessagesLoading(true);
    setMessagesError(null);

    // Create chat ID
    const sortedIds = [session.user.email!, friendId].sort();
    const chatId = `${sortedIds[0]}_${sortedIds[1]}`;
    setCurrentChatId(chatId);

    try {
      const response = await fetch(
        `/api/messages?friendId=${friendId}&limit=50`
      );

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const data = await response.json();
      setMessages(data.messages || []);

      // Mark messages as read
      if (data.messages.length > 0) {
        markAsRead();
      }
    } catch (error) {
      setMessagesError("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  };

  // Close current chat
  const closeChat = () => {
    setCurrentChatId(null);
    setCurrentFriendId(null);
    setMessages([]);
    setTypingUsers([]);
  };

  // Send a message
  const sendMessage = async (
    content: string,
    type: "text" | "image" | "file" = "text"
  ) => {
    if (!socket || !currentFriendId || !currentChatId || !content.trim())
      return;

    try {
      socket.emit("message:send", {
        chatId: currentChatId,
        receiverId: currentFriendId,
        content: content.trim(),
        type,
      });

      // Stop typing indicator
      stopTyping();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (!currentFriendId || messagesLoading || messages.length === 0) return;

    setMessagesLoading(true);

    try {
      const oldestMessage = messages[0];
      const response = await fetch(
        `/api/messages?friendId=${currentFriendId}&limit=50&before=${oldestMessage.createdAt}`
      );

      if (!response.ok) {
        throw new Error("Failed to load more messages");
      }

      const data = await response.json();
      if (data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Mark messages as read
  const markAsRead = (messageId?: string) => {
    if (!socket || !currentChatId) return;

    socket.emit("message:read", {
      chatId: currentChatId,
      messageId,
    });
  };

  // Start typing indicator
  const startTyping = () => {
    if (!socket || !currentChatId || !currentFriendId || isTyping) return;

    setIsTyping(true);
    socket.emit("typing:start", {
      chatId: currentChatId,
      receiverId: currentFriendId,
    });

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  // Stop typing indicator
  const stopTyping = () => {
    if (!socket || !currentChatId || !currentFriendId || !isTyping) return;

    setIsTyping(false);
    socket.emit("typing:stop", {
      chatId: currentChatId,
      receiverId: currentFriendId,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Auto-connect when authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user && !socket) {
      connectSocket();
      refreshChats();
    }
  }, [session, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const value: MessagingContextType = {
    socket,
    isConnected,
    chats,
    chatsLoading,
    chatsError,
    currentChatId,
    currentFriendId,
    messages,
    messagesLoading,
    messagesError,
    typingUsers,
    isTyping,
    connectSocket,
    disconnectSocket,
    openChat,
    closeChat,
    sendMessage,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    refreshChats,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}
