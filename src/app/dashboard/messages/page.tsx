"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFriends } from "@/context/FriendsContext";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Search,
  Menu,
  X,
  UserPlus,
  Phone,
  Video,
  MoreVertical,
  Users,
  Plus,
  RefreshCw,
} from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
// import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Conversation {
  chatId: string;
  participant: {
    id: string;
    username: string;
    email: string;
    profilePicture?: string;
    lastSeen: Date;
  };
  latestMessage?: {
    content: string;
    type: string;
    createdAt: Date;
    senderId: string;
  };
  messageCount: number;
  unreadCount: number;
  updatedAt: Date;
}

export default function MessagesPage() {
  const { friends, friendsLoading } = useFriends();
  const searchParams = useSearchParams();
  const initialUserId = searchParams?.get("userId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check screen size for mobile view
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      // Auto-close sidebar on desktop
      if (!isMobile) {
        setSidebarOpen(false);
      } else {
        // On mobile, close sidebar when no conversation is selected
        if (!selectedConversation) {
          setSidebarOpen(false);
        }
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [selectedConversation]);

  // Fetch conversations
  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error("Failed to fetch conversations");
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Auto-select conversation if userId is provided
  useEffect(() => {
    if (initialUserId && conversations.length > 0) {
      const conversation = conversations.find(
        (conv) => conv.participant.id === initialUserId
      );
      if (conversation) {
        setSelectedConversation(conversation);
      } else {
        // Create new conversation if user is a friend
        const friend = friends.find((f) => f.id === initialUserId);
        if (friend) {
          createConversationWithFriend(friend.id);
        }
      }
    }
  }, [initialUserId, conversations, friends]);

  // Create conversation with a friend
  const createConversationWithFriend = async (friendId: string) => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantId: friendId }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data.conversation);
        // Refresh conversations list
        fetchConversations();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participant.username
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conv.participant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format last message time
  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = (now.getTime() - messageDate.getTime()) / (1000 * 60);

    if (diffInMinutes < 1) return "Now";
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return messageDate.toLocaleDateString();
  };

  const ConversationsList = () => {
    const [activeTab, setActiveTab] = useState<"conversations" | "friends">(
      "conversations"
    );

    const filteredConversations = conversations.filter(
      (conv) =>
        conv.participant.username
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        conv.participant.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // For Friends tab: Show ALL friends sorted alphabetically by username
    const allFriends = friends
      .filter(
        (friend) =>
          friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          friend.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) =>
        a.username.toLowerCase().localeCompare(b.username.toLowerCase())
      );

    // For Chats tab: Show all friends but prioritize those with recent conversations
    const friendsWithConversations = friends
      .filter(
        (friend) =>
          friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          friend.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((friend) => {
        const conversation = conversations.find(
          (conv) => conv.participant.id === friend.id
        );
        return {
          ...friend,
          hasConversation: !!conversation,
          lastMessageTime: conversation?.updatedAt || new Date(0),
        };
      })
      .sort((a, b) => {
        // First sort by whether they have conversations (recent chats first)
        if (a.hasConversation && !b.hasConversation) return -1;
        if (!a.hasConversation && b.hasConversation) return 1;
        // Then sort by last message time (most recent first) or alphabetically
        if (a.hasConversation && b.hasConversation) {
          return (
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime()
          );
        }
        return a.username.toLowerCase().localeCompare(b.username.toLowerCase());
      });

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header - Always show on mobile, desktop gets a cleaner header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          {isMobileView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "conversations" | "friends")
          }
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-3 mb-2 bg-gray-100">
            <TabsTrigger value="conversations" className="text-sm">
              Chats ({friendsWithConversations.length})
            </TabsTrigger>
            <TabsTrigger value="friends" className="text-sm">
              Friends ({allFriends.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="conversations"
            className="flex-1 overflow-hidden mt-0"
          >
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : friendsWithConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">
                    No friends to chat with
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Add friends to start conversations!
                  </p>
                  <Button
                    onClick={() =>
                      (window.location.href = "/dashboard/friends")
                    }
                    size="sm"
                    className="mt-4 bg-blue-500 hover:bg-blue-600"
                  >
                    Find Friends
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {friendsWithConversations.map((friend) => {
                    const conversation = conversations.find(
                      (conv) => conv.participant.id === friend.id
                    );
                    return (
                      <div
                        key={friend.id}
                        onClick={() => {
                          if (conversation) {
                            setSelectedConversation(conversation);
                            // Close sidebar only if it's open (when in chat mode)
                            if (sidebarOpen) {
                              setSidebarOpen(false);
                            }
                          } else {
                            createConversationWithFriend(friend.id);
                          }
                        }}
                        className={cn(
                          "flex items-center p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 active:bg-gray-100",
                          selectedConversation?.participant.id === friend.id &&
                            "bg-blue-50 border-r-2 border-blue-500"
                        )}
                      >
                        <Avatar className="h-12 w-12 mr-3 ring-2 ring-white shadow-sm">
                          <AvatarImage src={friend.profilePicture} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                            {friend.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-sm text-gray-900 truncate">
                              {friend.username}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {friend.hasConversation &&
                                conversation?.latestMessage && (
                                  <span className="text-xs text-gray-500">
                                    {formatMessageTime(
                                      conversation.latestMessage.createdAt
                                    )}
                                  </span>
                                )}
                              {friend.hasConversation && (
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {conversation?.latestMessage?.content ||
                              "Start a conversation"}
                          </p>
                        </div>
                        {conversation?.unreadCount &&
                          conversation.unreadCount > 0 && (
                            <Badge className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="friends" className="flex-1 overflow-hidden mt-0">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {friendsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : allFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">
                    No friends to chat with
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Add friends to start conversations
                  </p>
                  <Button
                    onClick={() =>
                      (window.location.href = "/dashboard/friends")
                    }
                    size="sm"
                    className="mt-4 bg-blue-500 hover:bg-blue-600"
                  >
                    Find Friends
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {allFriends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => {
                        createConversationWithFriend(friend.id);
                        // Close sidebar only if it's open (when in chat mode)
                        if (sidebarOpen) {
                          setSidebarOpen(false);
                        }
                      }}
                      className="flex items-center p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 active:bg-gray-100"
                    >
                      <Avatar className="h-12 w-12 mr-3 ring-2 ring-white shadow-sm">
                        <AvatarImage src={friend.profilePicture} />
                        <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium">
                          {friend.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">
                          {friend.username}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {friend.email}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <MessageCircle className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Mobile view: show either conversations list or chat
  if (isMobileView) {
    return (
      <div className="h-[calc(100vh-4rem)] flex overflow-hidden rounded-lg shadow-sm border border-gray-200 bg-white">
        {/* Mobile Sidebar Overlay - Only show when explicitly opened while in chat */}
        {sidebarOpen && selectedConversation && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex flex-col w-full max-w-sm bg-white shadow-xl">
              <ConversationsList />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <div className="h-full flex flex-col">
              {/* Mobile Chat Header */}
              <div className="flex items-center p-3 border-b bg-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="mr-3 p-2"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 mr-3">
                  <AvatarImage
                    src={selectedConversation.participant.profilePicture}
                    alt={selectedConversation.participant.username}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm">
                    {selectedConversation.participant.username
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-base truncate">
                    {selectedConversation.participant.username}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {selectedConversation.participant.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="p-2"
                >
                  <Users className="h-5 w-5" />
                </Button>
              </div>

              {/* Chat Interface */}
              <div className="flex-1">
                <ChatInterface
                  friendId={selectedConversation.participant.id}
                  friendName={selectedConversation.participant.username}
                />
              </div>
            </div>
          ) : (
            /* Show conversations list directly on mobile when no conversation selected */
            <div className="h-full flex flex-col">
              <ConversationsList />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop view: WhatsApp-like layout with persistent sidebar
  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white overflow-hidden rounded-lg shadow-sm border border-gray-200">
      {/* Desktop Sidebar - Always visible on desktop */}
      <div className="hidden md:flex md:w-80 lg:w-96 border-r border-gray-200 bg-white flex-col">
        <ConversationsList />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-full max-w-sm bg-white shadow-xl h-full">
            <ConversationsList />
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <div className="h-full flex flex-col">
            {/* Mobile header with back button */}
            <div className="md:hidden flex items-center p-3 border-b bg-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="mr-3 p-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9 mr-3">
                <AvatarImage
                  src={selectedConversation.participant.profilePicture}
                />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  {selectedConversation.participant.username
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base truncate">
                  {selectedConversation.participant.username}
                </h3>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>

            <ChatInterface
              friendId={selectedConversation.participant.id}
              friendName={selectedConversation.participant.username}
              friendAvatar={selectedConversation.participant.profilePicture}
              onClose={() => setSelectedConversation(null)}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md mx-auto px-6">
              {/* Welcome message for desktop only */}
              <div className="mb-6">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-16 w-16 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Welcome to FriendFinder Messages
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  Select a conversation from the sidebar to start messaging, or
                  go to the Friends page to connect with new people.
                </p>

                {/* Desktop: Show quick actions */}
                <div className="flex flex-col space-y-3">
                  <Button
                    onClick={() =>
                      (window.location.href = "/dashboard/friends")
                    }
                    variant="outline"
                    className="w-full"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Find Friends
                  </Button>
                  <Button
                    onClick={() =>
                      (window.location.href = "/dashboard/discover")
                    }
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Discover People
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
