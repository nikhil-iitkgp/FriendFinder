"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps, createContext, useContext, useEffect, useState } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider> & {
  enableAnimations?: boolean;
};

interface ThemeContextType {
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  reducedMotion: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemePreferences() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemePreferences must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({
  children,
  enableAnimations = true,
  ...props
}: ThemeProviderProps) {
  const [animationsEnabled, setAnimationsEnabled] = useState(enableAnimations);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check for user's motion preferences
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    // If user prefers reduced motion, disable animations by default
    if (mediaQuery.matches) {
      setAnimationsEnabled(false);
    }

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) {
        setAnimationsEnabled(false);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    // Apply animation preference to document
    if (animationsEnabled && !reducedMotion) {
      document.documentElement.classList.remove("no-animations");
    } else {
      document.documentElement.classList.add("no-animations");
    }
  }, [animationsEnabled, reducedMotion]);

  const contextValue: ThemeContextType = {
    animationsEnabled,
    setAnimationsEnabled,
    reducedMotion,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ThemeContext.Provider>
  );
}
