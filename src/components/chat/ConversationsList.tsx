"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Search, MessageCircle, Plus, Users, Loader2 } from "lucide-react";

interface Conversation {
  id: string;
  chatPartner: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
    isOnline: boolean;
    lastSeen?: string;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
    type: string;
  };
  unreadCount: number;
  conversationId: string;
  updatedAt: string;
}

interface ConversationsListProps {
  currentUserId: string;
  onSelectChat: (chatPartnerId: string, chatPartnerName: string) => void;
  selectedChatId?: string;
}

export default function ConversationsList({
  currentUserId,
  onSelectChat,
  selectedChatId,
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [friends, setFriends] = useState<any[]>([]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/messages");

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      if (data.success) {
        setConversations(data.data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch friends for starting new chats
  const fetchFriends = async () => {
    try {
      // TODO: Implement friends list API
      // const response = await fetch('/api/friends');
      // if (response.ok) {
      //   const data = await response.json();
      //   setFriends(data.friends || []);
      // }

      // Demo friends for now
      setFriends([
        {
          id: "1",
          name: "Alice Johnson",
          email: "alice@example.com",
          profilePicture: "/api/placeholder/40/40",
          isOnline: true,
        },
        {
          id: "2",
          name: "Bob Smith",
          email: "bob@example.com",
          profilePicture: "/api/placeholder/40/40",
          isOnline: false,
          lastSeen: "2 hours ago",
        },
        {
          id: "3",
          name: "Carol Williams",
          email: "carol@example.com",
          profilePicture: "/api/placeholder/40/40",
          isOnline: true,
        },
      ]);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, []);

  // TODO: Socket.IO real-time updates
  useEffect(() => {
    // const socket = useSocket();
    //
    // if (socket) {
    //   // Listen for new messages to update conversation list
    //   socket.on('new_message', (data) => {
    //     setConversations(prev => {
    //       const updated = prev.map(conv => {
    //         if (conv.conversationId === data.conversationId) {
    //           return {
    //             ...conv,
    //             lastMessage: data.message,
    //             unreadCount: conv.chatPartner.id === data.message.senderId
    //               ? conv.unreadCount + 1
    //               : conv.unreadCount,
    //             updatedAt: data.message.createdAt
    //           };
    //         }
    //         return conv;
    //       });
    //
    //       // Sort by latest message
    //       return updated.sort((a, b) =>
    //         new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    //       );
    //     });
    //   });
    //
    //   return () => {
    //     socket.off('new_message');
    //   };
    // }
  }, []);

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.chatPartner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.chatPartner.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !conversations.some((conv) => conv.chatPartner.id === friend.id)
  );

  const formatLastMessage = (message: any) => {
    if (!message) return "No messages yet";

    if (message.type === "image") return "📷 Image";
    if (message.type === "file") return "📄 File";

    return message.content.length > 50
      ? message.content.substring(0, 50) + "..."
      : message.content;
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span>Messages</span>
            {getTotalUnreadCount() > 0 && (
              <Badge variant="destructive" className="text-xs">
                {getTotalUnreadCount()}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </CardTitle>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading conversations...</span>
            </div>
          ) : (
            <div className="px-4 pb-4">
              {/* Active Conversations */}
              {filteredConversations.length > 0 && (
                <div className="space-y-2 mb-6">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedChatId === conversation.chatPartner.id
                          ? "bg-muted"
                          : ""
                      }`}
                      onClick={() =>
                        onSelectChat(
                          conversation.chatPartner.id,
                          conversation.chatPartner.name
                        )
                      }
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={conversation.chatPartner.profilePicture}
                          />
                          <AvatarFallback>
                            {conversation.chatPartner.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.chatPartner.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium truncate">
                            {conversation.chatPartner.name}
                          </h4>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(conversation.lastMessage.createdAt)
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage &&
                              conversation.lastMessage.senderId ===
                                currentUserId && (
                                <span className="mr-1">You: </span>
                              )}
                            {formatLastMessage(conversation.lastMessage)}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-xs ml-2"
                            >
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends to Start New Chats */}
              {filteredFriends.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Start New Chat
                    </span>
                  </div>
                  <div className="space-y-2">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => onSelectChat(friend.id, friend.name)}
                      >
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={friend.profilePicture} />
                            <AvatarFallback>
                              {friend.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {friend.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {friend.isOnline
                              ? "Online"
                              : `Last seen ${friend.lastSeen}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredConversations.length === 0 &&
                filteredFriends.length === 0 &&
                !isLoading && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">
                      No conversations
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? "No matches found"
                        : "Start chatting with your friends"}
                    </p>
                    {!searchQuery && (
                      <Button variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        Find Friends
                      </Button>
                    )}
                  </div>
                )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
