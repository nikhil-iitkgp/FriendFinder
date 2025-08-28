"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCall } from "@/context/CallContext";
import CallControls from "@/components/calls/CallControls";
import { Phone, Video, Users, PhoneOff } from "lucide-react";

export default function CallTestPage() {
  const { currentCall, callStatus, isInCall, endCall } = useCall();
  const [testRecipientId, setTestRecipientId] = useState("test-user-123");
  const [testRecipientName, setTestRecipientName] = useState("Test User");

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">WebRTC Call Testing</h1>
        <p className="text-gray-600">
          Test the WebRTC video and voice calling functionality
        </p>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Call Initiation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Initiate Test Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="recipientId">Recipient ID</Label>
              <Input
                id="recipientId"
                value={testRecipientId}
                onChange={(e) => setTestRecipientId(e.target.value)}
                placeholder="Enter recipient ID"
              />
            </div>
            <div>
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                value={testRecipientName}
                onChange={(e) => setTestRecipientName(e.target.value)}
                placeholder="Enter recipient name"
              />
            </div>
            <div className="flex gap-2">
              <CallControls
                recipientId={testRecipientId}
                recipientName={testRecipientName}
                disabled={!testRecipientId || !testRecipientName}
              />
            </div>
          </CardContent>
        </Card>

        {/* Call Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Call Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    callStatus === "connected"
                      ? "bg-green-100 text-green-800"
                      : callStatus === "calling"
                      ? "bg-blue-100 text-blue-800"
                      : callStatus === "receiving"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {callStatus}
                </span>
              </div>
              <div>
                <span className="font-medium">In Call:</span>
                <span
                  className={`ml-2 ${
                    isInCall ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {isInCall ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {currentCall && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Current Call</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {currentCall.type}
                  </div>
                  <div>
                    <span className="font-medium">With:</span>{" "}
                    {currentCall.recipientName || currentCall.callerName}
                  </div>
                  <div>
                    <span className="font-medium">Started:</span>{" "}
                    {currentCall.startTime?.toLocaleTimeString()}
                  </div>
                </div>

                <Button
                  onClick={endCall}
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                >
                  <PhoneOff className="w-4 h-4 mr-1" />
                  End Call
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <span>
                Open this page in two browser windows/tabs to simulate two users
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <span>Use different recipient IDs in each window</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">3.</span>
              <span>
                Click the call buttons to initiate video or voice calls
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">4.</span>
              <span>
                The receiving window should show an incoming call notification
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">5.</span>
              <span>Accept the call to establish WebRTC connection</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Make sure to allow camera and microphone
              permissions when prompted. The browser may require HTTPS for
              WebRTC features in production.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
