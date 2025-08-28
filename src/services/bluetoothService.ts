export interface BluetoothUser {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  lastSeenBluetooth: Date;
  lastSeen: Date;
  isFriend: boolean;
  hasPendingRequestFrom: boolean;
  hasPendingRequestTo: boolean;
}

export interface BluetoothStatus {
  hasBluetooth: boolean;
  lastSeenBluetooth?: Date;
}

export interface NearbyBluetoothResponse {
  users: BluetoothUser[];
  count: number;
  deviceId: string;
}

export const bluetoothService = {
  async updateBluetooth(bluetoothId: string): Promise<{ success: boolean; message: string; lastSeenBluetooth?: Date }> {
    const response = await fetch("/api/users/bluetooth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bluetoothId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update Bluetooth");
    }

    return response.json();
  },

  async clearBluetooth(): Promise<{ success: boolean; message: string }> {
    const response = await fetch("/api/users/bluetooth", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to clear Bluetooth");
    }

    return response.json();
  },

  async getBluetoothStatus(): Promise<BluetoothStatus> {
    const response = await fetch("/api/users/bluetooth");
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get Bluetooth status");
    }

    return response.json();
  },

  async getNearbyUsers(): Promise<NearbyBluetoothResponse> {
    const response = await fetch("/api/users/nearby-bluetooth");
    
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