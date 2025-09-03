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
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

// Types
export interface ChatPreferences {
  chatType: "text" | "voice" | "video";
  language?: string;
  interests?: string[];
  ageRange?: {
    min: number;
    max: number;
  };
}

export interface RandomChatMessage {
  messageId: string;
  sessionId: string;
  anonymousId: string;
  content: string;
  timestamp: Date;
  type: "text" | "image" | "system";
  isOwn: boolean;
}

export interface RandomChatSession {
  sessionId: string;
  partner: {
    anonymousId: string;
    username: string;
    isActive: boolean;
  };
  userAnonymousId: string;
  status: "waiting" | "active" | "ended" | "reported";
  chatType: "text" | "voice" | "video";
  startTime: Date;
  messagesCount: number;
  messages: RandomChatMessage[];
}

export interface QueueStatus {
  inQueue: boolean;
  queueId?: string;
  anonymousId?: string;
  position: number;
  estimatedWaitTime: number;
  chatType?: "text" | "voice" | "video";
  joinedAt?: Date;
}

export interface RandomChatContextType {
  // Queue state
  queueStatus: QueueStatus;
  isJoiningQueue: boolean;
  isLeavingQueue: boolean;

  // Session state
  activeSession: RandomChatSession | null;
  messages: RandomChatMessage[];
  isTyping: boolean;
  partnerTyping: boolean;
  isLoadingSession: boolean;

  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  joinQueue: (
    preferences: ChatPreferences
  ) => Promise<{ success: boolean; error?: string }>;
  leaveQueue: () => Promise<{ success: boolean; error?: string }>;
  sendMessage: (
    content: string
  ) => Promise<{ success: boolean; error?: string }>;
  startTyping: () => void;
  stopTyping: () => void;
  endSession: () => Promise<{ success: boolean; error?: string }>;
  reportUser: (
    reason: string,
    description?: string,
    messageIds?: string[]
  ) => Promise<{ success: boolean; error?: string }>;

  // Session management
  refreshSession: () => Promise<void>;
  joinActiveSession: (sessionId: string) => void;
}

const RandomChatContext = createContext<RandomChatContextType | undefined>(
  undefined
);

export function RandomChatProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const {
    socket,
    isConnected,
    connectionError: socketConnectionError,
  } = useSocket();

  // State
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    inQueue: false,
    position: 0,
    estimatedWaitTime: 0,
  });
  const [activeSession, setActiveSession] = useState<RandomChatSession | null>(
    null
  );
  const [messages, setMessages] = useState<RandomChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);
  const [isLeavingQueue, setIsLeavingQueue] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(
    socketConnectionError
  );

  // Refs for timers
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update connection error when socket connection changes
  useEffect(() => {
    setConnectionError(socketConnectionError);
  }, [socketConnectionError]);

  // If socket is not available, use polling for updates
  useEffect(() => {
    if (!isConnected && (queueStatus.inQueue || activeSession)) {
      // Start polling for updates when socket is not available
      pollingIntervalRef.current = setInterval(() => {
        if (queueStatus.inQueue) {
          checkQueueStatus();
        }
        if (activeSession) {
          checkSessionMessages();
        }
      }, 3000); // Poll every 3 seconds

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isConnected, queueStatus.inQueue, activeSession]);

  // Function to check queue status via HTTP
  const checkQueueStatus = async () => {
    try {
      const response = await fetch("/api/random-chat/queue");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.inQueue) {
          setQueueStatus(data.data);
        } else if (data.success && data.data.hasMatch) {
          // Found a match!
          const newSession: RandomChatSession = {
            sessionId: data.data.sessionId,
            partner: data.data.partner,
            userAnonymousId: data.data.anonymousId,
            status: "active",
            chatType: data.data.chatType,
            startTime: new Date(),
            messagesCount: 0,
            messages: [],
          };

          setActiveSession(newSession);
          setMessages([]);
          setQueueStatus({
            inQueue: false,
            position: 0,
            estimatedWaitTime: 0,
          });

          toast.success(
            `Match found! You're now chatting with ${data.data.partner.anonymousId}`
          );
        }
      }
    } catch (error) {
      console.error("Error checking queue status:", error);
    }
  };

  // Function to check for new messages via HTTP
  const checkSessionMessages = async () => {
    if (!activeSession) return;

    try {
      const response = await fetch(
        `/api/random-chat/session?sessionId=${activeSession.sessionId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.messages) {
          const newMessages = data.data.messages.filter(
            (msg: any) =>
              !messages.find((existing) => existing.messageId === msg.messageId)
          );

          if (newMessages.length > 0) {
            setMessages((prev) => [...prev, ...newMessages]);
          }
        }
      }
    } catch (error) {
      console.error("Error checking session messages:", error);
    }
  };

  // Load initial state on mount
  useEffect(() => {
    if (session?.user) {
      loadInitialState();
      // Load persisted session and messages
      loadPersistedState();
    }
  }, [session]);

  // Also load persisted state when socket connects
  useEffect(() => {
    if (socket && isConnected && session?.user && !activeSession) {
      loadPersistedState();
    }
  }, [socket, isConnected, session]);

  // Load persisted state when component mounts or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session?.user) {
        console.log('Tab became visible, loading persisted state');
        loadPersistedState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session]);

  // Function to load persisted state from localStorage
  const loadPersistedState = () => {
    try {
      const savedSession = localStorage.getItem('randomChatSession');
      
      console.log('Loading persisted state - savedSession:', savedSession);
      
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        // Only restore if session is recent (within last hour)
        const sessionAge = Date.now() - new Date(parsedSession.startTime).getTime();
        if (sessionAge < 3600000) { // 1 hour
          console.log('Restoring session:', parsedSession);
          
          // Don't overwrite existing active session unless it's different
          if (!activeSession || activeSession.sessionId !== parsedSession.sessionId) {
            setActiveSession(parsedSession);
          }
          
          // Load messages for this specific session
          const sessionStorageKey = `randomChatMessages_${parsedSession.sessionId}`;
          const savedSessionMessages = localStorage.getItem(sessionStorageKey);
          
          console.log('Loading messages with key:', sessionStorageKey, 'found:', !!savedSessionMessages);
          
          if (savedSessionMessages) {
            const parsedMessages = JSON.parse(savedSessionMessages);
            console.log('Parsed messages:', parsedMessages);
            
            // Always restore messages from localStorage
            setMessages(parsedMessages);
          }
          
          // Rejoin the session room if socket is connected
          if (socket && isConnected) {
            socket.emit("random-chat:join-session", parsedSession.sessionId);
          }
        } else {
          // Clear old session and its messages
          localStorage.removeItem('randomChatSession');
          // Clear all session-specific message storage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('randomChatMessages_')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
      localStorage.removeItem('randomChatSession');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('randomChatMessages_')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMatchFound = (data: any) => {
      console.log("Random chat match found:", data);

      // Clear queue status
      setQueueStatus({
        inQueue: false,
        position: 0,
        estimatedWaitTime: 0,
      });

      // Set active session
      const newSession: RandomChatSession = {
        sessionId: data.sessionId,
        partner: data.partner,
        userAnonymousId: data.userAnonymousId || `User${Math.random().toString(36).substr(2, 4)}`,
        status: "active",
        chatType: data.chatType,
        startTime: new Date(data.startTime),
        messagesCount: data.messagesCount || 0,
        messages: [],
      };

      setActiveSession(newSession);
      setMessages([]);

      // Store session in localStorage for persistence
      localStorage.setItem('randomChatSession', JSON.stringify(newSession));

      // Join session room
      socket.emit("random-chat:join-session", data.sessionId);

      toast.success(
        `Match found! You're now chatting with ${data.partner.anonymousId}`
      );
    };

    const handleMessageReceived = (message: any) => {
      console.log("Random chat message received:", message);

      const newMessage: RandomChatMessage = {
        messageId: message.messageId,
        sessionId: message.sessionId,
        anonymousId: message.anonymousId,
        content: message.content,
        timestamp: new Date(message.timestamp),
        type: message.type,
        isOwn: message.isOwn,
      };

      setMessages((prev) => {
        // Check for duplicate messages
        const isDuplicate = prev.some(msg => msg.messageId === newMessage.messageId);
        if (isDuplicate) {
          return prev;
        }
        
        const updatedMessages = [...prev, newMessage];
        // Store messages in localStorage for persistence with session ID key
        const storageKey = `randomChatMessages_${newMessage.sessionId}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
        console.log('Stored messages to localStorage:', storageKey, updatedMessages);
        return updatedMessages;
      });

      // Update session message count
      setActiveSession((prev) => {
        if (prev) {
          const updatedSession = {
            ...prev,
            messagesCount: prev.messagesCount + 1,
          };
          // Update session in localStorage
          localStorage.setItem('randomChatSession', JSON.stringify(updatedSession));
          return updatedSession;
        }
        return null;
      });
    };

    const handlePartnerTyping = () => {
      setPartnerTyping(true);

      // Clear existing timeout
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }

      // Set timeout to hide typing indicator
      partnerTypingTimeoutRef.current = setTimeout(() => {
        setPartnerTyping(false);
      }, 3000);
    };

    const handlePartnerStoppedTyping = () => {
      setPartnerTyping(false);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
    };

    const handlePartnerLeft = () => {
      toast.info("Your chat partner has left the conversation");
      setPartnerTyping(false);
    };

    const handleSessionEnded = (data: any) => {
      console.log("Random chat session ended:", data);
      const reason = data?.reason || data || "unknown";

      // Store current session before clearing
      const currentSession = activeSession;

      // Clear session
      setActiveSession(null);
      setMessages([]);
      setPartnerTyping(false);
      setIsTyping(false);

      // Clear localStorage for this session
      localStorage.removeItem('randomChatSession');
      if (currentSession) {
        const storageKey = `randomChatMessages_${currentSession.sessionId}`;
        localStorage.removeItem(storageKey);
      }
      localStorage.removeItem('randomChatMessages');

      // Show appropriate message
      const reasons: Record<string, string> = {
        user_left: "You left the conversation",
        partner_left: "Your partner left the conversation",
        reported: "The conversation was ended due to a report",
        timeout: "The conversation timed out due to inactivity",
        system_ended: "The conversation was ended by the system",
      };

      toast.info(reasons[reason] || "The conversation has ended");
    };

    const handleQueuePosition = (data: {
      position: number;
      estimatedWait: number;
    }) => {
      setQueueStatus((prev) => ({
        ...prev,
        position: data.position,
        estimatedWaitTime: data.estimatedWait,
      }));
    };

    const handleError = (message: string) => {
      console.error("Random chat error:", message);
      setConnectionError(message);
      toast.error(message);
    };

    // Register event listeners
    socket.on("random-chat:match-found", handleMatchFound);
    socket.on("random-chat:message-received", handleMessageReceived);
    socket.on("random-chat:partner-typing", handlePartnerTyping);
    socket.on("random-chat:partner-stopped-typing", handlePartnerStoppedTyping);
    socket.on("random-chat:partner-left", handlePartnerLeft);
    socket.on("random-chat:session-ended", handleSessionEnded);
    socket.on("random-chat:queue-position", handleQueuePosition);
    socket.on("error", handleError);

    return () => {
      // Cleanup event listeners
      socket.off("random-chat:match-found", handleMatchFound);
      socket.off("random-chat:message-received", handleMessageReceived);
      socket.off("random-chat:partner-typing", handlePartnerTyping);
      socket.off(
        "random-chat:partner-stopped-typing",
        handlePartnerStoppedTyping
      );
      socket.off("random-chat:partner-left", handlePartnerLeft);
      socket.off("random-chat:session-ended", handleSessionEnded);
      socket.off("random-chat:queue-position", handleQueuePosition);
      socket.off("error", handleError);
    };
  }, [socket, isConnected]);

  // Load initial state (queue status and active session)
  const loadInitialState = async () => {
    try {
      setIsLoadingSession(true);

      // Check queue status
      const queueResponse = await fetch("/api/random-chat/queue");
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        if (queueData.success && queueData.data.inQueue) {
          setQueueStatus(queueData.data);
        }
      }

      // Check active session
      const sessionResponse = await fetch("/api/random-chat/session");
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.success && sessionData.data.hasActiveSession) {
          const data = sessionData.data;
          setActiveSession({
            sessionId: data.sessionId,
            partner: data.partner,
            userAnonymousId: data.userAnonymousId,
            status: data.status,
            chatType: data.chatType,
            startTime: new Date(data.startTime),
            messagesCount: data.messagesCount,
            messages: data.messages || [],
          });
          setMessages(data.messages || []);

          // Join session room
          if (socket) {
            socket.emit("random-chat:join-session", data.sessionId);
          }
        }
      }
    } catch (error) {
      console.error("Error loading initial state:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Join queue
  const joinQueue = async (
    preferences: ChatPreferences
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsJoiningQueue(true);
      setConnectionError(null);

      const response = await fetch("/api/random-chat/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatType: preferences.chatType,
          preferences,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.type === "match_found") {
          // Immediate match
          const newSession: RandomChatSession = {
            sessionId: data.data.sessionId,
            partner: data.data.partner,
            userAnonymousId: data.data.anonymousId,
            status: "active",
            chatType: data.data.chatType,
            startTime: new Date(),
            messagesCount: 0,
            messages: [],
          };

          setActiveSession(newSession);
          setMessages([]);

          if (socket) {
            socket.emit("random-chat:join-session", data.data.sessionId);
          }

          toast.success(
            `Match found! You're now chatting with ${data.data.partner.anonymousId}`
          );
        } else {
          // Added to queue
          setQueueStatus({
            inQueue: true,
            queueId: data.data.queueId,
            anonymousId: data.data.anonymousId,
            position: data.data.position,
            estimatedWaitTime: data.data.estimatedWaitTime,
            chatType: preferences.chatType,
            joinedAt: new Date(),
          });

          toast.info(`Added to queue. Position: ${data.data.position}`);
        }

        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error joining queue:", error);
      return { success: false, error: "Failed to join queue" };
    } finally {
      setIsJoiningQueue(false);
    }
  };

  // Leave queue
  const leaveQueue = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      setIsLeavingQueue(true);

      const response = await fetch("/api/random-chat/queue", {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setQueueStatus({
          inQueue: false,
          position: 0,
          estimatedWaitTime: 0,
        });

        toast.success("Left the queue");
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error leaving queue:", error);
      return { success: false, error: "Failed to leave queue" };
    } finally {
      setIsLeavingQueue(false);
    }
  };

  // Send message
  const sendMessage = async (
    content: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession) {
      return { success: false, error: "No active session" };
    }

    if (!content.trim()) {
      return { success: false, error: "Message cannot be empty" };
    }

    try {
      // Try socket first, fallback to HTTP
      if (socket && isConnected) {
        socket.emit("random-chat:message-send", {
          sessionId: activeSession.sessionId,
          content: content.trim(),
          type: "text",
        });

        // Add message to local state immediately for better UX
        const newMessage: RandomChatMessage = {
          messageId: `temp-${Date.now()}`,
          sessionId: activeSession.sessionId,
          anonymousId: activeSession.userAnonymousId,
          content: content.trim(),
          timestamp: new Date(),
          type: "text",
          isOwn: true,
        };

        setMessages((prev) => {
          // Check for duplicate messages
          const isDuplicate = prev.some(msg => msg.messageId === newMessage.messageId);
          if (isDuplicate) {
            return prev;
          }
          
          const updatedMessages = [...prev, newMessage];
          // Store messages in localStorage for persistence with session ID key
          const storageKey = `randomChatMessages_${activeSession.sessionId}`;
          localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
          console.log('Stored sent message to localStorage:', storageKey, updatedMessages);
          return updatedMessages;
        });
      } else {
        // Fallback to HTTP API
        const response = await fetch("/api/random-chat/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "send-message",
            sessionId: activeSession.sessionId,
            content: content.trim(),
            type: "text",
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Add message to local state
          const newMessage: RandomChatMessage = {
            messageId: data.data.messageId,
            sessionId: activeSession.sessionId,
            anonymousId: activeSession.userAnonymousId,
            content: content.trim(),
            timestamp: new Date(data.data.timestamp),
            type: "text",
            isOwn: true,
          };

          setMessages((prev) => {
            // Check for duplicate messages
            const isDuplicate = prev.some(msg => msg.messageId === newMessage.messageId);
            if (isDuplicate) {
              return prev;
            }
            
            const updatedMessages = [...prev, newMessage];
            // Store messages in localStorage for persistence with session ID key
            const storageKey = `randomChatMessages_${activeSession.sessionId}`;
            localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
            console.log('Stored API sent message to localStorage:', storageKey, updatedMessages);
            return updatedMessages;
          });
        } else {
          return { success: false, error: data.error };
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error sending message:", error);
      return { success: false, error: "Failed to send message" };
    }
  };

  // Start typing
  const startTyping = () => {
    if (!activeSession || !socket || isTyping) return;

    setIsTyping(true);
    socket.emit("random-chat:typing-start", activeSession.sessionId);

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  // Stop typing
  const stopTyping = () => {
    if (!activeSession || !socket || !isTyping) return;

    setIsTyping(false);
    socket.emit("random-chat:typing-stop", activeSession.sessionId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // End session
  const endSession = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!activeSession) {
      return { success: false, error: "No active session" };
    }

    try {
      // End via socket first if available
      if (socket && isConnected) {
        socket.emit("random-chat:end-session", activeSession.sessionId);
      }

      // Clear local state immediately for better UX
      const sessionToEnd = activeSession;
      setActiveSession(null);
      setMessages([]);
      setPartnerTyping(false);
      setIsTyping(false);

      // Clear localStorage for this session
      localStorage.removeItem('randomChatSession');
      const storageKey = `randomChatMessages_${sessionToEnd.sessionId}`;
      localStorage.removeItem(storageKey);

      // Try API as fallback
      try {
        const response = await fetch("/api/random-chat/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "end",
            sessionId: sessionToEnd.sessionId,
            reason: "user_left",
          }),
        });

        const data = await response.json();
        if (!data.success) {
          console.warn("API end session failed:", data.error);
        }
      } catch (apiError) {
        console.warn("API end session request failed:", apiError);
      }

      toast.success("Session ended");
      return { success: true };
    } catch (error) {
      console.error("Error ending session:", error);
      return { success: false, error: "Failed to end session" };
    }
  };

  // Report user
  const reportUser = async (
    reason: string,
    description?: string,
    messageIds?: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession) {
      return { success: false, error: "No active session" };
    }

    try {
      const response = await fetch("/api/random-chat/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          reason,
          description,
          messageIds,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear session as it will be ended
        setActiveSession(null);
        setMessages([]);
        setPartnerTyping(false);
        setIsTyping(false);

        toast.success("Report submitted successfully");
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error reporting user:", error);
      return { success: false, error: "Failed to submit report" };
    }
  };

  // Refresh session
  const refreshSession = async () => {
    await loadInitialState();
  };

  // Join active session (for reconnection)
  const joinActiveSession = (sessionId: string) => {
    if (socket) {
      socket.emit("random-chat:join-session", sessionId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: RandomChatContextType = {
    // Queue state
    queueStatus,
    isJoiningQueue,
    isLeavingQueue,

    // Session state
    activeSession,
    messages,
    isTyping,
    partnerTyping,
    isLoadingSession,

    // Connection state
    isConnected,
    connectionError,

    // Actions
    joinQueue,
    leaveQueue,
    sendMessage,
    startTyping,
    stopTyping,
    endSession,
    reportUser,
    refreshSession,
    joinActiveSession,
  };

  return (
    <RandomChatContext.Provider value={contextValue}>
      {children}
    </RandomChatContext.Provider>
  );
}

export function useRandomChat(): RandomChatContextType {
  const context = useContext(RandomChatContext);
  if (context === undefined) {
    throw new Error("useRandomChat must be used within a RandomChatProvider");
  }
  return context;
}
