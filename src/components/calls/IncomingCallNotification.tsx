"use client";

import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, Video, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCall } from "@/context/CallContext";

export default function IncomingCallNotification() {
  const { incomingCall, answerCall, declineCall, dismissIncomingCall } =
    useCall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (incomingCall) {
      setIsVisible(true);

      // Auto-dismiss after 30 seconds
      const timeout = setTimeout(() => {
        handleDecline();
      }, 30000);

      return () => clearTimeout(timeout);
    } else {
      setIsVisible(false);
    }
  }, [incomingCall]);

  const handleAnswer = async () => {
    try {
      await answerCall();
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to answer call:", error);
      handleDecline();
    }
  };

  const handleDecline = () => {
    declineCall();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    dismissIncomingCall();
    setIsVisible(false);
  };

  if (!incomingCall || !isVisible) return null;

  const isVideoCall = incomingCall.type === "video";

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleDismiss} />

      {/* Notification */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-80 max-w-sm mx-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-2">
              {isVideoCall ? (
                <Video className="w-6 h-6 text-blue-600 mr-2" />
              ) : (
                <Mic className="w-6 h-6 text-green-600 mr-2" />
              )}
              <span className="text-sm font-medium text-gray-600">
                Incoming {isVideoCall ? "Video" : "Voice"} Call
              </span>
            </div>
          </div>

          {/* Caller Info */}
          <div className="text-center mb-8">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarFallback className="text-2xl bg-gray-200">
                {incomingCall.callerName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {incomingCall.callerName || "Unknown"}
            </h3>

            <p className="text-sm text-gray-500">
              {isVideoCall ? "wants to video chat with you" : "is calling you"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-6">
            {/* Decline Button */}
            <Button
              onClick={handleDecline}
              size="lg"
              variant="destructive"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            {/* Answer Button */}
            <Button
              onClick={handleAnswer}
              size="lg"
              className={`w-16 h-16 rounded-full ${
                isVideoCall
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isVideoCall ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-center mt-4 space-x-4 text-xs text-gray-500">
            <button
              onClick={handleDismiss}
              className="hover:text-gray-700 transition-colors"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>

      {/* Pulsing Animation */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }

        .pulse-ring {
          animation: pulse-ring 1.5s infinite;
        }
      `}</style>
    </>
  );
}
