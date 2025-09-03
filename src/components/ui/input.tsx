import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex min-h-[44px] w-full min-w-0 rounded-md border bg-transparent px-3 py-3 text-base shadow-enhanced-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 tap-highlight-none input-mobile",
  {
    variants: {
      variant: {
        default: "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] hover:border-muted-foreground/30",
        success: "border-toast-success focus-visible:border-toast-success focus-visible:ring-toast-success/20",
        error: "border-toast-error focus-visible:border-toast-error focus-visible:ring-toast-error/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        warning: "border-toast-warning focus-visible:border-toast-warning focus-visible:ring-toast-warning/20",
      },
      inputSize: {
        default: "min-h-[44px] px-3 py-3 text-base",
        sm: "min-h-[36px] px-2.5 py-2 text-sm",
        lg: "min-h-[48px] px-4 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);

interface InputProps extends Omit<React.ComponentProps<"input">, "size">, VariantProps<typeof inputVariants> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    variant,
    inputSize,
    label,
    description,
    error,
    success,
    loading,
    leftIcon,
    rightIcon,
    showPasswordToggle,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;
    
    // Determine variant based on state
    const computedVariant = error ? "error" : success ? "success" : variant;
    
    const inputId = React.useId();
    const descriptionId = React.useId();
    const errorId = React.useId();
    
    const handlePasswordToggle = () => {
      setShowPassword(!showPassword);
    };
    
    const getStatusIcon = () => {
      if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      if (error) return <AlertCircle className="h-4 w-4 text-toast-error" />;
      if (success) return <CheckCircle className="h-4 w-4 text-toast-success" />;
      return null;
    };
    
    const getRightIcon = () => {
      if (isPassword && showPasswordToggle) {
        return (
          <button
            type="button"
            onClick={handlePasswordToggle}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        );
      }
      return getStatusIcon() || rightIcon;
    };
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium leading-none transition-colors",
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              isFocused && "text-brand-primary",
              error && "text-toast-error",
              success && "text-toast-success"
            )}
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            data-slot="input"
            className={cn(
              inputVariants({ variant: computedVariant, inputSize }),
              leftIcon && "pl-10",
              (rightIcon || isPassword || loading || error || success) && "pr-10",
              className
            )}
            disabled={disabled || loading}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={cn(
              description && descriptionId,
              error && errorId
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          
          {getRightIcon() && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getRightIcon()}
            </div>
          )}
        </div>
        
        {description && !error && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        
        {error && (
          <p
            id={errorId}
            className="text-sm text-toast-error flex items-center gap-1.5 animate-slide-up"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}
        
        {success && !error && (
          <p className="text-sm text-toast-success flex items-center gap-1.5 animate-slide-up">
            <CheckCircle className="h-3 w-3 flex-shrink-0" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
