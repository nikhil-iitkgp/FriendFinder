"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { useThemePreferences } from "@/components/theme-provider"

interface EnhancedToasterProps extends ToasterProps {
  enableAnimations?: boolean;
}

const Toaster = ({ enableAnimations = true, ...props }: EnhancedToasterProps) => {
  const { theme = "system" } = useTheme()
  const { animationsEnabled } = useThemePreferences()

  const shouldAnimate = enableAnimations && animationsEnabled

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: `
            group toast group-[.toaster]:shadow-enhanced-lg
            group-[.toaster]:border group-[.toaster]:border-border
            group-[.toaster]:bg-surface-secondary group-[.toaster]:text-foreground
            group-[.toaster]:backdrop-blur-sm
            ${shouldAnimate ? 'animate-slide-up' : ''}
          `,
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: `
            group-[.toast]:bg-primary group-[.toast]:text-primary-foreground
            group-[.toast]:hover:bg-primary/90 group-[.toast]:shadow-enhanced-sm
            group-[.toast]:transition-all group-[.toast]:duration-200
            group-[.toast]:focus-ring-enhanced
          `,
          cancelButton: `
            group-[.toast]:bg-muted group-[.toast]:text-muted-foreground
            group-[.toast]:hover:bg-muted/80 group-[.toast]:shadow-enhanced-sm
            group-[.toast]:transition-all group-[.toast]:duration-200
          `,
          closeButton: `
            group-[.toast]:bg-surface-primary group-[.toast]:text-foreground
            group-[.toast]:border group-[.toast]:border-border
            group-[.toast]:hover:bg-surface-tertiary group-[.toast]:shadow-enhanced-sm
            group-[.toast]:transition-all group-[.toast]:duration-200
          `,
          success: `
            toast-success group-[.toaster]:border-toast-success
            group-[.toaster]:text-toast-success-foreground
          `,
          error: `
            toast-error group-[.toaster]:border-toast-error
            group-[.toaster]:text-toast-error-foreground
          `,
          warning: `
            toast-warning group-[.toaster]:border-toast-warning
            group-[.toaster]:text-toast-warning-foreground
          `,
          info: `
            toast-info group-[.toaster]:border-toast-info
            group-[.toaster]:text-toast-info-foreground
          `,
        },
      }}
      style={{
        "--normal-bg": "var(--surface-secondary)",
        "--normal-text": "var(--foreground)",
        "--normal-border": "var(--border)",
        "--success-bg": "var(--toast-success)",
        "--success-text": "var(--toast-success-foreground)",
        "--error-bg": "var(--toast-error)",
        "--error-text": "var(--toast-error-foreground)",
        "--warning-bg": "var(--toast-warning)",
        "--warning-text": "var(--toast-warning-foreground)",
        "--info-bg": "var(--toast-info)",
        "--info-text": "var(--toast-info-foreground)",
      } as React.CSSProperties}
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
      duration={4000}
      gap={12}
      visibleToasts={5}
      {...props}
    />
  )
}

export { Toaster }
