/**
 * Database optimization and indexing utilities
 * Ensures proper indexes are created for optimal query performance
 */

import mongoose from 'mongoose'
import User from '@/models/User'
import Message from '@/models/Message'
import { Conversation } from '@/models/Conversation'

/**
 * Initialize database indexes for optimal performance
 */
export async function initializeIndexes(): Promise<void> {
  try {
    console.log('🔧 Initializing database indexes...')

    // User model indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ username: 1 }, { unique: true })
    await User.collection.createIndex({ location: '2dsphere' }) // Geospatial index
    await User.collection.createIndex({ lastSeen: -1 }) // For presence queries
    await User.collection.createIndex({ 'friends': 1 }) // Friend lookups
    await User.collection.createIndex({ 'friendRequests.from': 1 }) // Friend request queries
    await User.collection.createIndex({ 'sentRequests.to': 1 }) // Sent request queries
    await User.collection.createIndex({ currentBSSID: 1 }) // WiFi discovery
    await User.collection.createIndex({ bluetoothId: 1 }) // Bluetooth discovery
    
    // Message model indexes
    await Message.collection.createIndex({ sender: 1, recipient: 1 }) // Conversation queries
    await Message.collection.createIndex({ createdAt: -1 }) // Recent messages
    await Message.collection.createIndex({ conversation: 1, createdAt: -1 }) // Conversation messages
    
    // Conversation model indexes
    await Conversation.collection.createIndex({ participants: 1 }) // Participant lookups
    await Conversation.collection.createIndex({ lastMessage: -1 }) // Recent conversations
    
    console.log('✅ Database indexes initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing database indexes:', error)
    // Don't throw error to prevent app startup failure
  }
}

/**
 * Clean up old location data and optimize collections
 */
export async function optimizeDatabase(): Promise<void> {
  try {
    console.log('🧹 Optimizing database...')
    
    // Remove users with corrupted location data
    await User.updateMany(
      { 
        $or: [
          { 'location.coordinates': { $not: { $size: 2 } } },
          { 'location.coordinates.0': { $not: { $type: 'number' } } },
          { 'location.coordinates.1': { $not: { $type: 'number' } } }
        ]
      },
      { $unset: { location: 1 } }
    )
    
    // Remove old messages (older than 30 days) to keep database lean
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await Message.deleteMany({ createdAt: { $lt: thirtyDaysAgo } })
    
    // Update last seen for users who haven't been seen in a while
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    await User.updateMany(
      { lastSeen: { $lt: sevenDaysAgo } },
      { $set: { isDiscoveryEnabled: false } }
    )
    
    console.log('✅ Database optimization completed')
  } catch (error) {
    console.error('❌ Error optimizing database:', error)
  }
}

/**
 * Get database health metrics
 */
export async function getDatabaseHealth(): Promise<{
  totalUsers: number
  activeUsers: number
  totalMessages: number
  totalConversations: number
  indexStats: any
}> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const [
      totalUsers,
      activeUsers,
      totalMessages,
      totalConversations
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastSeen: { $gte: fiveMinutesAgo } }),
      Message.countDocuments(),
      Conversation.countDocuments()
    ])
    
    // Get index statistics
    const indexStats = await User.collection.getIndexes()
    
    return {
      totalUsers,
      activeUsers,
      totalMessages,
      totalConversations,
      indexStats
    }
  } catch (error) {
    console.error('Error getting database health:', error)
    throw error
  }
}

/**
 * Cleanup corrupted geospatial data
 */
export async function cleanupLocationData(): Promise<void> {
  try {
    console.log('🔧 Cleaning up location data...')
    
    // Find and fix invalid location coordinates
    const usersWithInvalidLocations = await User.find({
      $or: [
        { 'location.coordinates': { $not: { $size: 2 } } },
        { 'location.coordinates.0': { $not: { $type: 'number' } } },
        { 'location.coordinates.1': { $not: { $type: 'number' } } },
        { 'location.coordinates.0': { $lt: -180 } },
        { 'location.coordinates.0': { $gt: 180 } },
        { 'location.coordinates.1': { $lt: -90 } },
        { 'location.coordinates.1': { $gt: 90 } }
      ]
    })
    
    for (const user of usersWithInvalidLocations) {
      await User.findByIdAndUpdate(user._id, { $unset: { location: 1 } })
    }
    
    console.log(`✅ Cleaned up ${usersWithInvalidLocations.length} invalid location records`)
  } catch (error) {
    console.error('❌ Error cleaning up location data:', error)
  }
}

export default {
  initializeIndexes,
  optimizeDatabase,
  getDatabaseHealth,
  cleanupLocationData
}
