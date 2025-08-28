"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFriends } from "@/context/FriendsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FriendsList from "@/components/FriendsList";
import FriendRequestsManager from "@/components/FriendRequestsManager";
import UserSearch from "@/components/UserSearch";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  MessageCircle,
  Phone,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function FriendsPage() {
  const {
    friends,
    friendsLoading,
    friendsError,
    receivedRequests,
    sentRequests,
    requestsLoading,
    refreshFriends,
    refreshRequests,
  } = useFriends();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("friends");

  // Handle URL parameters
  useEffect(() => {
    const tab = searchParams?.get("tab");
    const query = searchParams?.get("q");

    if (tab && ["friends", "requests", "search"].includes(tab)) {
      setActiveTab(tab);
    }

    if (query) {
      setSearchQuery(query);
      if (tab !== "search") {
        setActiveTab("search");
      }
    }
  }, [searchParams]);

  // Filter friends based on search
  const filteredFriends = friends.filter(
    (friend) =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = (friendId: string) => {
    router.push(`/dashboard/messages?userId=${friendId}`);
  };

  const handleStartCall = (friendId: string) => {
    router.push(`/dashboard/call-test?userId=${friendId}`);
  };

  const handleRefresh = () => {
    refreshFriends();
    refreshRequests();
  };

  // Removed auto-refresh on mount - context already handles data loading and auto-refresh

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
          <p className="text-gray-600">
            Manage your connections and friend requests
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={friendsLoading || requestsLoading}
        >
          {friendsLoading || requestsLoading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{friends.length}</p>
                <p className="text-sm text-gray-600">Total Friends</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{receivedRequests.length}</p>
                <p className="text-sm text-gray-600">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserX className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentRequests.length}</p>
                <p className="text-sm text-gray-600">Sent Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {friends.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Requests
            {receivedRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {receivedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Friends
          </TabsTrigger>
        </TabsList>

        {/* Friends List Tab */}
        <TabsContent value="friends" className="space-y-4">
          {friends.length > 0 && (
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {friendsError && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-red-600">
                  <p className="font-medium">Error loading friends</p>
                  <p className="text-sm">{friendsError}</p>
                  <Button
                    onClick={refreshFriends}
                    variant="outline"
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <FriendsList
            onStartChat={handleStartChat}
            onStartCall={handleStartCall}
          />

          {!friendsLoading && friends.length === 0 && !friendsError && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No friends yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Start by searching for people to connect with or use the
                    discovery feature to find nearby friends.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => setActiveTab("search")}
                      variant="default"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Find Friends
                    </Button>
                    <Button
                      onClick={() => router.push("/dashboard/discover")}
                      variant="outline"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Discover Nearby
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Friend Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <FriendRequestsManager />
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <UserSearch initialQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
