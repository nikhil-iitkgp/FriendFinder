"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Settings,
  Bell,
  Shield,
  MapPin,
  Eye,
  Moon,
  Sun,
  Smartphone,
  Volume2,
  Vibrate,
  Globe,
  Lock,
  Trash2,
  Save,
  X,
  RefreshCw,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, refreshUser, updateUserProfile, updateDiscoverySettings } =
    useAuth();

  // User preferences hook for persistent settings
  const {
    preferences,
    updateDiscovery,
    isLoading: preferencesLoading,
  } = useUserPreferences();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<Record<string, any>>({});

  // Settings state
  const [settings, setSettings] = useState({
    pushNotifications: false,
    emailNotifications: false,
    friendRequests: true,
    newMessages: true,
    nearbyFriends: true,
    profileVisibility: "friends",
    discoveryMode: false,
    locationSharing: false,
    readReceipts: true,
    twoFactorAuth: false,
    discoveryRange: 100,
    gpsDiscovery: false, // Will be updated from preferences
    wifiDiscovery: false, // Will be updated from preferences
    bluetoothDiscovery: false, // Will be updated from preferences
    soundEnabled: true,
    vibrationEnabled: true,
    language: "English",
  });

  // Load user settings when component mounts
  useEffect(() => {
    if (user) {
      setSettings((prevSettings) => ({
        ...prevSettings,
        discoveryMode: user.isDiscoveryEnabled || false,
        discoveryRange: user.discoveryRange || 100,
        locationSharing: !!user.location,
      }));
    }
  }, [user]);

  // Sync discovery method settings with preferences
  useEffect(() => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      gpsDiscovery: preferences.discovery.methods.gps,
      wifiDiscovery: preferences.discovery.methods.wifi,
      bluetoothDiscovery: preferences.discovery.methods.bluetooth,
    }));
  }, [preferences.discovery.methods]);

  const handleFieldEdit = (field: string) => {
    setEditingField(field);
    setTempValues({
      ...tempValues,
      [field]: settings[field as keyof typeof settings],
    });
  };

  const handleFieldSave = async (field: string) => {
    setIsLoading(true);
    try {
      const value = tempValues[field];

      // Update different types of settings based on field
      if (["discoveryMode", "discoveryRange"].includes(field)) {
        const updateData: any = {};
        if (field === "discoveryMode") {
          updateData.isDiscoveryEnabled = value;
        } else if (field === "discoveryRange") {
          updateData.discoveryRange = value;
        }

        const result = await updateDiscoverySettings(updateData);
        if (!result.success) {
          throw new Error(result.error || `Failed to update ${field}`);
        }
      } else {
        // Handle other settings (could be extended with more API calls)
        setSettings((prev) => ({ ...prev, [field]: value }));
      }

      setEditingField(null);
      setTempValues({});
      toast.success(
        `${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} updated successfully!`
      );

      if (["discoveryMode", "discoveryRange"].includes(field)) {
        await refreshUser();
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(
        error instanceof Error ? error.message : `Failed to update ${field}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldCancel = (field: string) => {
    setEditingField(null);
    setTempValues((prev) => {
      const newValues = { ...prev };
      delete newValues[field];
      return newValues;
    });
  };

  const handleToggle = async (field: string) => {
    const newValue = !settings[field as keyof typeof settings];
    setIsLoading(true);

    try {
      if (["discoveryMode"].includes(field)) {
        const result = await updateDiscoverySettings({
          isDiscoveryEnabled: newValue,
        });
        if (!result.success) {
          throw new Error(result.error || `Failed to update ${field}`);
        }
        await refreshUser();
      } else if (
        ["gpsDiscovery", "wifiDiscovery", "bluetoothDiscovery"].includes(field)
      ) {
        // Handle discovery method toggles using updateDiscovery
        const methodMap = {
          gpsDiscovery: "gps",
          wifiDiscovery: "wifi",
          bluetoothDiscovery: "bluetooth",
        };

        const methodKey = methodMap[field as keyof typeof methodMap];
        const result = await updateDiscovery({
          methods: {
            ...preferences.discovery.methods,
            [methodKey]: newValue,
          },
        });

        if (!result.success) {
          throw new Error(result.error || `Failed to update ${field}`);
        }
      } else {
        // Handle other toggles
        setSettings((prev) => ({ ...prev, [field]: newValue }));
      }

      toast.success(
        `${field.replace(/([A-Z])/g, " $1").toLowerCase()} ${
          newValue ? "enabled" : "disabled"
        }`
      );
    } catch (error) {
      console.error(`Error toggling ${field}:`, error);
      toast.error(
        error instanceof Error ? error.message : `Failed to update ${field}`
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Manage your account preferences and privacy settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Push Notifications</h3>
                  <p className="text-sm text-gray-600">
                    Receive notifications on your device
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={() => handleToggle("pushNotifications")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={
                      settings.pushNotifications ? "default" : "secondary"
                    }
                    className={
                      settings.pushNotifications
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.pushNotifications ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-600">Get updates via email</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={() => handleToggle("emailNotifications")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={
                      settings.emailNotifications ? "default" : "secondary"
                    }
                    className={
                      settings.emailNotifications
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.emailNotifications ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Friend Requests</h3>
                  <p className="text-sm text-gray-600">
                    Notify when someone sends a friend request
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.friendRequests}
                    onCheckedChange={() => handleToggle("friendRequests")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={settings.friendRequests ? "default" : "secondary"}
                    className={
                      settings.friendRequests
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.friendRequests ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">New Messages</h3>
                  <p className="text-sm text-gray-600">
                    Notify when you receive new messages
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.newMessages}
                    onCheckedChange={() => handleToggle("newMessages")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={settings.newMessages ? "default" : "secondary"}
                    className={
                      settings.newMessages
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.newMessages ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Nearby Friends</h3>
                  <p className="text-sm text-gray-600">
                    Notify when friends are discovered nearby
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.nearbyFriends}
                    onCheckedChange={() => handleToggle("nearbyFriends")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={settings.nearbyFriends ? "default" : "secondary"}
                    className={
                      settings.nearbyFriends
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.nearbyFriends ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Profile Visibility</h3>
                  <p className="text-sm text-gray-600">
                    Who can see your profile information
                  </p>
                </div>
                {editingField === "profileVisibility" ? (
                  <div className="flex items-center space-x-2">
                    <select
                      value={tempValues.profileVisibility || "friends"}
                      onChange={(e) =>
                        setTempValues((prev) => ({
                          ...prev,
                          profileVisibility: e.target.value,
                        }))
                      }
                      className="text-sm border rounded px-2 py-1"
                      aria-label="Profile visibility setting"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={() => handleFieldSave("profileVisibility")}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFieldCancel("profileVisibility")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {settings.profileVisibility === "friends"
                        ? "Friends Only"
                        : settings.profileVisibility === "everyone"
                        ? "Everyone"
                        : "Private"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleFieldEdit("profileVisibility")}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Discovery Mode</h3>
                  <p className="text-sm text-gray-600">
                    Allow others to find you through discovery
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.discoveryMode}
                    onCheckedChange={() => handleToggle("discoveryMode")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={settings.discoveryMode ? "default" : "secondary"}
                    className={
                      settings.discoveryMode
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.discoveryMode ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Location Sharing</h3>
                  <p className="text-sm text-gray-600">
                    Share your location for friend discovery
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.locationSharing}
                    onCheckedChange={() => handleToggle("locationSharing")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={settings.locationSharing ? "default" : "secondary"}
                    className={
                      settings.locationSharing
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.locationSharing ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Read Receipts</h3>
                  <p className="text-sm text-gray-600">
                    Let others know when you've read their messages
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.readReceipts}
                    onCheckedChange={() => handleToggle("readReceipts")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={settings.readReceipts ? "default" : "secondary"}
                    className={
                      settings.readReceipts
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.readReceipts ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600">
                    Add extra security to your account
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={settings.twoFactorAuth ? "default" : "secondary"}
                    className={
                      settings.twoFactorAuth
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    {settings.twoFactorAuth ? "Enabled" : "Not Setup"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.info("Two-factor authentication setup coming soon!")
                    }
                  >
                    {settings.twoFactorAuth ? "Manage" : "Setup"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discovery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Discovery Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="discovery-range">
                  Discovery Range (meters)
                </Label>
                {editingField === "discoveryRange" ? (
                  <div className="mt-2 flex items-center space-x-2">
                    <Input
                      type="number"
                      value={tempValues.discoveryRange || 100}
                      onChange={(e) =>
                        setTempValues((prev) => ({
                          ...prev,
                          discoveryRange: parseInt(e.target.value) || 100,
                        }))
                      }
                      min={10}
                      max={10000}
                      step={10}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">
                      meters (10-10000m)
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleFieldSave("discoveryRange")}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFieldCancel("discoveryRange")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-sm font-medium">
                      {settings.discoveryRange}m
                    </span>
                    <span className="text-sm text-gray-600">
                      How far others can discover you
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleFieldEdit("discoveryRange")}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">GPS Discovery</h3>
                  <p className="text-sm text-gray-600">
                    Use GPS coordinates for location-based discovery
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.gpsDiscovery}
                    onCheckedChange={() => handleToggle("gpsDiscovery")}
                    disabled={isLoading || preferencesLoading}
                  />
                  <Badge
                    variant={settings.gpsDiscovery ? "default" : "secondary"}
                    className={
                      settings.gpsDiscovery
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.gpsDiscovery ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">WiFi Discovery</h3>
                  <p className="text-sm text-gray-600">
                    Find friends on the same WiFi network
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.wifiDiscovery}
                    onCheckedChange={() => handleToggle("wifiDiscovery")}
                    disabled={isLoading || preferencesLoading}
                  />
                  <Badge
                    variant={settings.wifiDiscovery ? "default" : "secondary"}
                    className={
                      settings.wifiDiscovery
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.wifiDiscovery ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Bluetooth Discovery</h3>
                  <p className="text-sm text-gray-600">
                    Discover nearby friends via Bluetooth
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.bluetoothDiscovery}
                    onCheckedChange={() => handleToggle("bluetoothDiscovery")}
                    disabled={isLoading || preferencesLoading}
                  />
                  <Badge
                    variant={
                      settings.bluetoothDiscovery ? "default" : "secondary"
                    }
                    className={
                      settings.bluetoothDiscovery
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.bluetoothDiscovery ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>Account Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Change Password</h3>
                  <p className="text-sm text-gray-600">
                    Update your account password
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.info("Password change functionality coming soon!")
                  }
                >
                  Change
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Download Data</h3>
                  <p className="text-sm text-gray-600">
                    Export your personal data
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.info("Preparing data export...");
                    // TODO: Implement data export functionality
                  }}
                >
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-600">Delete Account</h3>
                  <p className="text-sm text-gray-600">
                    Permanently delete your account and data
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete your account? This action cannot be undone."
                      )
                    ) {
                      toast.error(
                        "Account deletion functionality is temporarily disabled for safety."
                      );
                      // TODO: Implement account deletion with proper safeguards
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <span className="text-sm">Theme</span>
                </div>
                <ThemeToggle />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm">Sound</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={() => handleToggle("soundEnabled")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={settings.soundEnabled ? "default" : "secondary"}
                    className={
                      settings.soundEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.soundEnabled ? "On" : "Off"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Vibrate className="h-4 w-4" />
                  <span className="text-sm">Vibration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.vibrationEnabled}
                    onCheckedChange={() => handleToggle("vibrationEnabled")}
                    disabled={isLoading}
                  />
                  <Badge
                    variant={
                      settings.vibrationEnabled ? "default" : "secondary"
                    }
                    className={
                      settings.vibrationEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {settings.vibrationEnabled ? "On" : "Off"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Language</span>
                </div>
                {editingField === "language" ? (
                  <div className="flex items-center space-x-2">
                    <select
                      value={tempValues.language || "English"}
                      onChange={(e) =>
                        setTempValues((prev) => ({
                          ...prev,
                          language: e.target.value,
                        }))
                      }
                      className="text-sm border rounded px-2 py-1"
                      aria-label="Language setting"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Español</option>
                      <option value="French">Français</option>
                      <option value="German">Deutsch</option>
                      <option value="Japanese">日本語</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={() => handleFieldSave("language")}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFieldCancel("language")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {settings.language}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleFieldEdit("language")}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardHeader>
              <CardTitle>App Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Build</span>
                <span className="text-sm font-medium">2025.1.1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Platform</span>
                <span className="text-sm font-medium">Web</span>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle>Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.open("/help", "_blank");
                  toast.info("Opening help center...");
                }}
              >
                Help Center
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href =
                    "mailto:support@friendfinder.com?subject=Support Request";
                  toast.info("Opening email client...");
                }}
              >
                Contact Support
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href =
                    "mailto:bugs@friendfinder.com?subject=Bug Report";
                  toast.info("Opening email client for bug report...");
                }}
              >
                Report a Bug
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.open("/privacy", "_blank");
                  toast.info("Opening privacy policy...");
                }}
              >
                Privacy Policy
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.open("/terms", "_blank");
                  toast.info("Opening terms of service...");
                }}
              >
                Terms of Service
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
