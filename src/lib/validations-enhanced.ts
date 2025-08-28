import { z } from 'zod';

// Enhanced validation schemas with security measures

// Message validation
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long (max 1000 characters)')
    .refine(
      (val) => val.trim().length > 0,
      'Message cannot be only whitespace'
    ),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
  metadata: z.object({
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    imageUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
  }).optional()
});

// Friend request validation
export const friendRequestSchema = z.object({
  targetUserId: z.string()
    .min(1, 'User ID is required')
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID format')
});

export const friendResponseSchema = z.object({
  requestId: z.string()
    .min(1, 'Request ID is required')
    .regex(/^[a-f\d]{24}$/i, 'Invalid request ID format'),
  action: z.enum(['accept', 'reject'])
});

// Profile update validation (enhanced)
export const profileUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name too long (max 50 characters)')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  bio: z.string()
    .max(500, 'Bio too long (max 500 characters)')
    .optional(),
  isDiscoveryEnabled: z.boolean(),
  discoveryRange: z.number()
    .min(100, 'Minimum range is 100 meters')
    .max(50000, 'Maximum range is 50km'),
  profilePicture: z.string()
    .url('Invalid image URL')
    .optional()
});

// Location validation (enhanced)
export const locationUpdateSchema = z.object({
  latitude: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
  accuracy: z.number()
    .min(0, 'Accuracy must be positive')
    .max(10000, 'Accuracy too high')
    .optional(),
  timestamp: z.string()
    .datetime('Invalid timestamp')
    .refine(
      (val) => {
        const time = new Date(val);
        const now = new Date();
        const diffMinutes = (now.getTime() - time.getTime()) / (1000 * 60);
        return diffMinutes <= 5; // Location must be within 5 minutes
      },
      'Location timestamp too old'
    )
});

// Registration validation (enhanced security)
export const registrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// Login validation
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long')
});

// Search validation
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query too long')
    .regex(/^[a-zA-Z0-9\s\-_.@]+$/, 'Search contains invalid characters'),
  discoveryMethod: z.enum(['gps', 'wifi', 'bluetooth']).optional(),
  maxDistance: z.number()
    .min(100)
    .max(50000)
    .optional()
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024, // 5MB
      'File too large (max 5MB)'
    )
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Invalid file type (JPEG, PNG, WebP only)'
    )
});

// API rate limiting validation
export const rateLimitSchema = z.object({
  action: z.string(),
  timestamp: z.number(),
  ip: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-f0-9:]+$/i, 'Invalid IP address')
});

// Environment variables validation
export const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

// Sanitization helpers
export const sanitizers = {
  removeHtml: (str: string) => str.replace(/<[^>]*>/g, ''),
  trimWhitespace: (str: string) => str.trim().replace(/\s+/g, ' '),
  escapeSpecialChars: (str: string) => 
    str.replace(/[<>&"']/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char] || char;
    })
};

// Type exports
export type MessageInput = z.infer<typeof messageSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type FriendResponseInput = z.infer<typeof friendResponseSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type EnvConfig = z.infer<typeof envSchema>;
