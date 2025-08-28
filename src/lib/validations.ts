import { z } from 'zod';

// Common validation schemas

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

/**
 * Password validation schema
 * Requires at least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/**
 * Username validation schema
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(20, 'Username must be no more than 20 characters long')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores'
  );

/**
 * Location validation schema (GeoJSON Point)
 */
export const locationSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
});

/**
 * User registration validation schema
 */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/**
 * User login validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * User profile update validation schema
 */
export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(500, 'Bio must be no more than 500 characters').optional(),
  profilePicture: z.string().url('Invalid profile picture URL').optional(),
  isDiscoveryEnabled: z.boolean().optional(),
  discoveryRange: z.number().min(100).max(50000).optional(), // 100m to 50km
});

/**
 * Location update validation schema
 */
export const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * WiFi presence validation schema
 */
export const wifiPresenceSchema = z.object({
  bssid: z.string().min(1, 'BSSID is required'),
  ssid: z.string().optional(),
});

/**
 * Bluetooth ID validation schema
 */
export const bluetoothSchema = z.object({
  bluetoothId: z.string().min(1, 'Bluetooth ID is required'),
});

/**
 * Friend request validation schema
 */
export const friendRequestSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
});

/**
 * Message validation schema
 */
export const messageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message must be no more than 1000 characters'),
});

// Export type definitions for TypeScript
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type LocationUpdateData = z.infer<typeof locationUpdateSchema>;
export type WiFiPresenceData = z.infer<typeof wifiPresenceSchema>;
export type BluetoothData = z.infer<typeof bluetoothSchema>;
export type FriendRequestData = z.infer<typeof friendRequestSchema>;
export type MessageData = z.infer<typeof messageSchema>;
export type LocationData = z.infer<typeof locationSchema>;
