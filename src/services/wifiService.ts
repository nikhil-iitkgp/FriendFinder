export interface WifiUser {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  lastSeenWiFi: Date;
  lastSeen: Date;
  isFriend: boolean;
  hasPendingRequestFrom: boolean;
  hasPendingRequestTo: boolean;
}

export interface WifiStatus {
  hasWiFi: boolean;
  lastSeenWiFi?: Date;
}

export interface NearbyWifiResponse {
  users: WifiUser[];
  count: number;
  networkHash: string;
}

export const wifiService = {
  async updateWifi(ssid: string): Promise<{ success: boolean; message: string; lastSeenWiFi?: Date }> {
    const response = await fetch("/api/users/wifi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ssid }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update WiFi");
    }

    return response.json();
  },

  async getWifiStatus(): Promise<WifiStatus> {
    const response = await fetch("/api/users/wifi");
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get WiFi status");
    }

    return response.json();
  },

  async getNearbyUsers(): Promise<NearbyWifiResponse> {
    const response = await fetch("/api/users/nearby-wifi");
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get nearby users");
    }

    return response.json();
  },

  async sendFriendRequest(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send friend request");
    }

    return response.json();
  }
};
