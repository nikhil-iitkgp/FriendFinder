"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Test page for AuthContext functionality
 * This page should only be used in development to test authentication
 */
export default function TestAuthPage() {
  const {
    user,
    isLoading,
    isAuthenticated,
    login,
    loginWithGoogle,
    logout,
    refreshUser,
    updateUserProfile,
  } = useAuth();

  const { preferences, updateTheme, updateDiscovery } = useUserPreferences();

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading authentication...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
            <CardDescription>Test authentication functionality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Status: Not authenticated
            </div>

            <div className="space-y-2">
              <Button
                onClick={loginWithGoogle}
                variant="outline"
                className="w-full"
              >
                Sign in with Google
              </Button>

              <Button
                onClick={() => login("test@example.com", "password")}
                variant="outline"
                className="w-full"
              >
                Test Credentials Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test - Authenticated</CardTitle>
          <CardDescription>
            Current user information and controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>User ID:</strong> {user?.id}
            </div>
            <div>
              <strong>Username:</strong> {user?.username}
            </div>
            <div>
              <strong>Email:</strong> {user?.email}
            </div>
            <div>
              <strong>Discovery Enabled:</strong>{" "}
              {user?.isDiscoveryEnabled ? "Yes" : "No"}
            </div>
            <div>
              <strong>Discovery Range:</strong> {user?.discoveryRange}m
            </div>
            <div>
              <strong>Friends Count:</strong> {user?.friends?.length || 0}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={refreshUser} variant="outline" size="sm">
              Refresh User Data
            </Button>

            <Button
              onClick={() =>
                updateUserProfile({ bio: "Updated via test page" })
              }
              variant="outline"
              size="sm"
            >
              Update Bio
            </Button>

            <Button
              onClick={() =>
                updateDiscovery({ enabled: !user?.isDiscoveryEnabled })
              }
              variant="outline"
              size="sm"
            >
              Toggle Discovery
            </Button>

            <Button onClick={logout} variant="destructive" size="sm">
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Preferences</CardTitle>
          <CardDescription>Test user preferences functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Theme:</strong> {preferences.theme}
            </div>
            <div>
              <strong>Notifications:</strong>{" "}
              {JSON.stringify(preferences.notifications)}
            </div>
            <div>
              <strong>Discovery Range:</strong> {preferences.discovery.range}m
            </div>
            <div>
              <strong>Discovery Methods:</strong>{" "}
              {JSON.stringify(preferences.discovery.methods)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => updateTheme("dark")}
              variant="outline"
              size="sm"
            >
              Dark Theme
            </Button>

            <Button
              onClick={() => updateTheme("light")}
              variant="outline"
              size="sm"
            >
              Light Theme
            </Button>

            <Button
              onClick={() => updateTheme("system")}
              variant="outline"
              size="sm"
            >
              System Theme
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw User Data</CardTitle>
          <CardDescription>Complete user object for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
