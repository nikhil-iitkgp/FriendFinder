"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Send,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";

interface Message {
  _id: string;
  senderId: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  receiverId: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  content: string;
  type: "text" | "image" | "file" | "system";
  status: "sent" | "delivered" | "read";
  createdAt: string;
  isDeleted: boolean;
}

interface ChatPartner {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface ChatWindowProps {
  chatPartnerId: string;
  currentUserId: string;
  onClose: () => void;
  isOpen: boolean;
}

export default function ChatWindow({
  chatPartnerId,
  currentUserId,
  onClose,
  isOpen,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch message history
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/messages/${chatPartnerId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages || []);
        setChatPartner(data.data.chatPartner);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/messages/${chatPartnerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: messageContent,
          messageType: "text",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      if (data.success) {
        // Add message to local state immediately for optimistic UI
        setMessages((prev) => [...prev, data.data.message]);

        // TODO: Emit real-time event via Socket.IO
        // socket.emit('send_message', {
        //   recipientId: chatPartnerId,
        //   message: data.data.message
        // });

        scrollToBottom();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      // Restore message input on error
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fetch messages when chat partner changes
  useEffect(() => {
    if (chatPartnerId && isOpen) {
      fetchMessages();
    }
  }, [chatPartnerId, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // TODO: Socket.IO real-time message handling
  useEffect(() => {
    // const socket = useSocket();
    //
    // if (socket && isOpen) {
    //   // Listen for new messages
    //   socket.on('new_message', (data) => {
    //     if (data.message.senderId._id === chatPartnerId) {
    //       setMessages(prev => [...prev, data.message]);
    //       scrollToBottom();
    //     }
    //   });
    //
    //   // Listen for typing indicators
    //   socket.on('user_typing', (data) => {
    //     if (data.userId === chatPartnerId) {
    //       setIsTyping(true);
    //       setTimeout(() => setIsTyping(false), 3000);
    //     }
    //   });
    //
    //   // Listen for message read receipts
    //   socket.on('message_read', (data) => {
    //     setMessages(prev => prev.map(msg =>
    //       data.messageIds.includes(msg._id)
    //         ? { ...msg, status: 'read' }
    //         : msg
    //     ));
    //   });
    //
    //   return () => {
    //     socket.off('new_message');
    //     socket.off('user_typing');
    //     socket.off('message_read');
    //   };
    // }
  }, [chatPartnerId, isOpen]);

  if (!isOpen) return null;

  return (
    <Card className="fixed inset-4 z-50 flex flex-col max-h-[90vh]">
      {/* Chat Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={chatPartner?.profilePicture} />
                <AvatarFallback>
                  {chatPartner?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              {chatPartner?.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            <div>
              <h3 className="font-semibold">
                {chatPartner?.name || "Loading..."}
              </h3>
              <p className="text-xs text-muted-foreground">
                {chatPartner?.isOnline
                  ? "Online"
                  : chatPartner?.lastSeen
                  ? `Last seen ${formatDistanceToNow(
                      new Date(chatPartner.lastSeen)
                    )} ago`
                  : "Offline"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start a conversation with {chatPartner?.name}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.senderId._id === currentUserId;

                return (
                  <div
                    key={message._id}
                    className={`flex ${
                      isOwnMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <span className="text-xs opacity-70">
                          {formatDistanceToNow(new Date(message.createdAt))} ago
                        </span>
                        {isOwnMessage && (
                          <div className="flex items-center">
                            {message.status === "sent" && (
                              <Check className="w-3 h-3 opacity-70" />
                            )}
                            {message.status === "delivered" && (
                              <CheckCheck className="w-3 h-3 opacity-70" />
                            )}
                            {message.status === "read" && (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
