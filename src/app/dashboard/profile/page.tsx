"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuth } from "@/context/AuthContext";
import { useFriends } from "@/context/FriendsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Edit,
  MapPin,
  Calendar,
  Mail,
  Shield,
  Camera,
  Eye,
  EyeOff,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { user, refreshUser, updateUserProfile, updateDiscoverySettings } =
    useAuth();
  const { friends } = useFriends();

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    isDiscoveryEnabled: false,
    discoveryRange: 1000,
  });

  // Temporary field values for inline editing
  const [tempValues, setTempValues] = useState<Record<string, any>>({});

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        bio: user.bio || "",
        isDiscoveryEnabled: user.isDiscoveryEnabled || false,
        discoveryRange: user.discoveryRange || 1000,
      });
    }
  }, [user]);

  const displayName = user?.username || session?.user?.name || "User";
  const userEmail = user?.email || session?.user?.email;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Update profile information
      const profileResult = await updateUserProfile({
        username: formData.username,
        bio: formData.bio,
      });

      if (!profileResult.success) {
        throw new Error(profileResult.error || "Failed to update profile");
      }

      // Update discovery settings
      const discoveryResult = await updateDiscoverySettings({
        isDiscoveryEnabled: formData.isDiscoveryEnabled,
        discoveryRange: formData.discoveryRange,
      });

      if (!discoveryResult.success) {
        throw new Error(
          discoveryResult.error || "Failed to update discovery settings"
        );
      }

      toast.success("Profile updated successfully!");
      setIsEditing(false);

      // Refresh user data
      await refreshUser();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldEdit = (field: string) => {
    setEditingField(field);
    setTempValues({
      ...tempValues,
      [field]:
        (user as any)?.[field] ||
        formData[field as keyof typeof formData] ||
        "",
    });
  };

  const handleFieldSave = async (field: string) => {
    setIsLoading(true);
    try {
      const updateData = { [field]: tempValues[field] };

      if (field === "isDiscoveryEnabled" || field === "discoveryRange") {
        const result = await updateDiscoverySettings(updateData);
        if (!result.success) {
          throw new Error(result.error || `Failed to update ${field}`);
        }
      } else {
        const result = await updateUserProfile(updateData);
        if (!result.success) {
          throw new Error(result.error || `Failed to update ${field}`);
        }
      }

      setFormData((prev) => ({ ...prev, [field]: tempValues[field] }));
      setEditingField(null);
      setTempValues({});
      toast.success(
        `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } updated successfully!`
      );
      await refreshUser();
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

  const handleCancel = () => {
    // Reset form data to original values
    if (user) {
      setFormData({
        username: user.username || "",
        bio: user.bio || "",
        isDiscoveryEnabled: user.isDiscoveryEnabled || false,
        discoveryRange: user.discoveryRange || 1000,
      });
    }
    setIsEditing(false);
    setEditingField(null);
    setTempValues({});
  };

  const toggleDiscovery = async () => {
    if (isEditing) {
      // If editing, just update form state
      setFormData((prev) => ({
        ...prev,
        isDiscoveryEnabled: !prev.isDiscoveryEnabled,
      }));
    } else {
      // If not editing, update immediately
      setIsLoading(true);
      try {
        const result = await updateDiscoverySettings({
          isDiscoveryEnabled: !user?.isDiscoveryEnabled,
        });

        if (result.success) {
          toast.success(
            user?.isDiscoveryEnabled
              ? "Discovery disabled"
              : "Discovery enabled"
          );
          await refreshUser();
        } else {
          toast.error(result.error || "Failed to update discovery settings");
        }
      } catch (error) {
        toast.error("Failed to update discovery settings");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">
            Manage your personal information and privacy settings
          </p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={session?.user?.image || undefined}
                      alt={displayName}
                    />
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl">
                      {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Display Name
                    </label>
                    {editingField === "username" ? (
                      <div className="mt-1 flex items-center space-x-2">
                        <Input
                          value={tempValues.username || ""}
                          onChange={(e) =>
                            setTempValues((prev) => ({
                              ...prev,
                              username: e.target.value,
                            }))
                          }
                          className="flex-1"
                          placeholder="Enter display name"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleFieldSave("username")}
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
                          onClick={() => handleFieldCancel("username")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-lg font-medium">{displayName}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFieldEdit("username")}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Bio
                    </label>
                    {editingField === "bio" ? (
                      <div className="mt-1 space-y-2">
                        <Textarea
                          value={tempValues.bio || ""}
                          onChange={(e) =>
                            setTempValues((prev) => ({
                              ...prev,
                              bio: e.target.value,
                            }))
                          }
                          placeholder="Tell others about yourself..."
                          rows={3}
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {(tempValues.bio || "").length}/500 characters
                          </span>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleFieldSave("bio")}
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
                              onClick={() => handleFieldCancel("bio")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-start justify-between">
                        <p className="text-gray-600 flex-1">
                          {user?.bio ||
                            "Add a bio to tell others about yourself..."}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFieldEdit("bio")}
                          className="ml-2 flex-shrink-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <p className="mt-1 flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{userEmail}</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Discovery</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Discovery Mode</h3>
                  <p className="text-sm text-gray-600">
                    Allow others to find you through discovery features
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {editingField === "isDiscoveryEnabled" ? (
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={tempValues.isDiscoveryEnabled ?? false}
                        onCheckedChange={(checked) =>
                          setTempValues((prev) => ({
                            ...prev,
                            isDiscoveryEnabled: checked,
                          }))
                        }
                        disabled={isLoading}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleFieldSave("isDiscoveryEnabled")}
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
                        onClick={() => handleFieldCancel("isDiscoveryEnabled")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Badge
                        variant={
                          user?.isDiscoveryEnabled ? "default" : "secondary"
                        }
                        className={
                          user?.isDiscoveryEnabled
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {user?.isDiscoveryEnabled ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Disabled
                          </>
                        )}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFieldEdit("isDiscoveryEnabled")}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Edit className="h-3 w-3" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Location Sharing</h3>
                  <p className="text-sm text-gray-600">
                    Share your approximate location for discovery
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={user?.location ? "default" : "secondary"}
                    className={
                      user?.location
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {user?.location ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      (window.location.href = "/dashboard/discover")
                    }
                  >
                    Configure
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Discovery Range</h3>
                  <p className="text-sm text-gray-600">
                    How far others can discover you (in meters)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {editingField === "discoveryRange" ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={tempValues.discoveryRange || 1000}
                        onChange={(e) =>
                          setTempValues((prev) => ({
                            ...prev,
                            discoveryRange: parseInt(e.target.value) || 1000,
                          }))
                        }
                        min={100}
                        max={10000}
                        step={100}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">meters</span>
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
                    <>
                      <span className="text-sm font-medium">
                        {user?.discoveryRange || 1000}m
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFieldEdit("discoveryRange")}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Account Type</h3>
                  <p className="text-sm text-gray-600">
                    Free account with basic features
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Upgrade
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600">
                    Add an extra layer of security
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-700"
                  >
                    Not Enabled
                  </Badge>
                  <Button size="sm" variant="outline">
                    Setup
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Data Export</h3>
                  <p className="text-sm text-gray-600">
                    Download a copy of your data
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Deactivate Account</h3>
                  <p className="text-sm text-gray-600">
                    Temporarily disable your account
                  </p>
                </div>
                <Button size="sm" variant="destructive">
                  Deactivate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Friends</span>
                <span className="font-medium">{friends.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Profile Views</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connections Made</span>
                <span className="font-medium">{friends.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="font-medium text-xs">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "Today"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // TODO: Implement photo upload
                  toast.info("Photo upload feature coming soon!");
                }}
              >
                <Camera className="mr-2 h-4 w-4" />
                Change Photo
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleFieldEdit("bio")}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Bio
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleFieldEdit("username")}
              >
                <User className="mr-2 h-4 w-4" />
                Edit Username
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = "/dashboard/discover";
                }}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Update Location
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleFieldEdit("discoveryRange")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Discovery Settings
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = "/dashboard/settings";
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Privacy Settings
              </Button>
            </CardContent>
          </Card>

          {/* Profile Completion */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const completionItems = [
                    { label: "Email verified", completed: !!userEmail },
                    {
                      label: "Profile photo",
                      completed: !!session?.user?.image,
                    },
                    {
                      label: "Bio written",
                      completed: !!(user?.bio && user.bio.trim()),
                    },
                    { label: "Location enabled", completed: !!user?.location },
                    {
                      label: "Discovery enabled",
                      completed: !!user?.isDiscoveryEnabled,
                    },
                  ];

                  const completedCount = completionItems.filter(
                    (item) => item.completed
                  ).length;
                  const progress = Math.round(
                    (completedCount / completionItems.length) * 100
                  );

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall Progress</span>
                        <span className="text-sm font-medium">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {completionItems.map((item, index) => (
                          <div
                            key={index}
                            className={`flex items-center ${
                              item.completed
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full mr-2 ${
                                item.completed ? "bg-green-600" : "bg-gray-400"
                              }`}
                            ></span>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
