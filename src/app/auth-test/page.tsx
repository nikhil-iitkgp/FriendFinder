"use client";

import { useSession } from "next-auth/react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthTestPage() {
  const { data: session, status } = useSession();
  const { user, logout } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Authentication Test
        </h1>

        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>NextAuth Session</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
              <p className="mt-2 text-sm text-gray-600">
                Status: <span className="font-medium">{status}</span>
              </p>
            </CardContent>
          </Card>

          {/* Auth Context Info */}
          <Card>
            <CardHeader>
              <CardTitle>Auth Context User</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session ? (
                <div className="space-y-2">
                  <p className="text-green-600 font-medium">✅ Authenticated</p>
                  <div className="space-x-4">
                    <Button onClick={logout} variant="destructive">
                      Sign Out
                    </Button>
                    <Link href="/dashboard">
                      <Button>Go to Dashboard</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-600 font-medium">
                    ❌ Not Authenticated
                  </p>
                  <div className="space-x-4">
                    <Link href="/login">
                      <Button>Sign In</Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="outline">Register</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="text-center">
            <Link href="/" className="text-blue-600 hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
