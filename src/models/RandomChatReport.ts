import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Report Evidence interface
 */
export interface IReportEvidence {
  messageIds: string[];
  screenshots?: string[];
  description?: string;
}

/**
 * Random Chat Report document interface
 */
export interface IRandomChatReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reporterUsername: string;
  reportedUserId: mongoose.Types.ObjectId;
  reportedUsername: string;
  sessionId: string;
  reason: 'spam' | 'inappropriate_content' | 'harassment' | 'fake_profile' | 'abusive_behavior' | 'other';
  description?: string;
  evidence?: IReportEvidence;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  adminNotes?: string;
  actionTaken?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  updatedAt: Date;

  // Instance methods
  markAsReviewed(adminId: mongoose.Types.ObjectId, notes?: string): Promise<IRandomChatReport>;
  resolve(adminId: mongoose.Types.ObjectId, actionTaken: string): Promise<IRandomChatReport>;
  dismiss(adminId: mongoose.Types.ObjectId, reason: string): Promise<IRandomChatReport>;
  updateSeverity(severity: 'low' | 'medium' | 'high' | 'critical'): Promise<IRandomChatReport>;
}

/**
 * Report Evidence schema
 */
const ReportEvidenceSchema = new Schema<IReportEvidence>({
  messageIds: [{
    type: String,
    required: true,
  }],
  screenshots: [{
    type: String, // URLs to stored screenshots
  }],
  description: {
    type: String,
    maxlength: [1000, 'Evidence description cannot exceed 1000 characters'],
  },
});

/**
 * Random Chat Report schema definition
 */
const RandomChatReportSchema = new Schema<IRandomChatReport>({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reporterUsername: {
    type: String,
    required: true,
  },
  reportedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reportedUsername: {
    type: String,
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  reason: {
    type: String,
    enum: ['spam', 'inappropriate_content', 'harassment', 'fake_profile', 'abusive_behavior', 'other'],
    required: true,
    index: true,
  },
  description: {
    type: String,
    maxlength: [2000, 'Report description cannot exceed 2000 characters'],
  },
  evidence: {
    type: ReportEvidenceSchema,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
    index: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  adminNotes: {
    type: String,
    maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
  },
  actionTaken: {
    type: String,
    maxlength: [1000, 'Action taken description cannot exceed 1000 characters'],
  },
  reviewedAt: {
    type: Date,
    index: true,
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
    index: true,
  },
}, {
  timestamps: true,
});

/**
 * Indexes for performance optimization
 */
RandomChatReportSchema.index({ reporterId: 1, createdAt: -1 });
RandomChatReportSchema.index({ reportedUserId: 1, createdAt: -1 });
RandomChatReportSchema.index({ status: 1, severity: -1, createdAt: -1 });
RandomChatReportSchema.index({ sessionId: 1 });
RandomChatReportSchema.index({ reason: 1, status: 1 });

/**
 * Compound index for admin dashboard queries
 */
RandomChatReportSchema.index({ status: 1, severity: -1, createdAt: -1 });

/**
 * Instance method: Mark report as reviewed
 */
RandomChatReportSchema.methods.markAsReviewed = async function(
  adminId: mongoose.Types.ObjectId,
  notes?: string
): Promise<IRandomChatReport> {
  this.status = 'reviewed';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

/**
 * Instance method: Resolve report
 */
RandomChatReportSchema.methods.resolve = async function(
  adminId: mongoose.Types.ObjectId,
  actionTaken: string
): Promise<IRandomChatReport> {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.reviewedBy = adminId;
  this.actionTaken = actionTaken;
  return this.save();
};

/**
 * Instance method: Dismiss report
 */
RandomChatReportSchema.methods.dismiss = async function(
  adminId: mongoose.Types.ObjectId,
  reason: string
): Promise<IRandomChatReport> {
  this.status = 'dismissed';
  this.resolvedAt = new Date();
  this.reviewedBy = adminId;
  this.adminNotes = reason;
  return this.save();
};

/**
 * Instance method: Update severity
 */
RandomChatReportSchema.methods.updateSeverity = async function(
  severity: 'low' | 'medium' | 'high' | 'critical'
): Promise<IRandomChatReport> {
  this.severity = severity;
  return this.save();
};

/**
 * Static method: Get user report statistics
 */
RandomChatReportSchema.statics.getUserReportStats = function(userId: mongoose.Types.ObjectId) {
  return this.aggregate([
    {
      $match: { reportedUserId: userId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        reasons: { $push: '$reason' }
      }
    }
  ]);
};

/**
 * Static method: Get pending reports count
 */
RandomChatReportSchema.statics.getPendingReportsCount = function() {
  return this.countDocuments({ status: 'pending' });
};

/**
 * Static method: Get reports by severity
 */
RandomChatReportSchema.statics.getReportsBySeverity = function(severity: 'low' | 'medium' | 'high' | 'critical') {
  return this.find({ severity, status: { $in: ['pending', 'reviewed'] } })
    .populate('reporterId', 'username email')
    .populate('reportedUserId', 'username email')
    .sort({ createdAt: -1 })
    .limit(100);
};

/**
 * Static method: Check if user has been reported recently
 */
RandomChatReportSchema.statics.hasRecentReports = function(
  userId: mongoose.Types.ObjectId,
  hours: number = 24
) {
  const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.countDocuments({
    reportedUserId: userId,
    createdAt: { $gte: timeAgo },
    status: { $ne: 'dismissed' }
  });
};

/**
 * Static method: Get daily report statistics
 */
RandomChatReportSchema.statics.getDailyReportStats = function(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          reason: '$reason'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        reports: {
          $push: {
            reason: '$_id.reason',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

/**
 * Pre-save middleware to auto-assign severity based on reason
 */
RandomChatReportSchema.pre('save', function(next) {
  if (this.isNew) {
    // Auto-assign severity based on reason
    switch (this.reason) {
      case 'harassment':
      case 'abusive_behavior':
        this.severity = 'high';
        break;
      case 'inappropriate_content':
        this.severity = 'medium';
        break;
      case 'spam':
      case 'fake_profile':
        this.severity = 'low';
        break;
      default:
        this.severity = 'medium';
    }
  }
  next();
});

const RandomChatReport: Model<IRandomChatReport> = mongoose.models.RandomChatReport || 
  mongoose.model<IRandomChatReport>('RandomChatReport', RandomChatReportSchema);

export default RandomChatReport;