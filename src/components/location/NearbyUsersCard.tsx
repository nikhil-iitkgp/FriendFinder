"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "@/context/LocationContext";
import FriendRequestButton from "@/components/friends/FriendRequestButton";
import geolocationService from "@/lib/geolocation";
import {
  Users,
  RefreshCw,
  MapPin,
  Clock,
  MessageCircle,
  Radar,
  Settings,
} from "lucide-react";

export default function NearbyUsersCard() {
  const {
    nearbyUsers,
    isLoadingNearby,
    nearbyError,
    discoveryRadius,
    setDiscoveryRadius,
    currentLocation,
    findNearbyUsers,
  } = useLocation();

  const [tempRadius, setTempRadius] = useState(discoveryRadius);

  useEffect(() => {
    setTempRadius(discoveryRadius);
  }, [discoveryRadius]);

  const handleFindNearby = async () => {
    if (!currentLocation) {
      return;
    }
    await findNearbyUsers(tempRadius);
  };

  const handleUpdateRadius = () => {
    setDiscoveryRadius(tempRadius);
    // Don't automatically search - user needs to click "Find Nearby" button
  };

  const handleSendFriendRequest = async (userId: string) => {
    // This is now handled by the FriendRequestButton component
    console.log(
      "Friend request handled by FriendRequestButton for user:",
      userId
    );
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Nearby Friends
          <Badge variant="secondary" className="ml-auto">
            {nearbyUsers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discovery Settings */}
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Discovery Settings</span>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="radius" className="text-sm">
              Range:
            </Label>
            <Input
              id="radius"
              type="number"
              value={tempRadius}
              onChange={(e) => setTempRadius(Number(e.target.value))}
              min="100"
              max="10000"
              step="100"
              className="w-20"
            />
            <span className="text-sm text-gray-600">meters</span>
            <Button
              onClick={handleUpdateRadius}
              size="sm"
              variant="outline"
              disabled={tempRadius === discoveryRadius}
            >
              Update
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            Current range: {geolocationService.formatDistance(discoveryRadius)}
          </div>
        </div>

        {/* Scan Button */}
        <Button
          onClick={handleFindNearby}
          disabled={isLoadingNearby || !currentLocation}
          className="w-full"
        >
          {isLoadingNearby ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Scanning for nearby friends...
            </>
          ) : (
            <>
              <Radar className="w-4 h-4 mr-2" />
              Scan for Nearby Friends
            </>
          )}
        </Button>

        {/* Location Status */}
        {!currentLocation && (
          <div className="text-center text-sm text-gray-500 py-4">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            Location not available. Please enable location services first.
          </div>
        )}

        {/* Error Message */}
        {nearbyError && (
          <div className="text-center text-sm text-red-600 py-2">
            {nearbyError}
          </div>
        )}

        {/* Nearby Users List */}
        {nearbyUsers.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">
              Found {nearbyUsers.length}{" "}
              {nearbyUsers.length === 1 ? "person" : "people"} nearby
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {nearbyUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {user.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {geolocationService.formatDistance(user.distance)}
                      </Badge>
                      {/* Add friendship status badges */}
                      {user.isFriend && (
                        <Badge
                          variant="default"
                          className="bg-blue-100 text-blue-800 text-xs"
                        >
                          Friend
                        </Badge>
                      )}
                      {user.hasPendingRequestTo && (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 text-xs"
                        >
                          Pending
                        </Badge>
                      )}
                      {user.hasPendingRequestFrom && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 text-xs"
                        >
                          Sent Request
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatLastSeen(user.lastSeen)}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <FriendRequestButton
                      targetUserId={user.id}
                      targetUserName={user.name}
                      currentStatus={
                        user.isFriend
                          ? "friends"
                          : user.hasPendingRequestTo
                          ? "pending"
                          : user.hasPendingRequestFrom
                          ? "received_request"
                          : "none"
                      }
                      size="sm"
                      onStatusChange={() => {
                        // Refresh the nearby users list to update relationship status
                        findNearbyUsers();
                      }}
                    />

                    {/* Message Button - only show for friends */}
                    {user.isFriend && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          // Navigate to messages with this friend
                          window.location.href = `/dashboard/messages?userId=${user.id}`;
                        }}
                        title="Send Message"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentLocation && !isLoadingNearby && !nearbyError ? (
          <div className="text-center text-sm text-gray-500 py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <div>No friends found nearby</div>
            <div className="text-xs mt-1">
              Try increasing your discovery range or scanning again later
            </div>
          </div>
        ) : null}

        {/* Discovery Info */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
          <p>• Only shows friends who have discovery enabled</p>
          <p>• Click "Find Nearby" to search for friends manually</p>
          <p>• Maximum range is 10km for performance</p>
        </div>
      </CardContent>
    </Card>
  );
}
