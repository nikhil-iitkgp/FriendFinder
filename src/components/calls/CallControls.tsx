"use client";

import React, { useState } from "react";
import { Phone, Video, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall } from "@/context/CallContext";

interface CallControlsProps {
  recipientId: string;
  recipientName: string;
  disabled?: boolean;
}

export default function CallControls({
  recipientId,
  recipientName,
  disabled,
}: CallControlsProps) {
  const { initiateCall, isInCall } = useCall();
  const [isInitiating, setIsInitiating] = useState(false);

  const handleCall = async (type: "video" | "audio") => {
    if (isInCall || isInitiating) return;

    setIsInitiating(true);

    try {
      await initiateCall(recipientId, recipientName, type);
      console.log(
        `${
          type === "video" ? "Video" : "Voice"
        } call started with ${recipientName}`
      );
    } catch (error) {
      console.error("Failed to initiate call:", error);
    } finally {
      setIsInitiating(false);
    }
  };

  const isDisabled = disabled || isInCall || isInitiating;

  return (
    <div className="flex space-x-2">
      {/* Voice Call Button */}
      <Button
        onClick={() => handleCall("audio")}
        disabled={isDisabled}
        size="sm"
        variant="outline"
        className="flex items-center space-x-1 hover:bg-green-50 hover:border-green-300"
      >
        <Phone className="w-4 h-4 text-green-600" />
        <span className="hidden sm:inline">Call</span>
      </Button>

      {/* Video Call Button */}
      <Button
        onClick={() => handleCall("video")}
        disabled={isDisabled}
        size="sm"
        variant="outline"
        className="flex items-center space-x-1 hover:bg-blue-50 hover:border-blue-300"
      >
        <Video className="w-4 h-4 text-blue-600" />
        <span className="hidden sm:inline">Video</span>
      </Button>
    </div>
  );
}

// Mini call controls for compact spaces
export function MiniCallControls({
  recipientId,
  recipientName,
  disabled,
}: CallControlsProps) {
  const { initiateCall, isInCall } = useCall();
  const [isInitiating, setIsInitiating] = useState(false);

  const handleCall = async (type: "video" | "audio") => {
    if (isInCall || isInitiating) return;

    setIsInitiating(true);

    try {
      await initiateCall(recipientId, recipientName, type);
    } catch (error) {
      console.error("Failed to initiate call:", error);
    } finally {
      setIsInitiating(false);
    }
  };

  const isDisabled = disabled || isInCall || isInitiating;

  return (
    <div className="flex space-x-1">
      {/* Voice Call Button */}
      <Button
        onClick={() => handleCall("audio")}
        disabled={isDisabled}
        size="sm"
        variant="ghost"
        className="w-8 h-8 p-0 hover:bg-green-100"
      >
        <Phone className="w-4 h-4 text-green-600" />
      </Button>

      {/* Video Call Button */}
      <Button
        onClick={() => handleCall("video")}
        disabled={isDisabled}
        size="sm"
        variant="ghost"
        className="w-8 h-8 p-0 hover:bg-blue-100"
      >
        <Video className="w-4 h-4 text-blue-600" />
      </Button>
    </div>
  );
}
