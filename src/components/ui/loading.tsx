"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-brand-primary", sizeClasses[size])} />
      {text && (
        <span className="text-sm text-muted-foreground animate-pulse">{text}</span>
      )}
    </div>
  );
}

interface LoadingCardProps {
  className?: string;
  lines?: number;
}

export function LoadingCard({ className, lines = 3 }: LoadingCardProps) {
  return (
    <div className={cn("card-enhanced p-6 animate-pulse", className)}>
      <div className="space-y-3">
        <div className="h-6 bg-surface-tertiary rounded-lg w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 bg-surface-tertiary rounded",
              i === lines - 1 ? "w-1/2" : "w-full"
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message = "Loading...", className }: LoadingScreenProps) {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      "glass-strong backdrop-blur-lg",
      className
    )}>
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-surface-tertiary rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-brand-primary rounded-full animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{message}</h3>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({ isLoading, message, children, className }: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center glass backdrop-blur-sm rounded-lg">
          <LoadingSpinner size="lg" text={message} />
        </div>
      )}
    </div>
  );
}

// Skeleton components for specific UI elements
export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];
  
  return (
    <div className={cn("bg-surface-tertiary rounded-full animate-pulse", sizeClass)} />
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-surface-tertiary rounded animate-pulse",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <div className={cn("h-10 bg-surface-tertiary rounded-lg animate-pulse", className)} />
  );
}

// Loading states for specific pages
export function DashboardLoading() {
  return (
    <div className="mobile-padding space-y-6">
      <div className="space-y-2">
        <div className="h-8 bg-surface-tertiary rounded-lg w-1/3 animate-pulse" />
        <div className="h-4 bg-surface-tertiary rounded w-2/3 animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function MessageLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-tertiary rounded w-1/4 animate-pulse" />
            <div className="space-y-1">
              <div className="h-3 bg-surface-tertiary rounded animate-pulse" />
              <div className="h-3 bg-surface-tertiary rounded w-3/4 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FriendsLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <SkeletonAvatar />
            <div className="space-y-2">
              <div className="h-4 bg-surface-tertiary rounded w-24 animate-pulse" />
              <div className="h-3 bg-surface-tertiary rounded w-16 animate-pulse" />
            </div>
          </div>
          <SkeletonButton className="w-20" />
        </div>
      ))}
    </div>
  );
}