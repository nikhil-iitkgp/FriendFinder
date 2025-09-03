"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Home, 
  Users, 
  MessageCircle, 
  Shuffle, 
  Search, 
  User, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { ThemeToggle, ThemeToggleCompact } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(pathname);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update active tab when pathname changes
  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  if (status === "loading") {
    return (
      <div className="h-16 bg-surface-primary border-b animate-pulse" />
    );
  }

  if (!session) {
    return null;
  }

  const navigationItems: NavigationItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/friends", label: "Friends", icon: Users, badge: 2 },
    { href: "/dashboard/messages", label: "Messages", icon: MessageCircle, badge: 5 },
    { href: "/dashboard/random-chat", label: "Random Chat", icon: Shuffle },
    { href: "/dashboard/discover", label: "Discover", icon: Search },
    { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Enhanced Header Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        isScrolled 
          ? "glass-strong shadow-enhanced-lg border-b border-white/20" 
          : "bg-surface-primary/80 backdrop-blur-sm border-b"
      )}>
        <div className="max-w-6xl mx-auto mobile-padding">
          <div className="flex justify-between items-center h-16">
            {/* Enhanced Logo */}
            <Link
              href="/dashboard"
              className="flex items-center text-responsive-lg font-bold text-brand-primary hover:text-brand-secondary transition-all duration-200 hover:scale-105 group"
            >
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 shadow-enhanced-sm group-hover:shadow-enhanced-md transition-all duration-200">
                FF
              </div>
              <span className="hidden sm:block">FriendFinder</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105",
                      active
                        ? "text-brand-primary bg-brand-accent/10 shadow-enhanced-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-secondary"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      active && "text-brand-primary"
                    )} />
                    <span className="hidden xl:block">{item.label}</span>
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-toast-error text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <div className="hidden sm:block">
                <ThemeToggle showLabel={false} variant="icon" />
              </div>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden"
                aria-label="Toggle menu"
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              {/* Desktop User Menu */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {session.user?.name || "User"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.user?.email}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden xl:block">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="h-16" />

      {/* Enhanced Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Enhanced Mobile Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-80 glass-strong shadow-enhanced-2xl transform transition-all duration-300 ease-out z-50 lg:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-6">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/dashboard"
              className="flex items-center text-xl font-bold text-brand-primary hover:text-brand-secondary transition-colors group"
            >
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white font-bold mr-3 shadow-enhanced-md group-hover:shadow-enhanced-lg transition-all duration-200">
                FF
              </div>
              FriendFinder
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="hover:bg-surface-tertiary"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                    active
                      ? "text-brand-primary bg-brand-accent/20 shadow-enhanced-sm border-l-4 border-brand-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-secondary hover:shadow-enhanced-xs"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active ? "text-brand-primary" : "group-hover:scale-110"
                  )} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto h-6 w-6 bg-toast-error text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle in Sidebar */}
          <div className="border-t border-white/10 pt-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Theme</span>
              <ThemeToggleCompact />
            </div>
          </div>

          {/* Sidebar User Menu */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center text-white font-semibold">
                {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {session.user?.name || "User"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {session.user?.email}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full gap-2 hover:bg-toast-error hover:text-white hover:border-toast-error transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="glass-strong border-t border-white/20 px-4 py-2">
          <div className="flex items-center justify-around">
            {navigationItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 flex-1",
                    active
                      ? "text-brand-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active && "text-brand-primary scale-110"
                  )} />
                  <span className="text-xs font-medium truncate max-w-full">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-toast-error text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                  {active && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        {/* Safe area padding for devices with home indicator */}
        <div className="h-safe-bottom bg-surface-primary/80 backdrop-blur-sm" />
      </div>

      {/* Bottom spacer for mobile navigation */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
