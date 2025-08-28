import dbConnect from './mongoose';
import { validateEnv } from './env';

/**
 * Initialize the database connection and validate environment
 * This should be called when the application starts
 */
export async function initializeDatabase() {
  try {
    // First validate environment variables
    validateEnv();
    
    // Then connect to the database
    await dbConnect();
    
    console.log('🚀 Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Graceful shutdown handler for the database
 */
export async function gracefulShutdown() {
  try {
    const { dbDisconnect } = await import('./mongoose');
    await dbDisconnect();
    console.log('🔄 Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
  }
}
