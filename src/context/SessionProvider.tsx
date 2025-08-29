"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import type { Session } from "next-auth";

/**
 * Session provider props
 */
interface SessionProviderProps {
  children: ReactNode;
  session?: Session | null;
}

/**
 * NextAuth Session Provider wrapper
 * This wraps NextAuth's SessionProvider to make it easier to use
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window gains focus
    >
      {children}
    </NextAuthSessionProvider>
  );
}
