"use client";

import { ReactNode } from "react";
import { usePresence } from "@/hooks/usePresence";

interface PresenceProviderProps {
  children: ReactNode;
}

export function PresenceProvider({ children }: PresenceProviderProps) {
  // Use the presence hook to automatically send heartbeats
  usePresence({
    interval: 30000, // Send heartbeat every 30 seconds
    enabled: true,
  });

  return <>{children}</>;
}
