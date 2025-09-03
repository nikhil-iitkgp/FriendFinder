import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-enhanced-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "hover:shadow-enhanced-md hover:-translate-y-1",
        elevated: "shadow-enhanced-lg hover:shadow-enhanced-xl hover:-translate-y-2",
        flat: "shadow-none border-2 hover:border-brand-accent",
        glass: "glass backdrop-blur-md border-white/20 hover:border-white/30",
        gradient: "gradient-primary text-primary-foreground border-none shadow-enhanced-md hover:shadow-enhanced-lg",
        interactive: "card-enhanced cursor-pointer hover:border-brand-accent hover:shadow-enhanced-lg hover:-translate-y-2",
      },
      size: {
        default: "py-6",
        sm: "py-4 gap-4",
        lg: "py-8 gap-8",
        xl: "py-10 gap-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface CardProps extends React.ComponentProps<"div">, VariantProps<typeof cardVariants> {
  hover?: boolean;
}

function Card({ className, variant, size, hover = true, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        cardVariants({ variant, size }),
        !hover && "hover:shadow-enhanced-sm hover:translate-y-0",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 animate-fade-in",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold text-responsive-base", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-responsive-sm opacity-90", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end transition-all duration-200 hover:scale-105",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 animate-fade-in", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6 gap-3 animate-fade-in", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
