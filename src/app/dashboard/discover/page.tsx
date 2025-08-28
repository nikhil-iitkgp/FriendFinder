"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/context/LocationContext";
import { wifiService, WifiUser } from "@/services/wifiService";
import { bluetoothService, BluetoothUser } from "@/services/bluetoothService";
import LocationPermissionCard from "@/components/location/LocationPermissionCard";
import NearbyUsersCard from "@/components/location/NearbyUsersCard";
import WifiManager from "@/components/WifiManager";
import BluetoothManager from "@/components/BluetoothManager";
import FriendRequestButton from "@/components/friends/FriendRequestButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  MapPin,
  Wifi,
  Bluetooth,
  Radar,
  Users,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Smartphone,
  UserPlus,
  Clock,
  WifiOff,
  BluetoothOff,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

type DiscoveryMethod = "gps" | "wifi" | "bluetooth";

export default function DiscoverPage() {
  const {
    currentLocation,
    isLocationEnabled,
    isWatching,
    startLocationTracking,
    stopLocationTracking,
    findNearbyUsers: findGPSUsers,
    nearbyUsers: gpsNearbyUsers,
    isLoadingNearby: isGPSLoading,
  } = useLocation();

  // WiFi state
  const [wifiUsers, setWifiUsers] = useState<WifiUser[]>([]);
  const [wifiStatus, setWifiStatus] = useState<{
    hasWiFi: boolean;
    lastSeenWiFi?: Date;
  } | null>(null);
  const [isWifiLoading, setIsWifiLoading] = useState(false);

  // Bluetooth state
  const [bluetoothUsers, setBluetoothUsers] = useState<BluetoothUser[]>([]);
  const [bluetoothStatus, setBluetoothStatus] = useState<{
    hasBluetooth: boolean;
    lastSeenBluetooth?: Date;
  } | null>(null);
  const [isBluetoothLoading, setIsBluetoothLoading] = useState(false);

  const [activeMethod, setActiveMethod] = useState<DiscoveryMethod>("gps");
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [autoSearchInterval, setAutoSearchInterval] =
    useState<NodeJS.Timeout | null>(null);

  // Load WiFi status on mount and when activeMethod changes to wifi
  useEffect(() => {
    loadWifiStatus();
    loadBluetoothStatus();
  }, []);

  useEffect(() => {
    if (activeMethod === "wifi") {
      loadWifiStatus();
    } else if (activeMethod === "bluetooth") {
      loadBluetoothStatus();
    }
  }, [activeMethod]);

  // Add event listener for WiFi and Bluetooth updates
  useEffect(() => {
    const handleWifiUpdate = async () => {
      console.log("WiFi update event received");
      setTimeout(async () => {
        await loadWifiStatus();
      }, 200);
    };

    const handleBluetoothUpdate = async () => {
      console.log("Bluetooth update event received");
      setTimeout(async () => {
        await loadBluetoothStatus();
      }, 200);
    };

    window.addEventListener("wifiUpdated", handleWifiUpdate);
    window.addEventListener("bluetoothUpdated", handleBluetoothUpdate);

    return () => {
      window.removeEventListener("wifiUpdated", handleWifiUpdate);
      window.removeEventListener("bluetoothUpdated", handleBluetoothUpdate);
    };
  }, []);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isWatching) {
        stopLocationTracking();
      }
      if (autoSearchInterval) {
        clearInterval(autoSearchInterval);
      }
    };
  }, [isWatching, stopLocationTracking, autoSearchInterval]);

  const loadWifiStatus = async () => {
    try {
      const status = await wifiService.getWifiStatus();
      setWifiStatus(status);
      console.log("WiFi status loaded:", status);
    } catch (error) {
      console.error("Failed to load WiFi status:", error);
    }
  };

  const loadBluetoothStatus = async () => {
    try {
      const status = await bluetoothService.getBluetoothStatus();
      setBluetoothStatus(status);
      console.log("Bluetooth status loaded:", status);
    } catch (error) {
      console.error("Failed to load Bluetooth status:", error);
    }
  };

  const findWiFiUsers = async () => {
    try {
      setIsWifiLoading(true);
      const response = await wifiService.getNearbyUsers();
      setWifiUsers(response.users);
      return response.users;
    } catch (error: any) {
      console.error("WiFi search error:", error);
      toast.error(error.message || "Failed to find WiFi users");
      setWifiUsers([]);
      return [];
    } finally {
      setIsWifiLoading(false);
    }
  };

  const findBluetoothUsers = async () => {
    try {
      setIsBluetoothLoading(true);
      const response = await bluetoothService.getNearbyUsers();
      setBluetoothUsers(response.users);
      return response.users;
    } catch (error: any) {
      console.error("Bluetooth search error:", error);
      toast.error(error.message || "Failed to find Bluetooth users");
      setBluetoothUsers([]);
      return [];
    } finally {
      setIsBluetoothLoading(false);
    }
  };

  // Remove auto-scan - users must click the "Scan Nearby Friends" button manually

  const handleMethodToggle = (method: DiscoveryMethod) => {
    setActiveMethod(method);

    // Load status when switching methods
    if (method === "wifi") {
      loadWifiStatus();
    } else if (method === "bluetooth") {
      loadBluetoothStatus();
    }
  };

  // Manual scan: trigger search and continue for 30 seconds
  const handleFindNearby = async () => {
    setIsLoading(true);
    setIsAutoSearching(true);
    setSearchProgress(0);

    // Clear any existing interval
    if (autoSearchInterval) {
      clearInterval(autoSearchInterval);
    }

    const performSearch = async () => {
      try {
        // GPS - start location tracking if needed and then find users
        if (activeMethod === "gps") {
          if (isLocationEnabled && !isWatching) {
            startLocationTracking();
          }
          if (currentLocation) {
            await findGPSUsers();
          }
        }
        // WiFi
        else if (activeMethod === "wifi") {
          await findWiFiUsers();
        }
        // Bluetooth
        else if (activeMethod === "bluetooth") {
          await findBluetoothUsers();
        }
      } catch (error) {
        console.error("Error during search:", error);
      }
    };

    // Perform initial search
    await performSearch();
    setIsLoading(false);

    // Set up 30-second auto-search with progress tracking
    let searchCount = 0;
    const maxSearches = 6; // 30 seconds / 5 seconds = 6 searches

    const interval = setInterval(async () => {
      searchCount++;
      setSearchProgress((searchCount / maxSearches) * 100);

      if (searchCount >= maxSearches) {
        setIsAutoSearching(false);
        setSearchProgress(0);
        clearInterval(interval);
        setAutoSearchInterval(null);
        return;
      }

      await performSearch();
    }, 5000); // Search every 5 seconds for 30 seconds total

    setAutoSearchInterval(interval);
  };

  // Stop auto-search manually
  const handleStopAutoSearch = () => {
    if (autoSearchInterval) {
      clearInterval(autoSearchInterval);
      setAutoSearchInterval(null);
    }
    setIsAutoSearching(false);
    setSearchProgress(0);
  };

  // Remove periodic search - users must click the "Scan Nearby Friends" button manually

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Compass className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Discover Friends</h1>
        </div>
        <p className="text-gray-600">
          Find and connect with people nearby using GPS, WiFi, and Bluetooth
          technology
        </p>
      </div>

      {/* Scan Button */}
      <div className="mb-4 flex justify-end">
        {isAutoSearching ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Auto-searching...</span>
                <span className="text-sm text-gray-600">
                  {Math.round(searchProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${searchProgress}%` }}
                ></div>
              </div>
            </div>
            <Button
              onClick={handleStopAutoSearch}
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Stop Search
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleFindNearby}
            variant="default"
            disabled={isLoading}
          >
            {isLoading ? "Searching..." : "Scan Nearby Friends"}
          </Button>
        )}
      </div>

      {/* Discovery Method Toggle */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="w-5 h-5" />
            Discovery Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GPS Toggle */}
            <div
              onClick={() => handleMethodToggle("gps")}
              className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                activeMethod === "gps"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin
                    className={`w-5 h-5 ${
                      activeMethod === "gps" ? "text-blue-600" : "text-gray-600"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      activeMethod === "gps" ? "text-blue-800" : "text-gray-700"
                    }`}
                  >
                    GPS Location
                  </span>
                </div>
                {activeMethod === "gps" ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>

            {/* WiFi Toggle */}
            <div
              onClick={() => handleMethodToggle("wifi")}
              className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                activeMethod === "wifi"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wifi
                    className={`w-5 h-5 ${
                      activeMethod === "wifi"
                        ? "text-green-600"
                        : "text-gray-600"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      activeMethod === "wifi"
                        ? "text-green-800"
                        : "text-gray-700"
                    }`}
                  >
                    WiFi Networks
                  </span>
                </div>
                {activeMethod === "wifi" ? (
                  <ToggleRight className="w-6 h-6 text-green-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>

            {/* Bluetooth Toggle */}
            <div
              onClick={() => handleMethodToggle("bluetooth")}
              className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                activeMethod === "bluetooth"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bluetooth
                    className={`w-5 h-5 ${
                      activeMethod === "bluetooth"
                        ? "text-purple-600"
                        : "text-gray-600"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      activeMethod === "bluetooth"
                        ? "text-purple-800"
                        : "text-gray-700"
                    }`}
                  >
                    Bluetooth
                  </span>
                </div>
                {activeMethod === "bluetooth" ? (
                  <ToggleRight className="w-6 h-6 text-purple-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Mobile App Notice for Bluetooth */}
          {activeMethod === "bluetooth" && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">
                    Mobile App Feature
                  </h4>
                  <p className="text-sm text-blue-700">
                    Real Bluetooth discovery is available in our mobile app.
                    This web version provides a simulation for testing and
                    development purposes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Location Permission Card (only for GPS) */}
          {activeMethod === "gps" && <LocationPermissionCard />}

          {/* WiFi Manager (only for WiFi) */}
          {activeMethod === "wifi" && (
            <WifiManager onWifiUpdated={loadWifiStatus} />
          )}

          {/* Bluetooth Manager (only for Bluetooth) */}
          {activeMethod === "bluetooth" && (
            <BluetoothManager onBluetoothUpdated={loadBluetoothStatus} />
          )}
        </div>

        {/* Right Column - Nearby Users */}
        <div>
          {activeMethod === "gps" ? (
            <NearbyUsersCard />
          ) : activeMethod === "wifi" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-green-600" />
                  WiFi Users ({wifiUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Find Nearby Friends Button */}
                <div className="mb-4">
                  <Button
                    onClick={findWiFiUsers}
                    disabled={!wifiStatus?.hasWiFi || isWifiLoading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                    size="lg"
                  >
                    {isWifiLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Wifi className="h-5 w-5 mr-2" />
                        Find Nearby Friends
                      </>
                    )}
                  </Button>
                  {!wifiStatus?.hasWiFi && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Set your WiFi network in the left panel to enable
                      discovery
                    </p>
                  )}
                </div>

                {!wifiStatus?.hasWiFi ? (
                  <div className="text-center py-8">
                    <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No WiFi network set</p>
                    <p className="text-sm text-gray-400">
                      Set your WiFi network in the left panel to discover nearby
                      users
                    </p>
                  </div>
                ) : isWifiLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
                    <p className="text-gray-500">Searching for WiFi users...</p>
                  </div>
                ) : wifiUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">
                      No users found on your network
                    </p>
                    <p className="text-sm text-gray-400">
                      Click "Find Nearby Friends" to search for users on your
                      WiFi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wifiUsers.map((user) => {
                      const formatLastSeen = (date: Date | string) => {
                        const lastSeen = new Date(date);
                        const now = new Date();
                        const diffInMinutes = Math.floor(
                          (now.getTime() - lastSeen.getTime()) / (1000 * 60)
                        );

                        if (diffInMinutes < 1) return "Just now";
                        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                        if (diffInMinutes < 1440)
                          return `${Math.floor(diffInMinutes / 60)}h ago`;
                        return lastSeen.toLocaleDateString();
                      };

                      // Determine relationship status for FriendRequestButton
                      let relationshipStatus:
                        | "none"
                        | "friends"
                        | "pending"
                        | "received_request" = "none";
                      if (user.isFriend) {
                        relationshipStatus = "friends";
                      } else if (user.hasPendingRequestTo) {
                        relationshipStatus = "pending";
                      } else if (user.hasPendingRequestFrom) {
                        relationshipStatus = "received_request";
                      }

                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={user.profilePicture}
                                alt={user.username}
                              />
                              <AvatarFallback className="bg-green-100 text-green-800">
                                {user.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {user.username}
                                </h3>
                                {user.isFriend && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-100 text-green-800 text-xs"
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
                                    className="bg-blue-100 text-blue-800 text-xs"
                                  >
                                    Sent Request
                                  </Badge>
                                )}
                              </div>
                              {user.bio && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {user.bio}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Wifi className="h-3 w-3" />
                                  <span>
                                    WiFi: {formatLastSeen(user.lastSeenWiFi)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Active: {formatLastSeen(user.lastSeen)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Friend Request Button - handles all relationship states */}
                            <FriendRequestButton
                              targetUserId={user.id}
                              targetUserName={user.username}
                              currentStatus={relationshipStatus}
                              size="sm"
                              onStatusChange={() => {
                                // Refresh the WiFi users list to update relationship status
                                findWiFiUsers();
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
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : activeMethod === "bluetooth" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bluetooth className="w-5 h-5 text-purple-600" />
                  Bluetooth Users ({bluetoothUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Find Nearby Friends Button */}
                <div className="mb-4">
                  <Button
                    onClick={findBluetoothUsers}
                    disabled={
                      !bluetoothStatus?.hasBluetooth || isBluetoothLoading
                    }
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
                    size="lg"
                  >
                    {isBluetoothLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Bluetooth className="h-5 w-5 mr-2" />
                        Find Nearby Friends
                      </>
                    )}
                  </Button>
                  {!bluetoothStatus?.hasBluetooth && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Set your Bluetooth device in the left panel to enable
                      discovery
                    </p>
                  )}
                </div>

                {!bluetoothStatus?.hasBluetooth ? (
                  <div className="text-center py-8">
                    <BluetoothOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">
                      No Bluetooth device set
                    </p>
                    <p className="text-sm text-gray-400">
                      Set your Bluetooth device in the left panel to discover
                      nearby users
                    </p>
                  </div>
                ) : isBluetoothLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                    <p className="text-gray-500">
                      Searching for Bluetooth users...
                    </p>
                  </div>
                ) : bluetoothUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">
                      No users found on your device network
                    </p>
                    <p className="text-sm text-gray-400">
                      Click "Find Nearby Friends" to search for users with
                      compatible Bluetooth devices
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bluetoothUsers.map((user) => {
                      const formatLastSeen = (date: Date | string) => {
                        const lastSeen = new Date(date);
                        const now = new Date();
                        const diffInMinutes = Math.floor(
                          (now.getTime() - lastSeen.getTime()) / (1000 * 60)
                        );

                        if (diffInMinutes < 1) return "Just now";
                        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                        if (diffInMinutes < 1440)
                          return `${Math.floor(diffInMinutes / 60)}h ago`;
                        return lastSeen.toLocaleDateString();
                      };

                      // Determine relationship status for FriendRequestButton
                      let relationshipStatus:
                        | "none"
                        | "friends"
                        | "pending"
                        | "received_request" = "none";
                      if (user.isFriend) {
                        relationshipStatus = "friends";
                      } else if (user.hasPendingRequestTo) {
                        relationshipStatus = "pending";
                      } else if (user.hasPendingRequestFrom) {
                        relationshipStatus = "received_request";
                      }

                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={user.profilePicture}
                                alt={user.username}
                              />
                              <AvatarFallback className="bg-purple-100 text-purple-800">
                                {user.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {user.username}
                                </h3>
                                {user.isFriend && (
                                  <Badge
                                    variant="default"
                                    className="bg-purple-100 text-purple-800 text-xs"
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
                                    className="bg-blue-100 text-blue-800 text-xs"
                                  >
                                    Sent Request
                                  </Badge>
                                )}
                              </div>
                              {user.bio && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {user.bio}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Bluetooth className="h-3 w-3" />
                                  <span>
                                    Bluetooth:{" "}
                                    {formatLastSeen(user.lastSeenBluetooth)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Active: {formatLastSeen(user.lastSeen)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Friend Request Button - handles all relationship states */}
                            <FriendRequestButton
                              targetUserId={user.id}
                              targetUserName={user.username}
                              currentStatus={relationshipStatus}
                              size="sm"
                              onStatusChange={() => {
                                // Refresh the Bluetooth users list to update relationship status
                                findBluetoothUsers();
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
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Nearby Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">
                    Select a discovery method
                  </p>
                  <p className="text-sm text-gray-400">
                    Choose GPS, WiFi, or Bluetooth to find nearby friends
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
