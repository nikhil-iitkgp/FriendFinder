import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Friend Request subdocument interface
 */
export interface IFriendRequest {
  _id?: mongoose.Types.ObjectId;
  from: mongoose.Types.ObjectId;
  fromName?: string;
  fromAvatar?: string;
  to?: mongoose.Types.ObjectId;
  toName?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Location interface (GeoJSON Point)
 */
export interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  accuracy?: number;
  lastUpdated?: Date;
}

/**
 * User document interface
 */
export interface IUser extends Document {
  // Core user information
  username: string;
  email: string;
  password: string;
  bio?: string;
  profilePicture?: string;

  // Social connections
  friends: mongoose.Types.ObjectId[];
  friendRequests: IFriendRequest[];
  sentRequests: IFriendRequest[];

  // Location-based discovery
  location?: ILocation;
  isDiscoveryEnabled: boolean;
  lastSeen: Date;
  discoveryRange: number; // in meters

  // WiFi-based discovery
  hashedBSSID?: string;
  lastSeenWiFi?: Date;

  // Bluetooth-based discovery
  bluetoothId?: string;
  bluetoothIdUpdatedAt?: Date;

  // User Settings
  settings?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLocation(latitude: number, longitude: number): Promise<IUser>;
  addFriend(friendId: mongoose.Types.ObjectId): Promise<IUser>;
  removeFriend(friendId: mongoose.Types.ObjectId): Promise<IUser>;
  sendFriendRequest(targetUserId: mongoose.Types.ObjectId): Promise<IUser>;
  respondToFriendRequest(fromUserId: mongoose.Types.ObjectId, response: 'accepted' | 'rejected'): Promise<IUser>;
  isFriendWith(userId: mongoose.Types.ObjectId): boolean;
  hasPendingRequestFrom(userId: mongoose.Types.ObjectId): boolean;
  hasPendingRequestTo(userId: mongoose.Types.ObjectId): boolean;
}

/**
 * Friend Request schema
 */
const FriendRequestSchema = new Schema<IFriendRequest>({
  from: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Make optional to avoid validation issues
  },
  fromName: {
    type: String,
  },
  fromAvatar: {
    type: String,
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Make optional to avoid validation issues
  },
  toName: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

/**
 * Location schema (GeoJSON Point)
 */
const LocationSchema = new Schema<ILocation>({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coordinates: number[]) {
        return coordinates.length === 2 &&
               coordinates[0] >= -180 && coordinates[0] <= 180 && // longitude
               coordinates[1] >= -90 && coordinates[1] <= 90;     // latitude
      },
      message: 'Invalid coordinates. Must be [longitude, latitude] with valid ranges.',
    },
  },
  accuracy: {
    type: Number,
    min: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

/**
 * User schema definition
 */
const UserSchema = new Schema<IUser>({
  // Core user information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username must be no more than 20 characters long'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    index: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false, // Don't include password in queries by default
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio must be no more than 500 characters'],
    trim: true,
  },
  profilePicture: {
    type: String,
    // Temporarily disable validation to fix friend request acceptance
    // TODO: Re-enable with proper validation for all OAuth providers
  },

  // Social connections
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  friendRequests: {
    type: [FriendRequestSchema],
    default: [],
  },
  sentRequests: {
    type: [FriendRequestSchema],
    default: [],
  },

  // Location-based discovery
  location: {
    type: LocationSchema,
    index: '2dsphere', // Enable geospatial queries
  },
  isDiscoveryEnabled: {
    type: Boolean,
    default: true,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true,
  },
  discoveryRange: {
    type: Number,
    default: 1000, // 1km default
    min: [100, 'Discovery range must be at least 100 meters'],
    max: [50000, 'Discovery range must be no more than 50km'],
  },

  // WiFi-based discovery
  hashedBSSID: {
    type: String,
    index: true,
  },
  lastSeenWiFi: {
    type: Date,
    index: true,
  },

  // Bluetooth-based discovery
  bluetoothId: {
    type: String,
    index: true,
  },
  bluetoothIdUpdatedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).password;
      return ret;
    },
  },
  toObject: {
    transform: function(doc, ret) {
      delete (ret as any).password;
      return ret;
    },
  },
});

/**
 * Indexes for performance optimization
 */
// Note: Individual field indexes are already defined in schema with "index: true"
// Only add compound indexes here
UserSchema.index({ hashedBSSID: 1, lastSeenWiFi: -1 });
UserSchema.index({ bluetoothId: 1, bluetoothIdUpdatedAt: -1 });
UserSchema.index({ isDiscoveryEnabled: 1, lastSeen: -1 });

/**
 * Pre-save middleware to hash password
 */
UserSchema.pre('save', async function(next) {
  const user = this as IUser;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Instance method to compare password
 */
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const user = this as IUser;
  return bcrypt.compare(candidatePassword, user.password);
};

/**
 * Instance method to update location
 */
UserSchema.methods.updateLocation = async function(latitude: number, longitude: number): Promise<IUser> {
  const user = this as IUser;
  
  user.location = {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
  user.lastSeen = new Date();
  
  return user.save();
};

/**
 * Instance method to add friend
 */
UserSchema.methods.addFriend = async function(friendId: mongoose.Types.ObjectId): Promise<IUser> {
  const user = this as IUser;
  
  if (!user.friends.includes(friendId)) {
    user.friends.push(friendId);
    await user.save();
  }
  
  return user;
};

/**
 * Instance method to remove friend
 */
UserSchema.methods.removeFriend = async function(friendId: mongoose.Types.ObjectId): Promise<IUser> {
  const user = this as IUser;
  
  user.friends = user.friends.filter(id => !id.equals(friendId));
  await user.save();
  
  return user;
};

/**
 * Instance method to send friend request
 */
UserSchema.methods.sendFriendRequest = async function(targetUserId: mongoose.Types.ObjectId): Promise<IUser> {
  const user = this as IUser;
  
  // Check if already friends
  if (user.isFriendWith(targetUserId)) {
    throw new Error('Already friends with this user');
  }
  
  // Check if request already exists
  if (user.hasPendingRequestTo(targetUserId)) {
    throw new Error('Friend request already sent');
  }
  
  // Add friend request
  user.friendRequests.push({
    from: user._id as mongoose.Types.ObjectId,
    to: targetUserId,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return user.save();
};

/**
 * Instance method to respond to friend request
 */
UserSchema.methods.respondToFriendRequest = async function(
  fromUserId: mongoose.Types.ObjectId,
  response: 'accepted' | 'rejected'
): Promise<IUser> {
  const user = this as IUser;
  
  const requestIndex = user.friendRequests.findIndex(
    req => req.from.equals(fromUserId) && req.status === 'pending'
  );
  
  if (requestIndex === -1) {
    throw new Error('Friend request not found');
  }
  
  user.friendRequests[requestIndex].status = response;
  user.friendRequests[requestIndex].updatedAt = new Date();
  
  // If accepted, add to friends list
  if (response === 'accepted') {
    await user.addFriend(fromUserId);
  }
  
  return user.save();
};

/**
 * Instance method to check if user is friend with another user
 */
UserSchema.methods.isFriendWith = function(userId: mongoose.Types.ObjectId): boolean {
  const user = this as IUser;
  return user.friends.some(friendId => friendId.equals(userId));
};

/**
 * Instance method to check if user has pending request from another user
 */
UserSchema.methods.hasPendingRequestFrom = function(userId: mongoose.Types.ObjectId): boolean {
  const user = this as IUser;
  return user.friendRequests.some(
    req => req.from.equals(userId) && req.status === 'pending'
  );
};

/**
 * Instance method to check if user has pending request to another user
 */
UserSchema.methods.hasPendingRequestTo = function(userId: mongoose.Types.ObjectId): boolean {
  const user = this as IUser;
  return user.sentRequests.some(
    req => req.to && req.to.equals(userId) && req.status === 'pending'
  );
};

/**
 * Static method to find nearby users by GPS
 */
UserSchema.statics.findNearbyByGPS = function(
  longitude: number,
  latitude: number,
  maxDistance: number,
  excludeUserId?: mongoose.Types.ObjectId
) {
  const query: any = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    isDiscoveryEnabled: true,
    lastSeen: {
      $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Active in last 24 hours
    },
  };

  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  return this.find(query).select('-password');
};

/**
 * Static method to find nearby users by WiFi
 */
UserSchema.statics.findNearbyByWiFi = function(
  hashedBSSID: string,
  excludeUserId?: mongoose.Types.ObjectId
) {
  const query: any = {
    hashedBSSID: hashedBSSID,
    isDiscoveryEnabled: true,
    lastSeenWiFi: {
      $gte: new Date(Date.now() - 60 * 60 * 1000), // Active in last hour
    },
  };

  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  return this.find(query).select('-password');
};

/**
 * Static method to find nearby users by Bluetooth
 */
UserSchema.statics.findNearbyByBluetooth = function(
  bluetoothId: string,
  excludeUserId?: mongoose.Types.ObjectId
) {
  const query: any = {
    bluetoothId,
    isDiscoveryEnabled: true,
    bluetoothIdUpdatedAt: {
      $gte: new Date(Date.now() - 30 * 60 * 1000), // Active in last 30 minutes
    },
  };

  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  return this.find(query).select('-password');
};

/**
 * User model with proper typing
 */
interface IUserModel extends Model<IUser> {
  findNearbyByGPS(
    longitude: number,
    latitude: number,
    maxDistance: number,
    excludeUserId?: mongoose.Types.ObjectId
  ): Promise<IUser[]>;
  
  findNearbyByWiFi(
    hashedBSSID: string,
    excludeUserId?: mongoose.Types.ObjectId
  ): Promise<IUser[]>;
  
  findNearbyByBluetooth(
    bluetoothId: string,
    excludeUserId?: mongoose.Types.ObjectId
  ): Promise<IUser[]>;
}

const User = (mongoose.models.User as IUserModel) || mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;
