"use client";

import { ReactNode } from "react";
import { SessionProvider } from "./SessionProvider";
import { AuthProvider } from "./AuthContext";
import { CallProvider } from "./CallContext";
import { LocationProvider } from "./LocationContext";
import { FriendsProvider } from "./FriendsContext";
import { MessagingProvider } from "./MessagingContext";
import { ThemeProvider } from "@/components/theme-provider";
import type { Session } from "next-auth";

/**
 * Combined providers props
 */
interface ProvidersProps {
  children: ReactNode;
  session?: Session | null;
}

/**
 * Combined providers component
 * Wraps the app with all necessary context providers
 */
export function Providers({ children, session }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider session={session}>
        <AuthProvider>
          <CallProvider>
            <LocationProvider>
              <FriendsProvider>
                <MessagingProvider>{children}</MessagingProvider>
              </FriendsProvider>
            </LocationProvider>
          </CallProvider>
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
