"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "@/context/LocationContext";
import geolocationService from "@/lib/geolocation";
import {
  MapPin,
  Radar,
  Users,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LocationTestPage() {
  const {
    currentLocation,
    isLocationEnabled,
    locationError,
    permissionStatus,
    nearbyUsers,
    isLoadingNearby,
    discoveryRadius,
    isDiscoveryEnabled,
    requestLocationPermission,
    getCurrentLocation,
    findNearbyUsers,
    toggleLocationSharing,
    setDiscoveryRadius,
  } = useLocation();

  const [testLatitude, setTestLatitude] = useState("");
  const [testLongitude, setTestLongitude] = useState("");
  const [testRadius, setTestRadius] = useState(1000);

  // Auto-populate test coordinates when real location is available
  useEffect(() => {
    if (currentLocation) {
      setTestLatitude(currentLocation.latitude.toString());
      setTestLongitude(currentLocation.longitude.toString());
    }
  }, [currentLocation]);

  const handleTestNearbySearch = async () => {
    if (!testLatitude || !testLongitude) return;

    try {
      const response = await fetch("/api/users/nearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: parseFloat(testLatitude),
          longitude: parseFloat(testLongitude),
          radius: testRadius,
        }),
      });

      if (response.ok) {
        const users = await response.json();
        console.log("Nearby users:", users);
      } else {
        console.error("Failed to fetch nearby users:", await response.text());
      }
    } catch (error) {
      console.error("Error testing nearby search:", error);
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case "granted":
        return "bg-green-100 text-green-800";
      case "denied":
        return "bg-red-100 text-red-800";
      case "prompt":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Geolocation Testing</h1>
        <p className="text-gray-600">
          Test GPS-based friend discovery and location services
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Location Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Permission:</span>
                <Badge className={`ml-2 ${getPermissionStatusColor()}`}>
                  {permissionStatus || "Unknown"}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Enabled:</span>
                <Badge
                  className={`ml-2 ${
                    isLocationEnabled
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {isLocationEnabled ? "Yes" : "No"}
                </Badge>
              </div>
            </div>

            {currentLocation && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Current Location</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Latitude:</span>{" "}
                    {currentLocation.latitude.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-medium">Longitude:</span>{" "}
                    {currentLocation.longitude.toFixed(6)}
                  </div>
                  {currentLocation.accuracy && (
                    <div>
                      <span className="font-medium">Accuracy:</span> ±
                      {Math.round(currentLocation.accuracy)}m
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Timestamp:</span>{" "}
                    {new Date(currentLocation.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {locationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{locationError}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {!isLocationEnabled && (
                <Button onClick={requestLocationPermission} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Request Location Permission
                </Button>
              )}

              {isLocationEnabled && (
                <Button
                  onClick={getCurrentLocation}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Current Location
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discovery Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Discovery Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Discovery Status:</span>
              <Badge
                className={`${
                  isDiscoveryEnabled
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isDiscoveryEnabled ? (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Disabled
                  </>
                )}
              </Badge>
            </div>

            <div>
              <Label htmlFor="radius">
                Discovery Radius:{" "}
                {geolocationService.formatDistance(discoveryRadius)}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="radius"
                  type="number"
                  value={discoveryRadius}
                  onChange={(e) => setDiscoveryRadius(Number(e.target.value))}
                  min="100"
                  max="10000"
                  step="100"
                />
                <span className="text-sm text-gray-500 flex items-center">
                  meters
                </span>
              </div>
            </div>

            <Button
              onClick={toggleLocationSharing}
              variant={isDiscoveryEnabled ? "destructive" : "default"}
              className="w-full"
            >
              {isDiscoveryEnabled ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Disable Discovery
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Enable Discovery
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Manual Testing */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="w-5 h-5" />
            Manual Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="testLat">Test Latitude</Label>
              <Input
                id="testLat"
                value={testLatitude}
                onChange={(e) => setTestLatitude(e.target.value)}
                placeholder="e.g., 40.7128"
              />
            </div>
            <div>
              <Label htmlFor="testLng">Test Longitude</Label>
              <Input
                id="testLng"
                value={testLongitude}
                onChange={(e) => setTestLongitude(e.target.value)}
                placeholder="e.g., -74.0060"
              />
            </div>
            <div>
              <Label htmlFor="testRadius">Search Radius (m)</Label>
              <Input
                id="testRadius"
                type="number"
                value={testRadius}
                onChange={(e) => setTestRadius(Number(e.target.value))}
                min="100"
                max="10000"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTestNearbySearch}
              disabled={!testLatitude || !testLongitude}
            >
              Test Nearby Search
            </Button>
            <Button
              onClick={() => findNearbyUsers()}
              disabled={!currentLocation}
            >
              <Users className="w-4 h-4 mr-2" />
              Find Real Nearby Users
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Users Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Nearby Users
            <Badge variant="secondary">{nearbyUsers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingNearby ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Searching for nearby users...</span>
            </div>
          ) : nearbyUsers.length > 0 ? (
            <div className="space-y-3">
              {nearbyUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{user.name}</h4>
                    <p className="text-sm text-gray-500">
                      {geolocationService.formatDistance(user.distance)} away •
                      Last seen: {new Date(user.lastSeen).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{user.discoveryMethod}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No nearby users found</p>
              <p className="text-sm">
                Try adjusting your search radius or location
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <span>
                Click "Request Location Permission" and allow access when
                prompted
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <span>
                Your current coordinates will appear in the manual testing
                fields
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">3.</span>
              <span>Enable discovery to allow others to find you</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">4.</span>
              <span>
                Use "Find Real Nearby Users" to search for actual users in your
                area
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">5.</span>
              <span>
                Test with different coordinates to simulate different locations
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> For testing with multiple users, open the
              app in different browser windows and create multiple accounts with
              different locations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
