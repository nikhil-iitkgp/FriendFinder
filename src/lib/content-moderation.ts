/**
 * Content Moderation Utilities
 * Basic content filtering and moderation functions for random chat
 */

// List of inappropriate words/phrases (basic filter)
const INAPPROPRIATE_WORDS = [
  // Add more as needed - this is a basic example
  'spam', 'scam', 'fake', 'bot',
  // Note: In production, you'd want a more comprehensive filter
  // and potentially use an external moderation service
];

// List of suspicious patterns
const SUSPICIOUS_PATTERNS = [
  /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  /(?:https?:\/\/|www\.)[^\s]+/gi, // URLs
  /(.)\1{4,}/g, // Repeated characters (spam indicator)
];

/**
 * Content moderation result
 */
export interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
  filteredContent?: string;
}

/**
 * Rate limiting for messages
 */
const messageCounts = new Map<string, { count: number; lastReset: number }>();

/**
 * Check if content contains inappropriate words
 */
function containsInappropriateContent(content: string): boolean {
  const normalizedContent = content.toLowerCase();
  return INAPPROPRIATE_WORDS.some(word => 
    normalizedContent.includes(word.toLowerCase())
  );
}

/**
 * Check for suspicious patterns in content
 */
function containsSuspiciousPatterns(content: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check rate limiting for user
 */
function checkRateLimit(userId: string, windowMs: number = 60000, maxMessages: number = 10): boolean {
  const now = Date.now();
  const userCount = messageCounts.get(userId);
  
  if (!userCount || now - userCount.lastReset > windowMs) {
    // Reset count for new window
    messageCounts.set(userId, { count: 1, lastReset: now });
    return true;
  }
  
  if (userCount.count >= maxMessages) {
    return false; // Rate limit exceeded
  }
  
  userCount.count++;
  return true;
}

/**
 * Main content moderation function
 */
export function moderateContent(
  content: string, 
  userId: string,
  options: {
    checkRateLimit?: boolean;
    maxLength?: number;
    windowMs?: number;
    maxMessages?: number;
  } = {}
): ModerationResult {
  const {
    checkRateLimit: shouldCheckRateLimit = true,
    maxLength = 1000,
    windowMs = 60000,
    maxMessages = 10,
  } = options;

  // Check rate limiting
  if (shouldCheckRateLimit && !checkRateLimit(userId, windowMs, maxMessages)) {
    return {
      isAllowed: false,
      reason: 'Rate limit exceeded. Please slow down.',
      severity: 'medium',
    };
  }

  // Check content length
  if (content.length > maxLength) {
    return {
      isAllowed: false,
      reason: `Message too long. Maximum ${maxLength} characters allowed.`,
      severity: 'low',
    };
  }

  // Check for empty or whitespace-only content
  if (!content.trim()) {
    return {
      isAllowed: false,
      reason: 'Message cannot be empty.',
      severity: 'low',
    };
  }

  // Check for inappropriate content
  if (containsInappropriateContent(content)) {
    return {
      isAllowed: false,
      reason: 'Message contains inappropriate content.',
      severity: 'high',
    };
  }

  // Check for suspicious patterns
  if (containsSuspiciousPatterns(content)) {
    return {
      isAllowed: false,
      reason: 'Message contains suspicious content (URLs, phone numbers, etc.).',
      severity: 'medium',
    };
  }

  // Check for excessive caps (potential shouting/spam)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (content.length > 10 && capsRatio > 0.7) {
    return {
      isAllowed: false,
      reason: 'Please avoid excessive capital letters.',
      severity: 'low',
    };
  }

  // Content is allowed
  return {
    isAllowed: true,
    severity: 'low',
    filteredContent: content.trim(),
  };
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimitData(maxAgeMs: number = 3600000): void {
  const now = Date.now();
  
  for (const [userId, data] of messageCounts.entries()) {
    if (now - data.lastReset > maxAgeMs) {
      messageCounts.delete(userId);
    }
  }
}

/**
 * Auto-cleanup rate limit data every hour
 */
if (typeof window === 'undefined') {
  // Only run on server side
  setInterval(() => {
    cleanupRateLimitData();
  }, 3600000); // 1 hour
}

/**
 * Get user's current rate limit status
 */
export function getRateLimitStatus(userId: string, windowMs: number = 60000): {
  count: number;
  remaining: number;
  resetTime: number;
} {
  const userCount = messageCounts.get(userId);
  const maxMessages = 10;
  
  if (!userCount) {
    return {
      count: 0,
      remaining: maxMessages,
      resetTime: Date.now() + windowMs,
    };
  }
  
  return {
    count: userCount.count,
    remaining: Math.max(0, maxMessages - userCount.count),
    resetTime: userCount.lastReset + windowMs,
  };
}

/**
 * Report metrics for monitoring
 */
export function getModerationMetrics(): {
  totalUsers: number;
  averageMessageRate: number;
} {
  return {
    totalUsers: messageCounts.size,
    averageMessageRate: Array.from(messageCounts.values())
      .reduce((sum, data) => sum + data.count, 0) / Math.max(1, messageCounts.size),
  };
}