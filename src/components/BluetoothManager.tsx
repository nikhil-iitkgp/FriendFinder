"use client";

import { useState, useEffect } from "react";
import { bluetoothService, BluetoothStatus } from "@/services/bluetoothService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bluetooth,
  BluetoothOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface BluetoothManagerProps {
  onBluetoothUpdated?: () => void;
}

export default function BluetoothManager({
  onBluetoothUpdated,
}: BluetoothManagerProps = {}) {
  const [bluetoothId, setBluetoothId] = useState("");
  const [bluetoothStatus, setBluetoothStatus] =
    useState<BluetoothStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadBluetoothStatus();
  }, []);

  const loadBluetoothStatus = async () => {
    try {
      setIsLoading(true);
      const status = await bluetoothService.getBluetoothStatus();
      setBluetoothStatus(status);
    } catch (error) {
      console.error("Failed to load Bluetooth status:", error);
      toast.error("Failed to load Bluetooth status");
    } finally {
      setIsLoading(false);
    }
  };

  const updateBluetooth = async () => {
    if (!bluetoothId.trim()) {
      toast.error("Please enter a Bluetooth device ID");
      return;
    }

    try {
      setIsUpdating(true);
      const result = await bluetoothService.updateBluetooth(bluetoothId.trim());

      if (result.success) {
        toast.success(result.message);
        setBluetoothId("");
        // Refresh status with a delay to ensure database consistency
        setTimeout(async () => {
          await loadBluetoothStatus();
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent("bluetoothUpdated"));
          // Notify parent component
          if (onBluetoothUpdated) {
            onBluetoothUpdated();
          }
        }, 150);
      }
    } catch (error: any) {
      console.error("Bluetooth update error:", error);
      toast.error(error.message || "Failed to update Bluetooth device");
    } finally {
      setIsUpdating(false);
    }
  };

  const clearBluetooth = async () => {
    try {
      setIsUpdating(true);
      const result = await bluetoothService.clearBluetooth();

      if (result.success) {
        toast.success(result.message);
        setBluetoothId("");
        // Refresh status with a delay to ensure database consistency
        setTimeout(async () => {
          await loadBluetoothStatus();
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent("bluetoothUpdated"));
          // Notify parent component
          if (onBluetoothUpdated) {
            onBluetoothUpdated();
          }
        }, 150);
      }
    } catch (error: any) {
      console.error("Bluetooth clear error:", error);
      toast.error(error.message || "Failed to clear Bluetooth device");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateBluetooth();
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
        <CardTitle className="flex items-center space-x-2 text-lg">
          {bluetoothStatus?.hasBluetooth ? (
            <Bluetooth className="h-5 w-5 text-purple-600" />
          ) : (
            <BluetoothOff className="h-5 w-5 text-gray-400" />
          )}
          <span>Bluetooth Device</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          {bluetoothStatus?.hasBluetooth ? (
            <Badge variant="default" className="bg-purple-100 text-purple-800">
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

        {bluetoothStatus?.hasBluetooth && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Updated:</span>
            <span className="text-sm font-medium">
              {formatLastSeen(bluetoothStatus.lastSeenBluetooth)}
            </span>
          </div>
        )}

        {/* Bluetooth Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Bluetooth Device ID
          </label>
          <Input
            value={bluetoothId}
            onChange={(e) => setBluetoothId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your Bluetooth device identifier"
            disabled={isUpdating}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Enter a unique identifier for your Bluetooth device to discover
            nearby users
          </p>
        </div>

        {/* Update Button */}
        <Button
          onClick={updateBluetooth}
          disabled={isUpdating || !bluetoothId.trim()}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Bluetooth className="h-4 w-4 mr-2" />
              Update Bluetooth Device
            </>
          )}
        </Button>

        {/* Clear Button - only show when Bluetooth is set */}
        {bluetoothStatus?.hasBluetooth && (
          <Button
            onClick={clearBluetooth}
            disabled={isUpdating}
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <BluetoothOff className="h-4 w-4 mr-2" />
                Clear Bluetooth Device
              </>
            )}
          </Button>
        )}

        {/* Privacy Notice */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-purple-800">
              <p className="font-medium mb-1">Privacy Protected</p>
              <p>
                Your Bluetooth device ID is stored securely. Only users with
                compatible devices can discover each other.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
