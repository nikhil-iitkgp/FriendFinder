"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "@/context/LocationContext";
import {
  MapPin,
  Shield,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Radar,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LocationPermissionCard() {
  const {
    isLocationEnabled,
    locationError,
    permissionStatus,
    currentLocation,
    isDiscoveryEnabled,
    requestLocationPermission,
    getCurrentLocation,
    toggleLocationSharing,
  } = useLocation();

  const [isRequesting, setIsRequesting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await requestLocationPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      await getCurrentLocation();
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleToggleSharing = async () => {
    setIsToggling(true);
    try {
      await toggleLocationSharing();
    } finally {
      setIsToggling(false);
    }
  };

  const getPermissionStatusInfo = () => {
    switch (permissionStatus) {
      case "granted":
        return {
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
          text: "Granted",
        };
      case "denied":
        return {
          color: "bg-red-100 text-red-800",
          icon: AlertCircle,
          text: "Denied",
        };
      case "prompt":
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: AlertCircle,
          text: "Needs Permission",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: AlertCircle,
          text: "Unknown",
        };
    }
  };

  const statusInfo = getPermissionStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Location Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Permission Status:</span>
          <Badge className={statusInfo.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.text}
          </Badge>
        </div>

        {/* Current Location */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Location:</span>
          <div className="text-sm text-gray-600">
            {currentLocation ? (
              <div className="text-right">
                <div>
                  {currentLocation.latitude.toFixed(6)},{" "}
                  {currentLocation.longitude.toFixed(6)}
                </div>
                {currentLocation.accuracy && (
                  <div className="text-xs text-gray-500">
                    ±{Math.round(currentLocation.accuracy)}m accuracy
                  </div>
                )}
              </div>
            ) : (
              "Not available"
            )}
          </div>
        </div>

        {/* Discovery Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Discovery:</span>
          <Badge
            className={
              isDiscoveryEnabled
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            }
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

        {/* Error Alert */}
        {locationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{locationError}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {isLocationEnabled && currentLocation && !locationError && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Location services are active and working properly.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {!isLocationEnabled && (
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Requesting Permission...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Enable Location Services
                </>
              )}
            </Button>
          )}

          {isLocationEnabled && (
            <>
              <Button
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                variant="outline"
                className="w-full"
              >
                {isGettingLocation ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <Radar className="w-4 h-4 mr-2" />
                    Update Current Location
                  </>
                )}
              </Button>

              <Button
                onClick={handleToggleSharing}
                disabled={isToggling}
                variant={isDiscoveryEnabled ? "outline" : "default"}
                className="w-full"
              >
                {isToggling ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : isDiscoveryEnabled ? (
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
            </>
          )}
        </div>

        {/* Info Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Location services help you discover nearby friends</p>
          <p>
            • Your location is only shared with friends when discovery is
            enabled
          </p>
          <p>
            • You can disable discovery at any time while keeping location
            services active
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
