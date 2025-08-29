import mongoose, { Schema, Document, Model } from 'mongoose';

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
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

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

// Create and export model
export const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
