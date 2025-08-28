'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface WiFiNetwork {
  bssid: string;
  ssid: string;
  signalStrength: number;
  frequency: number;
  security: string;
  lastSeen: Date;
}

export interface WiFiState {
  isAvailable: boolean;
  hasPermission: boolean;
  isScanning: boolean;
  currentNetwork: WiFiNetwork | null;
  nearbyNetworks: WiFiNetwork[];
  error: string | null;
}

export interface WiFiActions {
  requestPermission: () => Promise<boolean>;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;
  updatePresence: () => Promise<void>;
  findNearbyUsers: () => Promise<any[]>;
  connectToNetwork: (bssid: string) => Promise<boolean>;
  cleanup: () => Promise<void>;
}

export interface UseWiFiReturn extends WiFiState, WiFiActions {}

/**
 * Mock WiFi networks for demonstration
 */
const mockNetworks: WiFiNetwork[] = [
  {
    bssid: '00:11:22:33:44:55',
    ssid: 'FriendFinder_Office_5G',
    signalStrength: 85,
    frequency: 5180,
    security: 'WPA2',
    lastSeen: new Date()
  },
  {
    bssid: '66:77:88:99:AA:BB',
    ssid: 'CoffeeShop_Guest',
    signalStrength: 72,
    frequency: 2437,
    security: 'Open',
    lastSeen: new Date()
  },
  {
    bssid: 'CC:DD:EE:FF:00:11',
    ssid: 'University_WiFi',
    signalStrength: 56,
    frequency: 5745,
    security: 'WPA3',
    lastSeen: new Date()
  }
];

export const useWiFi = (): UseWiFiReturn => {
  const { data: session } = useSession();
  const [state, setState] = useState<WiFiState>({
    isAvailable: false,
    hasPermission: false,
    isScanning: false,
    currentNetwork: null,
    nearbyNetworks: [],
    error: null
  });

  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WiFi on mount
  useEffect(() => {
    const initializeWiFi = async () => {
      try {
        console.log('📶 [useWiFi] Initializing WiFi...');
        
        // Check if WiFi APIs are available (simulated for web)
        const available = typeof navigator !== 'undefined' && 'onLine' in navigator;
        setState(prev => ({ ...prev, isAvailable: available }));

        if (available) {
          // Auto-grant permission for demo (in real app, this would require user consent)
          setState(prev => ({ ...prev, hasPermission: true }));
          
          // Set a mock current network
          const currentNetwork = mockNetworks[0];
          setState(prev => ({ ...prev, currentNetwork }));
          
          console.log('📶 [useWiFi] WiFi initialized successfully');
        } else {
          console.warn('📶 [useWiFi] WiFi not available on this device');
        }
      } catch (error) {
        console.error('📶 [useWiFi] Failed to initialize WiFi:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to initialize WiFi'
        }));
      }
    };

    initializeWiFi();

    // Cleanup on unmount
    return () => {
      cleanupIntervals();
    };
  }, []);

  const cleanupIntervals = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📶 [useWiFi] Requesting WiFi permission...');
      
      // Simulate permission request (in real app, this would request location/WiFi permissions)
      const granted = Math.random() > 0.2; // 80% success rate
      setState(prev => ({ ...prev, hasPermission: granted }));
      
      if (!granted) {
        setState(prev => ({ 
          ...prev, 
          error: 'WiFi permission denied'
        }));
      }
      
      return granted;
    } catch (error) {
      console.error('📶 [useWiFi] Permission request failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request WiFi permission'
      }));
      return false;
    }
  }, []);

  const updatePresence = useCallback(async (): Promise<void> => {
    if (!session?.user || !state.currentNetwork) {
      console.log('📶 [useWiFi] No session or current network, skipping presence update');
      return;
    }

    try {
      console.log('📶 [useWiFi] Updating WiFi presence...');
      
      const response = await fetch('/api/users/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bssid: state.currentNetwork.bssid })
      });

      if (!response.ok) {
        throw new Error(`Failed to update presence: ${response.statusText}`);
      }

      console.log('📶 [useWiFi] ✅ WiFi presence updated successfully');
    } catch (error) {
      console.error('📶 [useWiFi] Failed to update WiFi presence:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to update WiFi presence'
      }));
    }
  }, [session, state.currentNetwork]);

  const startScanning = useCallback(async (): Promise<void> => {
    if (!state.isAvailable || !state.hasPermission) {
      console.warn('📶 [useWiFi] Cannot start scanning: not available or no permission');
      return;
    }

    try {
      console.log('📶 [useWiFi] Starting WiFi scanning...');
      setState(prev => ({ ...prev, isScanning: true, error: null }));

      // Simulate scanning for networks
      const scanNetworks = () => {
        // Randomly return 1-3 networks
        const networkCount = Math.floor(Math.random() * 3) + 1;
        const networks = mockNetworks.slice(0, networkCount).map(network => ({
          ...network,
          signalStrength: Math.floor(Math.random() * 40) + 50, // Random strength 50-90
          lastSeen: new Date()
        }));
        
        setState(prev => ({ ...prev, nearbyNetworks: networks }));
        console.log(`📶 [useWiFi] ✅ Found ${networks.length} WiFi networks:`, networks);
      };

      // Initial scan
      scanNetworks();

      // Set up periodic scanning
      scanIntervalRef.current = setInterval(scanNetworks, 15000); // Scan every 15 seconds

      // Start presence updates if we have a current network
      if (state.currentNetwork) {
        await updatePresence();
        presenceIntervalRef.current = setInterval(updatePresence, 60000); // Update every minute
      }

      console.log('📶 [useWiFi] ✅ WiFi scanning started');
    } catch (error) {
      console.error('📶 [useWiFi] Failed to start scanning:', error);
      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        error: 'Failed to start WiFi scanning'
      }));
    }
  }, [state.isAvailable, state.hasPermission, state.currentNetwork, updatePresence]);

  const stopScanning = useCallback(async (): Promise<void> => {
    try {
      console.log('📶 [useWiFi] Stopping WiFi scanning...');
      
      cleanupIntervals();
      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        nearbyNetworks: []
      }));

      console.log('📶 [useWiFi] ✅ WiFi scanning stopped');
    } catch (error) {
      console.error('📶 [useWiFi] Failed to stop scanning:', error);
    }
  }, [cleanupIntervals]);

  const findNearbyUsers = useCallback(async (): Promise<any[]> => {
    if (!session?.user || !state.currentNetwork) {
      console.log('📶 [useWiFi] No session or current network for finding nearby users');
      return [];
    }

    try {
      console.log('📶 [useWiFi] Finding nearby WiFi users...');
      
      const response = await fetch('/api/users/nearby/wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bssid: state.currentNetwork.bssid })
      });

      if (!response.ok) {
        throw new Error(`Failed to find nearby users: ${response.statusText}`);
      }

      const nearbyUsers = await response.json();
      console.log(`📶 [useWiFi] ✅ Found ${nearbyUsers.length} nearby WiFi users`);
      
      return nearbyUsers;
    } catch (error) {
      console.error('📶 [useWiFi] Failed to find nearby users:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to find nearby WiFi users'
      }));
      return [];
    }
  }, [session, state.currentNetwork]);

  const connectToNetwork = useCallback(async (bssid: string): Promise<boolean> => {
    try {
      console.log(`📶 [useWiFi] Connecting to network: ${bssid}...`);
      
      // Simulate connection attempt
      const success = Math.random() > 0.3; // 70% success rate
      
      if (success) {
        const network = mockNetworks.find(n => n.bssid === bssid) || mockNetworks[0];
        setState(prev => ({ ...prev, currentNetwork: network }));
        
        // Update presence for new network
        await updatePresence();
        
        console.log(`📶 [useWiFi] ✅ Connected to ${network.ssid}`);
      } else {
        console.error(`📶 [useWiFi] ❌ Failed to connect to network`);
      }
      
      return success;
    } catch (error) {
      console.error('📶 [useWiFi] Connection failed:', error);
      return false;
    }
  }, [updatePresence]);

  const cleanup = useCallback(async (): Promise<void> => {
    try {
      console.log('📶 [useWiFi] Cleaning up WiFi resources...');
      
      await stopScanning();
      
      setState({
        isAvailable: false,
        hasPermission: false,
        isScanning: false,
        currentNetwork: null,
        nearbyNetworks: [],
        error: null
      });
      
      console.log('📶 [useWiFi] ✅ WiFi cleanup completed');
    } catch (error) {
      console.error('📶 [useWiFi] Cleanup failed:', error);
    }
  }, [stopScanning]);

  return {
    ...state,
    requestPermission,
    startScanning,
    stopScanning,
    updatePresence,
    findNearbyUsers,
    connectToNetwork,
    cleanup
  };
};
