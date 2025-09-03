"use client";

import { useState, useEffect } from "react";
import { wifiService, WifiStatus } from "@/services/wifiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface WifiManagerProps {
  onWifiUpdated?: () => void;
}

export default function WifiManager({ onWifiUpdated }: WifiManagerProps = {}) {
  const [ssid, setSsid] = useState("");
  const [wifiStatus, setWifiStatus] = useState<WifiStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadWifiStatus();
  }, []);

  const loadWifiStatus = async () => {
    try {
      setIsLoading(true);
      const status = await wifiService.getWifiStatus();
      setWifiStatus(status);
    } catch (error) {
      console.error("Failed to load WiFi status:", error);
      toast.error("Failed to load WiFi status");
    } finally {
      setIsLoading(false);
    }
  };

  const updateWifi = async () => {
    if (!ssid.trim()) {
      toast.error("Please enter a WiFi network name");
      return;
    }

    try {
      setIsUpdating(true);
      const result = await wifiService.updateWifi(ssid.trim());

      if (result.success) {
        toast.success(result.message);
        setSsid("");
        // Refresh status with a delay to ensure database consistency
        setTimeout(async () => {
          await loadWifiStatus();
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent("wifiUpdated"));
          // Notify parent component
          if (onWifiUpdated) {
            onWifiUpdated();
          }
        }, 150);
      }
    } catch (error: any) {
      console.error("WiFi update error:", error);
      toast.error(error.message || "Failed to update WiFi network");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateWifi();
    }
  };

  const formatLastSeen = (date: Date | string | undefined) => {
    if (!date) return "Never";
    const lastSeen = new Date(date);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return lastSeen.toLocaleDateString();
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          {wifiStatus?.hasWiFi ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-gray-400" />
          )}
          <span>WiFi Network</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          {wifiStatus?.hasWiFi ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not Set
            </Badge>
          )}
        </div>

        {wifiStatus?.hasWiFi && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Updated:</span>
            <span className="text-sm font-medium">
              {formatLastSeen(wifiStatus.lastSeenWiFi)}
            </span>
          </div>
        )}

        {/* WiFi Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            WiFi Network Name (SSID)
          </label>
          <Input
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your WiFi network name"
            disabled={isUpdating}
            className="w-full h-11"
          />
          <p className="text-xs text-gray-500 leading-relaxed">
            Enter the name of your current WiFi network to discover nearby users
          </p>
        </div>

        {/* Update Button */}
        <Button
          onClick={updateWifi}
          disabled={isUpdating || !ssid.trim()}
          className="w-full h-11 text-base"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Update WiFi Network
            </>
          )}
        </Button>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Privacy Protected</p>
              <p className="leading-relaxed">
                Your WiFi network name is hashed before storage. Only users on
                the same network can discover each other.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
