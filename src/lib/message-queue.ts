export interface MessageData {
  id: string
  type: 'friend_request' | 'friend_response' | 'message' | 'typing' | 'presence'
  payload: any
  timestamp: Date
  retryCount: number
  priority: 'low' | 'medium' | 'high'
  expiresAt?: Date
}

export interface QueueStatus {
  pending: number
  processing: number
  failed: number
  totalProcessed: number
  lastSync: Date | null
}

export class MessageQueue {
  private queue: MessageData[] = []
  private processing: Set<string> = new Set()
  private failed: MessageData[] = []
  private totalProcessed = 0
  private lastSync: Date | null = null
  private syncInterval: NodeJS.Timeout | null = null
  
  constructor(private syncIntervalMs = 5000) {}
  
  enqueue(message: Omit<MessageData, 'id' | 'timestamp' | 'retryCount'>): string {
    const messageData: MessageData = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
      retryCount: 0
    }
    
    // Add expiration for non-critical messages
    if (message.priority === 'low') {
      messageData.expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    } else if (message.priority === 'medium') {
      messageData.expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    }
    
    // Insert based on priority
    const insertIndex = this.findInsertIndex(messageData)
    this.queue.splice(insertIndex, 0, messageData)
    
    console.log(`Message queued: ${messageData.type} (${messageData.priority})`)
    return messageData.id
  }
  
  private findInsertIndex(newMessage: MessageData): number {
    const priorityValues = { high: 3, medium: 2, low: 1 }
    const newPriority = priorityValues[newMessage.priority]
    
    for (let i = 0; i < this.queue.length; i++) {
      const currentPriority = priorityValues[this.queue[i].priority]
      if (newPriority > currentPriority) {
        return i
      }
    }
    return this.queue.length
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  async processQueue(): Promise<void> {
    // Remove expired messages
    this.removeExpiredMessages()
    
    if (this.queue.length === 0) {
      return
    }
    
    const batch = this.queue.splice(0, Math.min(5, this.queue.length))
    
    for (const message of batch) {
      if (this.processing.has(message.id)) {
        continue
      }
      
      this.processing.add(message.id)
      
      try {
        await this.processMessage(message)
        this.processing.delete(message.id)
        this.totalProcessed++
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error)
        this.processing.delete(message.id)
        
        message.retryCount++
        
        if (message.retryCount < 3) {
          // Re-queue with lower priority
          message.priority = 'low'
          this.queue.push(message)
        } else {
          this.failed.push(message)
        }
      }
    }
    
    this.lastSync = new Date()
  }
  
  private removeExpiredMessages(): void {
    const now = new Date()
    const initialLength = this.queue.length
    
    this.queue = this.queue.filter(message => 
      !message.expiresAt || message.expiresAt > now
    )
    
    const expiredCount = initialLength - this.queue.length
    if (expiredCount > 0) {
      console.log(`Removed ${expiredCount} expired messages from queue`)
    }
  }
  
  private async processMessage(message: MessageData): Promise<void> {
    switch (message.type) {
      case 'friend_request':
        await this.sendFriendRequestHTTP(message.payload)
        break
        
      case 'friend_response':
        await this.sendFriendResponseHTTP(message.payload)
        break
        
      case 'message':
        await this.sendMessageHTTP(message.payload)
        break
        
      case 'presence':
        await this.updatePresenceHTTP(message.payload)
        break
        
      case 'typing':
        // Skip typing indicators in HTTP mode (not critical)
        break
        
      default:
        throw new Error(`Unsupported message type: ${message.type}`)
    }
  }
  
  private async sendFriendRequestHTTP(payload: any): Promise<void> {
    const response = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }
  
  private async sendFriendResponseHTTP(payload: any): Promise<void> {
    const response = await fetch('/api/friends/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }
  
  private async sendMessageHTTP(payload: any): Promise<void> {
    const response = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }
  
  private async updatePresenceHTTP(payload: any): Promise<void> {
    const response = await fetch('/api/users/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }
  
  startAutoSync(): void {
    if (this.syncInterval) {
      this.stopAutoSync()
    }
    
    this.syncInterval = setInterval(() => {
      this.processQueue().catch(error => 
        console.error('Auto-sync error:', error)
      )
    }, this.syncIntervalMs)
    
    console.log(`Message queue auto-sync started (${this.syncIntervalMs}ms interval)`)
  }
  
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('Message queue auto-sync stopped')
    }
  }
  
  getStatus(): QueueStatus {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      failed: this.failed.length,
      totalProcessed: this.totalProcessed,
      lastSync: this.lastSync
    }
  }
  
  retryFailed(): void {
    const failedMessages = this.failed.splice(0)
    
    for (const message of failedMessages) {
      message.retryCount = 0
      message.priority = 'medium'
      this.queue.push(message)
    }
    
    console.log(`Re-queued ${failedMessages.length} failed messages`)
  }
  
  clear(): void {
    this.queue = []
    this.failed = []
    this.processing.clear()
    this.totalProcessed = 0
    this.lastSync = null
    console.log('Message queue cleared')
  }
}

export const messageQueue = new MessageQueue()