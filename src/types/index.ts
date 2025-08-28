// Global type definitions for the FriendFinder application

/**
 * User-related types
 */
export interface User {
  _id: string;
  username: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  isDiscoveryEnabled: boolean;
  discoveryRange: number;
  friends: string[];
  friendRequests: FriendRequest[];
  location?: Location;
  lastSeen: Date;
  currentBSSID?: string;
  lastSeenWiFi?: Date;
  bluetoothId?: string;
  bluetoothIdUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location type (GeoJSON Point)
 */
export interface Location {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Friend request type
 */
export interface FriendRequest {
  from: string; // User ID
  to: string;   // User ID
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message type
 */
export interface Message {
  _id: string;
  sender: string;    // User ID
  recipient: string; // User ID
  content: string;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Discovery method types
 */
export type DiscoveryMethod = 'gps' | 'wifi' | 'bluetooth';

/**
 * Nearby user result
 */
export interface NearbyUser {
  _id: string;
  username: string;
  profilePicture?: string;
  bio?: string;
  distance: number; // in meters
  lastSeen: Date;
  discoveryMethod: DiscoveryMethod;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination type
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: Pagination;
}

/**
 * Socket event types
 */
export interface SocketEvents {
  // Friend-related events
  friend_request_sent: {
    requestId: string;
    from: User;
    to: User;
  };
  friend_request_received: {
    requestId: string;
    from: User;
  };
  friend_request_accepted: {
    requestId: string;
    friend: User;
  };
  
  // Message events
  new_message: Message;
  message_read: {
    messageId: string;
    readBy: string;
    readAt: Date;
  };
  
  // Call events
  call_request: {
    callId: string;
    from: User;
    callType: 'voice' | 'video';
  };
  call_accepted: {
    callId: string;
  };
  call_rejected: {
    callId: string;
  };
  call_ended: {
    callId: string;
  };
  
  // WebRTC signaling
  ice_candidate: {
    candidate: RTCIceCandidate;
    callId: string;
  };
  offer: {
    offer: RTCSessionDescriptionInit;
    callId: string;
  };
  answer: {
    answer: RTCSessionDescriptionInit;
    callId: string;
  };
}

/**
 * Auth context type
 */
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
}

/**
 * Form states
 */
export interface FormState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Geolocation position type
 */
export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: number;
}

/**
 * WiFi network info type
 */
export interface WiFiNetworkInfo {
  bssid: string;
  ssid?: string;
  signal?: number;
  frequency?: number;
}

/**
 * Bluetooth device info type
 */
export interface BluetoothDeviceInfo {
  id: string;
  name?: string;
  rssi?: number;
}

/**
 * Call state type
 */
export interface CallState {
  isCallActive: boolean;
  callType: 'voice' | 'video' | null;
  callId: string | null;
  isIncoming: boolean;
  caller?: User;
  recipient?: User;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
