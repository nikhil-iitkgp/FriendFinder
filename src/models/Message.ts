import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Message document interface
 */
export interface IMessage extends Document {
  // Core message fields
  chatId: string; // Conversation identifier
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'voice';
  
  // Message status
  status: 'sent' | 'delivered' | 'read';
  isDeleted: boolean;
  
  // File/media fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  
  // Reactions
  reactions?: Map<string, string>;
  
  // Reply functionality
  replyTo?: {
    _id: string;
    content: string;
    senderName: string;
  };
  
  // Edit tracking
  isEdited?: boolean;
  
  // Media attachments (for future expansion)
  attachments?: {
    type: 'image' | 'file';
    url: string;
    filename: string;
    size: number;
  }[];
  
  // Metadata
  editedAt?: Date;
  readAt?: Date;
  deliveredAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message schema definition
 */
const MessageSchema = new Schema<IMessage>({
  chatId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'voice'],
    default: 'text',
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
    index: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  }],
  editedAt: {
    type: Date,
  },
  readAt: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  fileUrl: {
    type: String,
  },
  fileName: {
    type: String,
  },
  fileSize: {
    type: Number,
  },
  reactions: {
    type: Map,
    of: String,
    default: new Map(),
  },
  replyTo: {
    _id: {
      type: String,
    },
    content: {
      type: String,
    },
    senderName: {
      type: String,
    },
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Don't include deleted messages in JSON output
      if (ret.isDeleted) {
        ret.content = 'This message was deleted';
        ret.attachments = [];
      }
      return ret;
    },
  },
});

/**
 * Indexes for performance optimization
 */
MessageSchema.index({ chatId: 1, createdAt: -1 }); // For chat message queries
MessageSchema.index({ senderId: 1, createdAt: -1 }); // For sender queries
MessageSchema.index({ receiverId: 1, status: 1 }); // For unread message counts
MessageSchema.index({ chatId: 1, status: 1 }); // For delivery status queries

/**
 * Static method to create chat ID from two user IDs
 */
MessageSchema.statics.createChatId = function(userId1: string, userId2: string): string {
  // Sort user IDs to ensure consistent chat ID regardless of order
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

/**
 * Static method to get messages for a chat
 */
MessageSchema.statics.getChatMessages = function(
  userId1: string,
  userId2: string,
  limit: number = 50,
  before?: Date
) {
  const sortedIds = [userId1, userId2].sort();
  const chatId = `${sortedIds[0]}_${sortedIds[1]}`;
  
  const query: any = {
    chatId,
    isDeleted: false,
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate('senderId', 'username profilePicture')
    .populate('receiverId', 'username profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to mark messages as read
 */
MessageSchema.statics.markAsRead = function(
  chatId: string,
  userId: string
) {
  return this.updateMany(
    {
      chatId,
      receiverId: userId,
      status: { $ne: 'read' },
    },
    {
      $set: {
        status: 'read',
        readAt: new Date(),
      },
    }
  );
};

/**
 * Static method to get unread message count
 */
MessageSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({
    receiverId: userId,
    status: { $ne: 'read' },
    isDeleted: false,
  });
};

/**
 * Static method to get chat list for a user
 */
MessageSchema.statics.getChatList = function(userId: string) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId) },
          { receiverId: new mongoose.Types.ObjectId(userId) }
        ],
        isDeleted: false,
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$chatId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                  { $ne: ['$status', 'read'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.senderId',
        foreignField: '_id',
        as: 'sender'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.receiverId',
        foreignField: '_id',
        as: 'receiver'
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);
};

/**
 * Message model with proper typing
 */
interface IMessageModel extends Model<IMessage> {
  createChatId(userId1: string, userId2: string): string;
  getChatMessages(
    userId1: string,
    userId2: string,
    limit?: number,
    before?: Date
  ): Promise<IMessage[]>;
  markAsRead(chatId: string, userId: string): Promise<any>;
  getUnreadCount(userId: string): Promise<number>;
  getChatList(userId: string): Promise<any[]>;
}

const Message = (mongoose.models.Message as IMessageModel) || 
  mongoose.model<IMessage, IMessageModel>('Message', MessageSchema);

export default Message;
