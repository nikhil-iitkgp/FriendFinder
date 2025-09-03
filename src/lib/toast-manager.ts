"use client";

import { toast, ToastT } from "sonner";
import { ReactNode } from "react";

// Toast priority levels
export enum ToastPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// Toast categories
export enum ToastCategory {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  LOADING = "loading",
}

// Toast configuration interface
interface ToastConfig {
  priority?: ToastPriority;
  category?: ToastCategory;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  description?: string;
}

// Rate limiting configuration
interface RateLimitConfig {
  maxToasts: number;
  timeWindow: number; // in milliseconds
}

class EnhancedToastManager {
  private toastQueue: Array<{
    message: string;
    config: ToastConfig;
    timestamp: number;
  }> = [];
  
  private recentToasts: Array<{
    message: string;
    timestamp: number;
  }> = [];
  
  private rateLimit: RateLimitConfig = {
    maxToasts: 5,
    timeWindow: 10000, // 10 seconds
  };
  
  private activeToasts = new Map<string, ToastT>();

  /**
   * Show a toast notification with intelligent management
   */
  show(message: string, config: ToastConfig = {}): string | null {
    const { priority = ToastPriority.MEDIUM, category = ToastCategory.INFO } = config;
    
    // Check rate limiting
    if (!this.checkRateLimit(message)) {
      console.warn("Toast rate limit exceeded, queuing message:", message);
      this.addToQueue(message, config);
      return null;
    }

    // Check for duplicate toasts
    if (this.isDuplicate(message)) {
      return null;
    }

    return this.displayToast(message, config);
  }

  /**
   * Show a success toast
   */
  success(message: string, config: Omit<ToastConfig, 'category'> = {}): string | null {
    return this.show(message, { ...config, category: ToastCategory.SUCCESS });
  }

  /**
   * Show an error toast
   */
  error(message: string, config: Omit<ToastConfig, 'category'> = {}): string | null {
    return this.show(message, { 
      ...config, 
      category: ToastCategory.ERROR,
      priority: ToastPriority.HIGH,
      duration: 6000 // Longer duration for errors
    });
  }

  /**
   * Show a warning toast
   */
  warning(message: string, config: Omit<ToastConfig, 'category'> = {}): string | null {
    return this.show(message, { 
      ...config, 
      category: ToastCategory.WARNING,
      priority: ToastPriority.MEDIUM,
      duration: 5000
    });
  }

  /**
   * Show an info toast
   */
  info(message: string, config: Omit<ToastConfig, 'category'> = {}): string | null {
    return this.show(message, { ...config, category: ToastCategory.INFO });
  }

  /**
   * Show a loading toast
   */
  loading(message: string, config: Omit<ToastConfig, 'category'> = {}): string | null {
    return this.show(message, { 
      ...config, 
      category: ToastCategory.LOADING,
      persistent: true 
    });
  }

  /**
   * Update an existing toast
   */
  update(toastId: string, message: string, config: ToastConfig = {}): void {
    if (this.activeToasts.has(toastId)) {
      toast.dismiss(toastId);
      this.show(message, config);
    }
  }

  /**
   * Dismiss a toast
   */
  dismiss(toastId: string): void {
    toast.dismiss(toastId);
    this.activeToasts.delete(toastId);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    toast.dismiss();
    this.activeToasts.clear();
  }

  /**
   * Process queued toasts
   */
  processQueue(): void {
    if (this.toastQueue.length === 0) return;

    // Sort by priority and timestamp
    this.toastQueue.sort((a, b) => {
      const priorityDiff = (b.config.priority || 0) - (a.config.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    // Process highest priority items first
    const toProcess = this.toastQueue.splice(0, Math.min(3, this.toastQueue.length));
    
    toProcess.forEach(({ message, config }) => {
      setTimeout(() => {
        this.displayToast(message, config);
      }, 100);
    });
  }

  /**
   * Clear old entries from recent toasts
   */
  private cleanupRecentToasts(): void {
    const now = Date.now();
    this.recentToasts = this.recentToasts.filter(
      toast => now - toast.timestamp < this.rateLimit.timeWindow
    );
  }

  /**
   * Check if rate limit is exceeded
   */
  private checkRateLimit(message: string): boolean {
    this.cleanupRecentToasts();
    
    if (this.recentToasts.length >= this.rateLimit.maxToasts) {
      return false;
    }

    this.recentToasts.push({
      message,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Check for duplicate toasts
   */
  private isDuplicate(message: string): boolean {
    const now = Date.now();
    return this.recentToasts.some(
      toast => toast.message === message && now - toast.timestamp < 2000
    );
  }

  /**
   * Add toast to queue
   */
  private addToQueue(message: string, config: ToastConfig): void {
    this.toastQueue.push({
      message,
      config,
      timestamp: Date.now(),
    });

    // Limit queue size
    if (this.toastQueue.length > 10) {
      this.toastQueue.shift();
    }
  }

  /**
   * Display the actual toast
   */
  private displayToast(message: string, config: ToastConfig): string {
    const {
      category = ToastCategory.INFO,
      duration = 4000,
      persistent = false,
      action,
      icon,
      description,
    } = config;

    const toastOptions = {
      duration: persistent ? Infinity : duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
      icon,
      description,
    };

    let toastId: string;

    switch (category) {
      case ToastCategory.SUCCESS:
        toastId = toast.success(message, toastOptions);
        break;
      case ToastCategory.ERROR:
        toastId = toast.error(message, toastOptions);
        break;
      case ToastCategory.WARNING:
        toastId = toast.warning(message, toastOptions);
        break;
      case ToastCategory.LOADING:
        toastId = toast.loading(message, toastOptions);
        break;
      default:
        toastId = toast.info(message, toastOptions);
    }

    // Store reference for potential updates/dismissal
    this.activeToasts.set(toastId, toast as any);

    return toastId;
  }

  /**
   * Set rate limiting configuration
   */
  setRateLimit(config: Partial<RateLimitConfig>): void {
    this.rateLimit = { ...this.rateLimit, ...config };
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { pending: number; active: number } {
    return {
      pending: this.toastQueue.length,
      active: this.activeToasts.size,
    };
  }
}

// Create singleton instance
export const toastManager = new EnhancedToastManager();

// Process queue periodically
if (typeof window !== "undefined") {
  setInterval(() => {
    toastManager.processQueue();
  }, 2000);
}

// Export convenience functions
export const showToast = toastManager.show.bind(toastManager);
export const showSuccess = toastManager.success.bind(toastManager);
export const showError = toastManager.error.bind(toastManager);
export const showWarning = toastManager.warning.bind(toastManager);
export const showInfo = toastManager.info.bind(toastManager);
export const showLoading = toastManager.loading.bind(toastManager);

// Default export
export default toastManager;