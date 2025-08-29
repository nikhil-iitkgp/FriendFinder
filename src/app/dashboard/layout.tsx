"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationCenter from "@/components/NotificationCenter";
import WifiManager from "@/components/WifiManager";
import {
  Users,
  MessageCircle,
  Compass,
  Settings,
  User,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Home,
  Phone,
  MapPin,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Friends", href: "/dashboard/friends", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: MessageCircle },
  { name: "Discover", href: "/dashboard/discover", icon: Compass },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const { data: session } = useSession();
  const { user, logout } = useAuth();
  const router = useRouter();

  // Get user display name safely
  const displayName = user?.username || session?.user?.name || "User";
  const userEmail = user?.email || session?.user?.email;
  const userImage = session?.user?.image;

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/dashboard/friends?tab=search&q=${encodeURIComponent(
          searchQuery.trim()
        )}`
      );
      setSearchQuery("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-4 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">FF</span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  FriendFinder
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-4 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive
                          ? "text-blue-700"
                          : "text-gray-400 group-hover:text-gray-500"
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* WiFi Manager in Sidebar */}
            <div className="px-4 pb-4">
              <WifiManager />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-14 sm:h-16 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Desktop Navigation Tabs and Mobile Content */}
          <div className="flex-1 flex items-center px-4">
            {/* Desktop Brand Logo - show on lg+ screens */}
            <div className="hidden lg:flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">FF</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                FriendFinder
              </span>
            </div>

            {/* Desktop Navigation tabs - centered */}
            <div className="hidden lg:flex flex-1 justify-center">
              <div className="flex items-center space-x-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile brand logo - show on small screens only */}
            <div className="flex lg:hidden items-center space-x-2 flex-1">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">FF</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                FriendFinder
              </span>
            </div>

            {/* Right side items - always visible */}
            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <NotificationCenter />

              {/* Profile section */}
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8 lg:h-9 lg:w-9 ring-2 ring-gray-100">
                  <AvatarImage src={userImage || undefined} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold">
                    {displayName
                      ? displayName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block">
                  <div className="text-sm font-semibold text-gray-800">
                    {displayName}
                  </div>
                  <div className="text-xs text-gray-500">{userEmail}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1.5 lg:p-2"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 min-h-0 overflow-hidden">
          <div className="h-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
