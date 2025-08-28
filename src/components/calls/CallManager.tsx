"use client";

import React from "react";
import { useCall } from "@/context/CallContext";
import VideoCall from "@/components/calls/VideoCall";
import IncomingCallNotification from "@/components/calls/IncomingCallNotification";

export default function CallManager() {
  const { currentCall, incomingCall, callStatus } = useCall();

  const showVideoCall =
    currentCall && ["calling", "connected"].includes(callStatus);
  const showIncomingCall = incomingCall && callStatus === "receiving";

  return (
    <>
      {/* Incoming Call Notification */}
      {showIncomingCall && <IncomingCallNotification />}

      {/* Active Call Interface */}
      {showVideoCall && <VideoCall />}
    </>
  );
}
