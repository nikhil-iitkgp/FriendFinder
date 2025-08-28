import mongoose from 'mongoose';

// Interface for cached connection
interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global variable to cache the connection
declare global {
   
  var mongooseCache: CachedConnection | undefined;
}

// Initialize the global mongoose cache if it doesn't exist
if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}

const cached = global.mongooseCache;

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Database connection function with caching for serverless environments
 * Implements connection pooling and reuse to optimize performance
 */
async function dbConnect(): Promise<typeof mongoose> {
  // If we already have a cached connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // If we don't have a connection promise, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Connection pool settings for production
      maxPoolSize: process.env.NODE_ENV === 'production' ? 5 : 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      // Additional production optimizations
      maxIdleTimeMS: 30000,
      retryWrites: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts);
  }

  try {
    // Wait for the connection to be established
    cached.conn = await cached.promise;
    console.log('📦 MongoDB connected successfully');
    return cached.conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Reset the promise so we can try again
    cached.promise = null;
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * Useful for cleanup in tests or serverless functions
 */
async function dbDisconnect(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('📦 MongoDB disconnected');
  }
}

/**
 * Check if MongoDB is connected
 */
function isConnected(): boolean {
  return cached.conn?.connection.readyState === 1;
}

export { dbConnect, dbDisconnect, isConnected };
export default dbConnect;
