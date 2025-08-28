import { z } from 'zod';

/**
 * Environment variables validation schema
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URL'),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  
  // OAuth (optional for development)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Cloudinary (optional for development)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  
  // App settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validate and parse environment variables
 * This function should be called at application startup
 */
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

/**
 * Get a validated environment variable
 * This provides type-safe access to environment variables
 */
export function getEnv<K extends keyof z.infer<typeof envSchema>>(
  key: K
): z.infer<typeof envSchema>[K] {
  const value = process.env[key];
  
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  
  return value as z.infer<typeof envSchema>[K];
}

/**
 * Check if we're in development mode
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = () => process.env.NODE_ENV === 'test';

// Export the validated environment type
export type Env = z.infer<typeof envSchema>;
