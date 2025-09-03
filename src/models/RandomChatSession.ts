import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Random Chat Session Participant interface
 */
export interface IRandomChatParticipant {
  userId: mongoose.Types.ObjectId;
  username: string;
  anonymousId: string;
  joinedAt: Date;
  isActive: boolean;
  leftAt?: Date;
}

/**
 * Random Chat Message interface
 */
export interface IRandomChatMessage {
  messageId: string;
  senderId: mongoose.Types.ObjectId;
  anonymousId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'system';
  isModerated?: boolean;
}

/**
 * Random Chat Session Preferences interface
 */
export interface IRandomChatPreferences {
  language?: string;
  interests?: string[];
  ageRange?: {
    min: number;
    max: number;
  };
}

/**
 * Random Chat Session Metadata interface
 */
export interface IRandomChatMetadata {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  endReason?: 'user_left' | 'partner_left' | 'reported' | 'timeout' | 'system_ended';
  messagesCount: number;
  reportCount: number;
}

/**
 * Random Chat Session document interface
 */
export interface IRandomChatSession extends Document {
  sessionId: string;
  participants: IRandomChatParticipant[];
  status: 'waiting' | 'active' | 'ended' | 'reported';
  chatType: 'text' | 'voice' | 'video';
  preferences: IRandomChatPreferences;
  messages: IRandomChatMessage[];
  metadata: IRandomChatMetadata;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addMessage(senderId: mongoose.Types.ObjectId, anonymousId: string, content: string, type?: 'text' | 'image' | 'system'): Promise<IRandomChatSession>;
  endSession(reason: 'user_left' | 'partner_left' | 'reported' | 'timeout' | 'system_ended'): Promise<IRandomChatSession>;
  getPartner(userId: mongoose.Types.ObjectId): IRandomChatParticipant | null;
  isParticipant(userId: mongoose.Types.ObjectId): boolean;
  getAnonymousId(userId: mongoose.Types.ObjectId): string | null;
}

/**
 * Random Chat Participant schema
 */
const RandomChatParticipantSchema = new Schema<IRandomChatParticipant>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  anonymousId: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  leftAt: {
    type: Date,
  },
});

/**
 * Random Chat Message schema
 */
const RandomChatMessageSchema = new Schema<IRandomChatMessage>({
  messageId: {
    type: String,
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  anonymousId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text',
  },
  isModerated: {
    type: Boolean,
    default: false,
  },
});

/**
 * Random Chat Preferences schema
 */
const RandomChatPreferencesSchema = new Schema<IRandomChatPreferences>({
  language: {
    type: String,
    default: 'en',
  },
  interests: [{
    type: String,
  }],
  ageRange: {
    min: {
      type: Number,
      min: 13,
      max: 100,
    },
    max: {
      type: Number,
      min: 13,
      max: 100,
    },
  },
});

/**
 * Random Chat Metadata schema
 */
const RandomChatMetadataSchema = new Schema<IRandomChatMetadata>({
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in seconds
  },
  endReason: {
    type: String,
    enum: ['user_left', 'partner_left', 'reported', 'timeout', 'system_ended'],
  },
  messagesCount: {
    type: Number,
    default: 0,
  },
  reportCount: {
    type: Number,
    default: 0,
  },
});

/**
 * Random Chat Session schema definition
 */
const RandomChatSessionSchema = new Schema<IRandomChatSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  participants: {
    type: [RandomChatParticipantSchema],
    validate: {
      validator: function(participants: IRandomChatParticipant[]) {
        return participants.length <= 2;
      },
      message: 'A session can have maximum 2 participants',
    },
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended', 'reported'],
    default: 'waiting',
    index: true,
  },
  chatType: {
    type: String,
    enum: ['text', 'voice', 'video'],
    default: 'text',
    index: true,
  },
  preferences: {
    type: RandomChatPreferencesSchema,
    default: {},
  },
  messages: {
    type: [RandomChatMessageSchema],
    default: [],
  },
  metadata: {
    type: RandomChatMetadataSchema,
    default: {},
  },
}, {
  timestamps: true,
});

/**
 * Indexes for performance optimization
 */
RandomChatSessionSchema.index({ sessionId: 1 });
RandomChatSessionSchema.index({ status: 1, chatType: 1 });
RandomChatSessionSchema.index({ 'participants.userId': 1 });
RandomChatSessionSchema.index({ createdAt: 1 });
RandomChatSessionSchema.index({ 'metadata.endTime': 1 });

/**
 * TTL index to auto-delete ended sessions after 7 days
 */
RandomChatSessionSchema.index(
  { 'metadata.endTime': 1 },
  { 
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days
    partialFilterExpression: { status: 'ended' }
  }
);

/**
 * Instance method: Add message to session
 */
RandomChatSessionSchema.methods.addMessage = async function(
  senderId: mongoose.Types.ObjectId,
  anonymousId: string,
  content: string,
  type: 'text' | 'image' | 'system' = 'text'
): Promise<IRandomChatSession> {
  const messageId = new mongoose.Types.ObjectId().toString();
  
  this.messages.push({
    messageId,
    senderId,
    anonymousId,
    content,
    type,
    timestamp: new Date(),
  });

  this.metadata.messagesCount = this.messages.length;
  return this.save();
};

/**
 * Instance method: End session
 */
RandomChatSessionSchema.methods.endSession = async function(
  reason: 'user_left' | 'partner_left' | 'reported' | 'timeout' | 'system_ended'
): Promise<IRandomChatSession> {
  this.status = 'ended';
  this.metadata.endTime = new Date();
  this.metadata.endReason = reason;
  
  if (this.metadata.startTime) {
    this.metadata.duration = Math.floor(
      (this.metadata.endTime.getTime() - this.metadata.startTime.getTime()) / 1000
    );
  }

  // Mark all participants as inactive
  this.participants.forEach(participant => {
    if (participant.isActive) {
      participant.isActive = false;
      participant.leftAt = new Date();
    }
  });

  return this.save();
};

/**
 * Instance method: Get partner for a given user
 */
RandomChatSessionSchema.methods.getPartner = function(
  userId: mongoose.Types.ObjectId
): IRandomChatParticipant | null {
  return this.participants.find(p => 
    !p.userId.equals(userId)
  ) || null;
};

/**
 * Instance method: Check if user is participant
 */
RandomChatSessionSchema.methods.isParticipant = function(
  userId: mongoose.Types.ObjectId
): boolean {
  return this.participants.some(p => p.userId.equals(userId));
};

/**
 * Instance method: Get anonymous ID for user
 */
RandomChatSessionSchema.methods.getAnonymousId = function(
  userId: mongoose.Types.ObjectId
): string | null {
  const participant = this.participants.find(p => p.userId.equals(userId));
  return participant ? participant.anonymousId : null;
};

/**
 * Static method: Generate unique session ID
 */
RandomChatSessionSchema.statics.generateSessionId = function(): string {
  return `session_${new mongoose.Types.ObjectId().toString()}_${Date.now()}`;
};

/**
 * Static method: Generate anonymous ID
 */
RandomChatSessionSchema.statics.generateAnonymousId = function(): string {
  const adjectives = ['Cool', 'Funny', 'Smart', 'Kind', 'Brave', 'Quick', 'Wise', 'Happy'];
  const nouns = ['Panda', 'Eagle', 'Tiger', 'Wolf', 'Fox', 'Bear', 'Lion', 'Owl'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  
  return `${adjective}${noun}${number}`;
};

/**
 * Static method: Find active session for user
 */
RandomChatSessionSchema.statics.findActiveSessionForUser = function(
  userId: mongoose.Types.ObjectId
) {
  return this.findOne({
    'participants.userId': userId,
    status: { $in: ['waiting', 'active'] },
  });
};

const RandomChatSession: Model<IRandomChatSession> = mongoose.models.RandomChatSession || 
  mongoose.model<IRandomChatSession>('RandomChatSession', RandomChatSessionSchema);

export default RandomChatSession;