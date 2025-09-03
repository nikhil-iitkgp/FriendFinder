"use client";

import { ReactNode } from "react";
import { SessionProvider } from "@/context/SessionProvider";
import { AuthProvider } from "./AuthContext";
import { CallProvider } from "./CallContext";
import { LocationProvider } from "./LocationContext";
import { FriendsProvider } from "./FriendsContext";
import { MessagingProvider } from "./MessagingContext";
import { RandomChatProvider } from "./RandomChatContext";
import { PresenceProvider } from "./PresenceProvider";
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
          <PresenceProvider>
            <CallProvider>
              <LocationProvider>
                <FriendsProvider>
                  <MessagingProvider>
                    <RandomChatProvider>{children}</RandomChatProvider>
                  </MessagingProvider>
                </FriendsProvider>
              </LocationProvider>
            </CallProvider>
          </PresenceProvider>
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
