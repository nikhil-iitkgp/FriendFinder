"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useBluetooth } from "@/hooks/useBluetooth";
import { BluetoothDevice } from "@/services/bluetooth";

export default function BluetoothTestPage() {
  const { data: session, status } = useSession();
  const {
    isAvailable,
    hasPermission,
    isScanning,
    isAdvertising,
    bluetoothId,
    nearbyDevices,
    lastScanResult,
    error,
    requestPermission,
    startScanning,
    stopScanning,
    startAdvertising,
    stopAdvertising,
    findNearbyUsers,
  } = useBluetooth();

  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-start advertising when user is authenticated and has permission
  useEffect(() => {
    if (hasPermission && session?.user && !isAdvertising) {
      startAdvertising();
    }
  }, [hasPermission, session, isAdvertising, startAdvertising]);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      await requestPermission();
    } finally {
      setLoading(false);
    }
  };

  const handleStartScanning = async () => {
    setLoading(true);
    try {
      await startScanning();
    } finally {
      setLoading(false);
    }
  };

  const handleFindNearbyUsers = async () => {
    setLoading(true);
    try {
      const users = await findNearbyUsers();
      setNearbyUsers(users);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600">
            Please sign in to test Bluetooth functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Bluetooth Discovery Test</h1>

        {/* Mobile App Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Mobile App Feature
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Bluetooth discovery is designed for mobile apps. This web
                version provides simulated functionality for testing purposes.
                Real Bluetooth scanning and advertising will be available in the
                native mobile application.
              </p>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700">Availability</h3>
            <div className="flex items-center mt-2">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  isAvailable ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm">
                {isAvailable ? "Available" : "Not Available"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700">Permission</h3>
            <div className="flex items-center mt-2">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  hasPermission ? "bg-green-500" : "bg-yellow-500"
                }`}
              ></div>
              <span className="text-sm">
                {hasPermission ? "Granted" : "Pending"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700">Scanning</h3>
            <div className="flex items-center mt-2">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  isScanning ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-sm">
                {isScanning ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-700">Advertising</h3>
            <div className="flex items-center mt-2">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  isAdvertising ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-sm">
                {isAdvertising ? "Broadcasting" : "Silent"}
              </span>
            </div>
          </div>
        </div>

        {/* Bluetooth ID */}
        {bluetoothId && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">
              Device Bluetooth ID
            </h3>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {bluetoothId}
            </code>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Bluetooth Controls</h3>

          <div className="space-y-4">
            {!hasPermission && (
              <button
                onClick={handleRequestPermission}
                disabled={loading || !isAvailable}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Requesting..." : "Request Bluetooth Permission"}
              </button>
            )}

            <div className="flex flex-wrap gap-4">
              <button
                onClick={isScanning ? stopScanning : handleStartScanning}
                disabled={loading || !hasPermission}
                className={`px-4 py-2 rounded-lg ${
                  isScanning
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {loading
                  ? "Loading..."
                  : isScanning
                  ? "Stop Scanning"
                  : "Start Scanning"}
              </button>

              <button
                onClick={isAdvertising ? stopAdvertising : startAdvertising}
                disabled={loading || !hasPermission}
                className={`px-4 py-2 rounded-lg ${
                  isAdvertising
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {loading
                  ? "Loading..."
                  : isAdvertising
                  ? "Stop Advertising"
                  : "Start Advertising"}
              </button>

              <button
                onClick={handleFindNearbyUsers}
                disabled={loading || !hasPermission}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Searching..." : "Find Nearby Users"}
              </button>
            </div>
          </div>
        </div>

        {/* Scan Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mock Bluetooth Devices */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Mock Bluetooth Devices</h3>
              <p className="text-sm text-gray-600">
                Simulated nearby Bluetooth devices
              </p>
            </div>
            <div className="p-4">
              {nearbyDevices.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {isScanning
                    ? "Scanning for devices..."
                    : "No devices found. Start scanning to discover nearby devices."}
                </p>
              ) : (
                <div className="space-y-3">
                  {nearbyDevices.map((device: BluetoothDevice) => (
                    <div key={device.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-500">
                          {device.distance}m
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        ID: {device.id}
                      </div>
                      {device.rssi && (
                        <div className="text-xs text-gray-600">
                          Signal: {device.rssi} dBm
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Last seen: {device.lastSeen.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FriendFinder Users */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Nearby FriendFinder Users</h3>
              <p className="text-sm text-gray-600">
                Users discovered via Bluetooth
              </p>
            </div>
            <div className="p-4">
              {nearbyUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No FriendFinder users found nearby. Click "Find Nearby Users"
                  to search.
                </p>
              ) : (
                <div className="space-y-3">
                  {nearbyUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">
                          {user.distance}m
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Bluetooth Discovery
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Signal Strength: {user.bluetoothSignalStrength}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Range: {user.estimatedRange}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-6 bg-yellow-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Testing Instructions</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • Click "Request Bluetooth Permission" to simulate permission
              request
            </li>
            <li>
              • Use "Start Scanning" to discover mock Bluetooth devices nearby
            </li>
            <li>
              • "Start Advertising" makes your device discoverable to others
            </li>
            <li>
              • "Find Nearby Users" searches for FriendFinder users via
              Bluetooth
            </li>
            <li>
              • Check the browser console for detailed Bluetooth service logs
            </li>
            <li>
              • Note: This is a simulation - real Bluetooth functionality
              requires a mobile app
            </li>
          </ul>
        </div>

        {/* Last Scan Result */}
        {lastScanResult && (
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">Last Scan Result</h3>
            <div className="text-sm text-gray-600">
              <p>Duration: {lastScanResult.scanDuration}ms</p>
              <p>Devices Found: {lastScanResult.devices.length}</p>
              <p>Success: {lastScanResult.success ? "Yes" : "No"}</p>
              {lastScanResult.error && <p>Error: {lastScanResult.error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
