"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Reply,
  Copy,
  Forward,
  Trash2,
  Mic,
  Search,
  FileText,
} from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";

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
  type: "text" | "image" | "file" | "system" | "voice";
  status: "sent" | "delivered" | "read";
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  deliveredAt?: Date;
  replyTo?: {
    _id: string;
    content: string;
    senderName: string;
  };
  reactions?: {
    [userId: string]: string;
  };
  isEdited?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

interface ChatInterfaceProps {
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  onClose?: () => void;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
  onSendMessage?: (message: string) => void;
}

export default function ChatInterface({
  friendId,
  friendName,
  friendAvatar,
  onClose,
  onStartCall,
  onStartVideoCall,
  onSendMessage,
}: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages when friendId changes
  useEffect(() => {
    if (friendId) {
      loadMessages();
      checkOnlineStatus();
    }
  }, [friendId]);

  // Check friend's online status
  const checkOnlineStatus = async () => {
    try {
      const response = await fetch(`/api/users/${friendId}/status`);
      if (response.ok) {
        const data = await response.json();
        setIsOnline(data.isOnline);
        setLastSeen(data.lastSeen ? new Date(data.lastSeen) : null);
      }
    } catch (error) {
      console.error("Failed to check online status:", error);
      // Default to offline if API fails
      setIsOnline(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    inputRef.current?.focus();
  }, [friendId]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const loadMessages = async () => {
    if (!friendId) return;

    setMessagesLoading(true);
    try {
      const response = await fetch(
        `/api/messages?friendId=${friendId}&limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error("Failed to load messages");
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessageToAPI = async (
    content: string,
    type: string = "text",
    replyToId?: string
  ) => {
    if (!friendId) return;

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        friendId,
        content,
        type,
        replyToId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
    } else {
      throw new Error("Failed to send message");
    }
  };

  const addReaction = async (messageId: string, reaction: string) => {
    try {
      const response = await fetch("/api/messages/react", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          reaction,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, reactions: data.reactions } : msg
          )
        );
      }
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const handleVoiceCall = () => {
    // Create a simple call notification
    const callMessage: ChatMessage = {
      _id: Date.now().toString(),
      chatId: `${friendId}-chat`,
      senderId: {
        _id: session?.user?.email || "current-user",
        username: session?.user?.name || "You",
        profilePicture: session?.user?.image,
      },
      receiverId: friendId,
      content: `📞 Voice call started`,
      type: "system",
      status: "sent",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setMessages((prev) => [...prev, callMessage]);

    // Show call interface (simplified for now)
    alert(
      `Voice call with ${friendName} - This would open a call interface in a real implementation`
    );

    if (onStartCall) {
      onStartCall();
    }
  };

  const handleVideoCall = () => {
    // Create a simple call notification
    const callMessage: ChatMessage = {
      _id: Date.now().toString(),
      chatId: `${friendId}-chat`,
      senderId: {
        _id: session?.user?.email || "current-user",
        username: session?.user?.name || "You",
        profilePicture: session?.user?.image,
      },
      receiverId: friendId,
      content: `📹 Video call started`,
      type: "system",
      status: "sent",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setMessages((prev) => [...prev, callMessage]);

    // Show video call interface (simplified for now)
    alert(
      `Video call with ${friendName} - This would open a video call interface in a real implementation`
    );

    if (onStartVideoCall) {
      onStartVideoCall();
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/delete/${messageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show loading state
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("friendId", friendId);

      const response = await fetch("/api/messages/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert(
        `Failed to upload file: ${
          error instanceof Error ? error.message : "Please try again."
        }`
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessageToAPI(newMessage, "text", replyingTo?._id);
      setNewMessage("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Real-time typing indicator
    if (e.target.value.length > 0) {
      setIsTyping(true);

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to stop typing indicator
      const newTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 1000);

      setTypingTimeout(newTimeout);

      // Send typing status to server (placeholder)
      // fetch('/api/messages/typing', { method: 'POST', body: JSON.stringify({ friendId, typing: true }) });
    } else {
      setIsTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    try {
      setIsSending(true);

      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-message.webm");
      formData.append("friendId", friendId);
      formData.append("duration", duration.toString());

      const response = await fetch("/api/messages/voice", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);
      } else {
        throw new Error("Failed to send voice message");
      }
    } catch (error) {
      console.error("Failed to send voice message:", error);
      alert("Failed to send voice message. Please try again.");
    } finally {
      setIsSending(false);
      setShowVoiceRecorder(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessageDate = (date: Date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return "just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "delivered":
        return (
          <div className="flex -space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "read":
        return (
          <div className="flex -space-x-1 text-blue-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups: { [key: string]: ChatMessage[] }, message) => {
      const date = formatMessageDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {}
  );

  const currentUserEmail = session?.user?.email;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Desktop Header - Hidden on mobile since mobile has header in messages page */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
            {friendAvatar ? (
              <img
                src={friendAvatar}
                alt={friendName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-medium">
                {friendName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{friendName}</h3>
            <p className="text-sm text-gray-500">
              {isOnline ? (
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </span>
              ) : lastSeen ? (
                `Last seen ${formatLastSeen(lastSeen)}`
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={showSearch ? "Hide search" : "Show search"}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={onStartCall}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={onStartVideoCall}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Start video call"
          >
            <Video className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-3 border-b bg-gray-50">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 flex flex-col p-4 bg-gray-50 min-h-0 overflow-hidden">
        {messagesLoading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="text-center text-gray-500">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">
                Start a conversation with {friendName}!
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 bg-white text-gray-600 text-xs rounded-full shadow-sm border">
                    {date}
                  </span>
                </div>

                {/* Messages for this date */}
                {dateMessages.map((message) => {
                  // Check if current user is the sender by comparing email or ID
                  const isCurrentUser =
                    message.senderId._id === currentUserEmail ||
                    message.senderId.username === currentUserEmail ||
                    (session?.user?.id &&
                      message.senderId._id === session.user.id);

                  return (
                    <div
                      key={message._id}
                      className={`flex ${
                        isCurrentUser ? "justify-end" : "justify-start"
                      } mb-3 group relative`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          messageId: message._id,
                        });
                      }}
                    >
                      {/* Receiver message - show avatar on left */}
                      {!isCurrentUser && (
                        <div className="flex-shrink-0 mr-2">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                            {friendAvatar ? (
                              <img
                                src={friendAvatar}
                                alt={friendName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 text-xs font-medium">
                                {friendName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col max-w-xs lg:max-w-md">
                        {/* Reply indicator - WhatsApp style - only show if this message is a reply */}
                        {message.replyTo &&
                          message.replyTo._id &&
                          message.replyTo.content && (
                            <div
                              className={`p-2 rounded-t-lg border-l-4 ${
                                isCurrentUser
                                  ? "bg-blue-400 bg-opacity-20 border-blue-300"
                                  : "bg-gray-300 bg-opacity-50 border-gray-400"
                              }`}
                            >
                              <div className="flex items-start space-x-2">
                                <div className="flex-1">
                                  <p
                                    className={`text-xs font-semibold mb-1 ${
                                      isCurrentUser
                                        ? "text-blue-800"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {message.replyTo.senderName}
                                  </p>
                                  <p
                                    className={`text-xs line-clamp-2 ${
                                      isCurrentUser
                                        ? "text-blue-700"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {message.replyTo.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                        <div
                          className={`px-4 py-2 shadow-sm relative ${
                            message.replyTo &&
                            message.replyTo._id &&
                            message.replyTo.content
                              ? isCurrentUser
                                ? "bg-blue-500 text-white rounded-b-2xl rounded-tr-2xl"
                                : "bg-gray-100 text-gray-900 rounded-b-2xl rounded-tl-2xl"
                              : isCurrentUser
                              ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
                              : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md"
                          }`}
                        >
                          {/* Show sender name for received messages */}
                          {!isCurrentUser && (
                            <p className="text-xs text-gray-500 mb-1 font-medium">
                              {message.senderId.username}
                            </p>
                          )}

                          {/* Message content based on type */}
                          {message.type === "text" && (
                            <p className="text-sm leading-relaxed">
                              {message.content}
                            </p>
                          )}

                          {message.type === "system" && (
                            <p className="text-sm leading-relaxed italic opacity-75">
                              {message.content}
                            </p>
                          )}

                          {message.type === "image" && message.fileUrl && (
                            <div className="mb-2">
                              <img
                                src={message.fileUrl}
                                alt="Shared image"
                                className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer"
                                onClick={() =>
                                  window.open(message.fileUrl, "_blank")
                                }
                                onError={(e) => {
                                  console.error(
                                    "Failed to load image:",
                                    message.fileUrl
                                  );
                                  const target =
                                    e.currentTarget as HTMLImageElement;
                                  target.style.display = "none";
                                  // Show a placeholder or error message
                                  const errorDiv =
                                    document.createElement("div");
                                  errorDiv.className =
                                    "text-sm text-red-500 p-2 bg-red-50 rounded";
                                  errorDiv.textContent = "Image failed to load";
                                  target.parentNode?.insertBefore(
                                    errorDiv,
                                    target
                                  );
                                }}
                              />
                              {message.content && (
                                <p className="text-sm leading-relaxed mt-2">
                                  {message.content}
                                </p>
                              )}
                            </div>
                          )}

                          {message.type === "file" && (
                            <div className="flex items-center space-x-3 p-2 bg-white bg-opacity-10 rounded-lg">
                              <div className="flex-shrink-0">
                                <FileText
                                  className={`w-8 h-8 ${
                                    isCurrentUser
                                      ? "text-blue-200"
                                      : "text-gray-600"
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {message.fileName}
                                </p>
                                <p
                                  className={`text-xs ${
                                    isCurrentUser
                                      ? "text-blue-200"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {message.fileSize
                                    ? `${(message.fileSize / 1024).toFixed(
                                        1
                                      )} KB`
                                    : "Unknown size"}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  if (message.fileUrl) {
                                    const link = document.createElement("a");
                                    link.href = message.fileUrl;
                                    link.download = message.fileName || "file";
                                    link.click();
                                  }
                                }}
                                className={`p-1 rounded hover:bg-white hover:bg-opacity-20 ${
                                  isCurrentUser
                                    ? "text-blue-200"
                                    : "text-gray-600"
                                }`}
                                title="Download"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-between mt-2 text-xs ${
                              isCurrentUser ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {message.isEdited && (
                              <span className="text-xs opacity-75">edited</span>
                            )}
                            {isCurrentUser && (
                              <div className="flex items-center ml-2 space-x-1">
                                <span
                                  className={`${
                                    message.status === "read"
                                      ? "text-blue-200"
                                      : "text-blue-300"
                                  }`}
                                >
                                  {getStatusIcon(message.status)}
                                </span>
                                {message.status === "read" && (
                                  <span className="text-xs text-blue-200 opacity-75">
                                    Read
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reactions - WhatsApp style at bottom right of message */}
                        {message.reactions &&
                          Object.keys(message.reactions).length > 0 && (
                            <div
                              className={`flex flex-wrap gap-1 mt-1 ${
                                isCurrentUser ? "justify-end" : "justify-start"
                              }`}
                            >
                              {Object.entries(message.reactions).map(
                                ([userId, reaction]) => (
                                  <span
                                    key={userId}
                                    className="text-sm bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm"
                                  >
                                    {reaction}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                      </div>

                      {/* Sender message - show avatar on right */}
                      {isCurrentUser && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                            {session?.user?.image ? (
                              <img
                                src={session.user.image}
                                alt="You"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-xs font-medium">
                                {session?.user?.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-white border rounded-lg shadow-lg py-2 z-50 min-w-48"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const message = messages.find(
                  (m) => m._id === contextMenu?.messageId
                );
                if (message) {
                  setReplyingTo(message);
                }
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3"
            >
              <Reply className="w-4 h-4 text-gray-600" />
              <span className="text-sm">Reply</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  messages.find((m) => m._id === contextMenu?.messageId)
                    ?.content || ""
                );
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm">Copy</span>
            </button>
            <button
              onClick={() => {
                // Forward functionality placeholder
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3"
            >
              <Forward className="w-4 h-4 text-gray-600" />
              <span className="text-sm">Forward</span>
            </button>
            <hr className="my-1" />
            <div className="px-4 py-2">
              <span className="text-xs text-gray-500 font-medium">
                React with
              </span>
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => {
                    addReaction(contextMenu?.messageId || "", "👍");
                    setContextMenu(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Like"
                >
                  <span className="text-lg">👍</span>
                </button>
                <button
                  onClick={() => {
                    addReaction(contextMenu?.messageId || "", "❤️");
                    setContextMenu(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Love"
                >
                  <span className="text-lg">❤️</span>
                </button>
                <button
                  onClick={() => {
                    addReaction(contextMenu?.messageId || "", "😂");
                    setContextMenu(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Laugh"
                >
                  <span className="text-lg">😂</span>
                </button>
                <button
                  onClick={() => {
                    addReaction(contextMenu?.messageId || "", "😮");
                    setContextMenu(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Wow"
                >
                  <span className="text-lg">😮</span>
                </button>
                <button
                  onClick={() => {
                    addReaction(contextMenu?.messageId || "", "😢");
                    setContextMenu(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Sad"
                >
                  <span className="text-lg">😢</span>
                </button>
                <button
                  onClick={() => {
                    addReaction(contextMenu?.messageId || "", "😡");
                    setContextMenu(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Angry"
                >
                  <span className="text-lg">😡</span>
                </button>
              </div>
            </div>
            {messages.find((m) => m._id === contextMenu?.messageId)?.senderId
              ._id === (session?.user?.email || session?.user?.id) && (
              <div>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    deleteMessage(contextMenu?.messageId || "");
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Delete</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Typing indicator - WhatsApp style */}
        {showTypingIndicator && (
          <div className="flex justify-start mb-3 animate-fade-in">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                {friendAvatar ? (
                  <img
                    src={friendAvatar}
                    alt={friendName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 text-xs font-medium">
                    {friendName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  <span className="text-xs text-gray-500 ml-2">typing...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Replying to{" "}
                  {replyingTo.senderId._id === session?.user?.id
                    ? "yourself"
                    : friendName}
                </p>
                <p className="text-sm text-blue-600 truncate">
                  {replyingTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-blue-500 hover:text-blue-700"
                aria-label="Cancel reply"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Voice Recorder */}
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSendVoiceMessage={handleSendVoiceMessage}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <div className="flex items-center space-x-3">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              aria-hidden="true"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSending}
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={
                  showEmojiPicker ? "Close emoji picker" : "Open emoji picker"
                }
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {newMessage.trim() ? (
              <button
                onClick={handleSendMessage}
                disabled={isSending}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setShowVoiceRecorder(true)}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                aria-label="Record voice message"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {[
                "😀",
                "😂",
                "😍",
                "🤔",
                "😢",
                "😡",
                "👍",
                "👎",
                "❤️",
                "🔥",
                "💯",
                "🎉",
              ].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewMessage((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-2xl hover:bg-gray-200 p-1 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
