"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useThemePreferences } from "@/components/theme-provider";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: "default" | "icon";
  className?: string;
}

export function ThemeToggle({
  showLabel = true,
  variant = "default",
  className,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const { animationsEnabled } = useThemePreferences();
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size={variant === "icon" ? "icon" : "sm"}
        className={cn("opacity-50", className)}
      >
        <Sun className="h-4 w-4" />
        {showLabel && variant !== "icon" && <span>Theme</span>}
      </Button>
    );
  }

  const cycleTheme = async () => {
    if (animationsEnabled) {
      setIsTransitioning(true);
      // Brief delay for visual feedback
      setTimeout(() => setIsTransitioning(false), 200);
    }

    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    const iconClasses = cn(
      "h-4 w-4 transition-all duration-200",
      isTransitioning && animationsEnabled && "scale-110 rotate-12"
    );

    switch (theme) {
      case "light":
        return <Sun className={iconClasses} />;
      case "dark":
        return <Moon className={iconClasses} />;
      default:
        return <Monitor className={iconClasses} />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "System";
    }
  };

  const getDescription = () => {
    switch (theme) {
      case "light":
        return "Switch to dark mode";
      case "dark":
        return "Switch to system mode";
      default:
        return "Switch to light mode";
    }
  };

  return (
    <Button
      variant="outline"
      size={variant === "icon" ? "icon" : "sm"}
      onClick={cycleTheme}
      className={cn(
        "relative transition-all duration-200 hover:scale-105 active:scale-95",
        "focus-ring-enhanced tap-highlight-none",
        variant !== "icon" && "gap-2",
        isTransitioning && "scale-105",
        className
      )}
      title={getDescription()}
      aria-label={getDescription()}
    >
      <div className="relative">
        {getIcon()}
        {isTransitioning && animationsEnabled && (
          <div className="absolute inset-0 animate-ping">
            <Palette className="h-4 w-4 opacity-75" />
          </div>
        )}
      </div>
      {showLabel && variant !== "icon" && (
        <span className="font-medium">{getLabel()}</span>
      )}
    </Button>
  );
}

// Compact version for mobile/navigation
export function ThemeToggleCompact({ className }: { className?: string }) {
  return (
    <ThemeToggle
      showLabel={false}
      variant="icon"
      className={cn("size-8", className)}
    />
  );
}
