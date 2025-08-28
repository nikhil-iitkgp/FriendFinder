import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Message interface
 */
export interface IMessage extends Document {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Conversation interface
 */
export interface IConversation extends Document {
  _id: string;
  participants: string[];
  type: 'private' | 'group';
  name?: string; // For group conversations
  description?: string; // For group conversations
  lastMessage?: {
    messageId: string;
    content: string;
    senderId: string;
    timestamp: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message Schema
 */
const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  readBy: [{
    userId: {
      type: String,
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  editedAt: {
    type: Date
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

/**
 * Conversation Schema
 */
const ConversationSchema = new Schema<IConversation>({
  participants: [{
    type: String,
    required: true
  }],
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  name: {
    type: String,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  lastMessage: {
    messageId: String,
    content: String,
    senderId: String,
    timestamp: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

// Methods for Message
MessageSchema.methods.markAsRead = function(userId: string) {
  const existing = this.readBy.find((read: any) => read.userId === userId);
  if (!existing) {
    this.readBy.push({ userId, readAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

MessageSchema.methods.isReadBy = function(userId: string): boolean {
  return this.readBy.some((read: any) => read.userId === userId);
};

// Methods for Conversation
ConversationSchema.methods.updateLastMessage = function(message: any) {
  this.lastMessage = {
    messageId: message._id,
    content: message.content,
    senderId: message.senderId,
    timestamp: message.createdAt
  };
  return this.save();
};

ConversationSchema.methods.addParticipant = function(userId: string) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

ConversationSchema.methods.removeParticipant = function(userId: string) {
  this.participants = this.participants.filter((id: string) => id !== userId);
  if (this.participants.length === 0) {
    this.isActive = false;
  }
  return this.save();
};

// Static methods for finding conversations
ConversationSchema.statics.findByParticipants = function(participants: string[]) {
  return this.findOne({
    participants: { $all: participants, $size: participants.length },
    type: 'private',
    isActive: true
  });
};

ConversationSchema.statics.findUserConversations = function(userId: string) {
  return this.find({
    participants: userId,
    isActive: true
  }).sort({ updatedAt: -1 });
};

// Static methods for Message
MessageSchema.statics.findByConversation = function(conversationId: string, limit = 50, before?: Date) {
  const query: any = { conversationId, deletedAt: { $exists: false } };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

MessageSchema.statics.markConversationAsRead = function(conversationId: string, userId: string) {
  return this.updateMany(
    { 
      conversationId,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId }
    },
    { 
      $push: { 
        readBy: { 
          userId, 
          readAt: new Date() 
        } 
      } 
    }
  );
};

// Create and export models
export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
