import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/contexts/Providers";
import CallManager from "@/components/calls/CallManager";
import RealTimeNotifications from "@/components/notifications/RealTimeNotifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FriendFinder - Connect with People Nearby",
  description:
    "Discover and connect with people physically nearby using GPS, WiFi, and Bluetooth technology.",
  keywords: [
    "social networking",
    "nearby friends",
    "location-based",
    "real-time chat",
  ],
  authors: [{ name: "FriendFinder Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>
          <ErrorBoundary>
            <div id="root" className="min-h-screen">
              {children}
            </div>
          </ErrorBoundary>
          <CallManager />
          <RealTimeNotifications />
          <div id="portal-root" />
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
