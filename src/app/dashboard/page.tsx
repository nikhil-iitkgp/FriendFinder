"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/context/FriendsContext";
import { useLocation } from "@/context/LocationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import {
  Users,
  MessageCircle,
  Compass,
  MapPin,
  Bell,
  Activity,
  Heart,
  UserPlus,
  Clock,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { friends, receivedRequests, friendsLoading } = useFriends();
  const { nearbyUsers, isLoadingNearby } = useLocation();
  const router = useRouter();
  const [messagesCount, setMessagesCount] = useState(0);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const displayName = user?.username || session?.user?.name || "User";
  const userEmail = user?.email || session?.user?.email;

  // Fetch messages count and recent activity
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoadingMessages(true);

        // Get conversations to count messages
        const conversationsResponse = await fetch("/api/conversations");
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          const totalMessages =
            conversationsData.conversations?.reduce(
              (acc: number, conv: any) => acc + (conv.messageCount || 0),
              0
            ) || 0;
          setMessagesCount(totalMessages);
        }

        // Generate recent activity based on friend requests and current data
        const activities = [];

        if (receivedRequests.length > 0) {
          activities.push({
            id: "friend-requests",
            type: "friend_request",
            title: `${receivedRequests.length} pending friend request${
              receivedRequests.length > 1 ? "s" : ""
            }`,
            message: "Review your friend requests",
            timestamp: new Date(),
            icon: UserPlus,
          });
        }

        if (user && !user.isDiscoveryEnabled) {
          activities.push({
            id: "discovery-disabled",
            type: "settings",
            title: "Discovery is disabled",
            message: "Enable discovery to find nearby friends",
            timestamp: new Date(),
            icon: Compass,
          });
        }

        setRecentActivity(activities);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, receivedRequests]);

  // Quick action handlers
  const handleDiscoverNearby = () => {
    router.push("/dashboard/discover");
  };

  const handleInviteFriends = () => {
    // Navigate to friends page to view friend requests
    router.push("/dashboard/friends");
  };

  const handleUpdateLocation = () => {
    router.push("/dashboard/location-test");
  };

  const handleNotificationSettings = () => {
    router.push("/dashboard/settings");
  };

  return (
    <div className="space-y-4 sm:space-y-6 py-2">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 rounded-xl p-4 sm:p-6 text-white shadow-xl">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {displayName}! 👋
        </h1>
        <p className="text-blue-100 text-sm md:text-base leading-relaxed">
          Ready to connect with friends nearby? Let's see what's happening in
          your network.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-200 border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                {friendsLoading ? (
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 animate-spin text-gray-400" />
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{friends.length}</p>
                )}
                <p className="text-xs md:text-sm text-gray-600 font-medium">Friends</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-200 border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                {isLoadingMessages ? (
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 animate-spin text-gray-400" />
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{messagesCount}</p>
                )}
                <p className="text-xs md:text-sm text-gray-600 font-medium">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-200 border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                <Compass className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
              <div>
                {isLoadingNearby ? (
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 animate-spin text-gray-400" />
                ) : (
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{nearbyUsers.length}</p>
                )}
                <p className="text-xs md:text-sm text-gray-600 font-medium">Nearby</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-200 border-0 shadow-md">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 rounded-xl">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{receivedRequests.length}</p>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!user && (
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <UserPlus className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Welcome to FriendFinder!
                      </p>
                      <p className="text-xs text-gray-500">
                        Complete your profile to start discovering friends
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Just now
                    </div>
                  </div>
                )}

                {recentActivity.map((activity) => {
                  const IconComponent = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IconComponent className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-gray-500">
                          {activity.message}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}

                {recentActivity.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity yet</p>
                    <p className="text-sm">
                      Start connecting with friends to see updates here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all duration-200"
                variant="outline"
                onClick={handleDiscoverNearby}
              >
                <Compass className="mr-2 h-4 w-4" />
                Discover Nearby Friends
              </Button>

              <Button
                className="w-full justify-start hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all duration-200"
                variant="outline"
                onClick={handleInviteFriends}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Friends
              </Button>

              <Button
                className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all duration-200"
                variant="outline"
                onClick={handleUpdateLocation}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Update Location
              </Button>

              <Button
                className="w-full justify-start hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all duration-200"
                variant="outline"
                onClick={handleNotificationSettings}
              >
                <Bell className="mr-2 h-4 w-4" />
                Notification Settings
              </Button>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card className="mt-6 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Avatar className="h-16 w-16 ring-4 ring-blue-100">
                  <AvatarImage
                    src={session?.user?.image || undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold">
                    {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{displayName}</h3>
                  <p className="text-sm text-gray-600">{userEmail}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {user?.bio || "Add a bio to tell others about yourself"}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all duration-200"
                onClick={() => router.push('/dashboard/profile')}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started Guide */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Getting Started with FriendFinder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium mb-2">Complete Your Profile</h3>
              <p className="text-sm text-gray-600 mb-3">
                Add a photo and bio to help others recognize you
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => router.push('/dashboard/profile')}
              >
                Complete Profile
              </Button>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium mb-2">Enable Location</h3>
              <p className="text-sm text-gray-600 mb-3">
                Allow location access to discover friends nearby
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleUpdateLocation}
              >
                Enable Location
              </Button>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Compass className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-medium mb-2">Start Discovering</h3>
              <p className="text-sm text-gray-600 mb-3">
                Find and connect with people in your area
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDiscoverNearby}
              >
                Start Discovery
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
