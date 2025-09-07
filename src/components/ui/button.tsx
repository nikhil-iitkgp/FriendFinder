import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive tap-highlight-none hover:scale-[1.02] active:scale-[0.98] transform-gpu",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-enhanced-xs hover:bg-primary/90 hover:shadow-enhanced-sm gradient-primary",
        destructive:
          "bg-destructive text-white shadow-enhanced-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 hover:shadow-enhanced-sm",
        outline:
          "border bg-background shadow-enhanced-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 hover:shadow-enhanced-sm hover:border-brand-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-enhanced-xs hover:bg-secondary/80 hover:shadow-enhanced-sm",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 hover:shadow-enhanced-xs",
        link: "text-primary underline-offset-4 hover:underline hover:text-brand-accent",
        gradient:
          "gradient-primary text-primary-foreground shadow-enhanced-sm hover:shadow-enhanced-md hover:opacity-90",
        glass:
          "glass text-foreground shadow-enhanced-md hover:shadow-enhanced-lg backdrop-blur-sm border-white/20",
      },
      size: {
        default: "min-h-[44px] px-4 py-2 has-[>svg]:px-3 touch-target-44",
        sm: "min-h-[36px] rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "min-h-[48px] rounded-lg px-6 has-[>svg]:px-4 text-base touch-target-48",
        icon: "size-11 rounded-lg",
        xs: "min-h-[32px] rounded px-2 has-[>svg]:px-1.5 text-xs gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    const content = (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon
        )}
        <span className={cn(
          "transition-opacity duration-200",
          loading && "opacity-75"
        )}>
          {loading && loadingText ? loadingText : children}
        </span>
        {!loading && rightIcon}
      </>
    );

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        {...(isDisabled && { "aria-disabled": "true" })}
        {...(loading && { "aria-busy": "true" })}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
