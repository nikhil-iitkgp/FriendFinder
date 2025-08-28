'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  isBluetoothAvailable,
  requestBluetoothPermission,
  generateBluetoothId,
  startBluetoothAdvertising,
  stopBluetoothAdvertising,
  scanForBluetoothDevices,
  cleanupBluetoothResources,
  BluetoothDevice,
  BluetoothScanResult
} from '@/services/bluetooth';

export interface BluetoothState {
  isAvailable: boolean;
  hasPermission: boolean;
  isScanning: boolean;
  isAdvertising: boolean;
  bluetoothId: string | null;
  nearbyDevices: BluetoothDevice[];
  lastScanResult: BluetoothScanResult | null;
  error: string | null;
}

export interface BluetoothActions {
  requestPermission: () => Promise<boolean>;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;
  startAdvertising: () => Promise<boolean>;
  stopAdvertising: () => Promise<void>;
  updateBluetoothPresence: () => Promise<void>;
  findNearbyUsers: () => Promise<any[]>;
  cleanup: () => Promise<void>;
}

export interface UseBluetoothReturn extends BluetoothState, BluetoothActions {}

export const useBluetooth = (): UseBluetoothReturn => {
  const { data: session } = useSession();
  const [state, setState] = useState<BluetoothState>({
    isAvailable: false,
    hasPermission: false,
    isScanning: false,
    isAdvertising: false,
    bluetoothId: null,
    nearbyDevices: [],
    lastScanResult: null,
    error: null
  });

  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Bluetooth on mount
  useEffect(() => {
    const initializeBluetooth = async () => {
      try {
        console.log('🔵 [useBluetooth] Initializing Bluetooth...');
        
        const available = await isBluetoothAvailable();
        setState(prev => ({ ...prev, isAvailable: available }));

        if (available) {
          // Generate a persistent Bluetooth ID
          const storedBluetoothId = localStorage.getItem('friendfinder_bluetooth_id');
          const bluetoothId = storedBluetoothId || generateBluetoothId();
          
          if (!storedBluetoothId) {
            localStorage.setItem('friendfinder_bluetooth_id', bluetoothId);
          }

          setState(prev => ({ ...prev, bluetoothId }));
          console.log('🔵 [useBluetooth] Bluetooth initialized successfully');
        } else {
          console.warn('🔵 [useBluetooth] Bluetooth not available on this device');
        }
      } catch (error) {
        console.error('🔵 [useBluetooth] Failed to initialize Bluetooth:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to initialize Bluetooth'
        }));
      }
    };

    initializeBluetooth();

    // Cleanup on unmount
    return () => {
      cleanupIntervals();
      cleanupBluetoothResources();
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
      console.log('🔵 [useBluetooth] Requesting Bluetooth permission...');
      
      const granted = await requestBluetoothPermission();
      setState(prev => ({ ...prev, hasPermission: granted }));
      
      if (!granted) {
        setState(prev => ({ 
          ...prev, 
          error: 'Bluetooth permission denied'
        }));
      }
      
      return granted;
    } catch (error) {
      console.error('🔵 [useBluetooth] Permission request failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to request Bluetooth permission'
      }));
      return false;
    }
  }, []);

  const updateBluetoothPresence = useCallback(async (): Promise<void> => {
    if (!session?.user || !state.bluetoothId) {
      console.log('🔵 [useBluetooth] No session or Bluetooth ID, skipping presence update');
      return;
    }

    try {
      console.log('🔵 [useBluetooth] Updating Bluetooth presence...');
      
      const response = await fetch('/api/users/bluetooth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bluetoothId: state.bluetoothId })
      });

      if (!response.ok) {
        throw new Error(`Failed to update presence: ${response.statusText}`);
      }

      console.log('🔵 [useBluetooth] ✅ Bluetooth presence updated successfully');
    } catch (error) {
      console.error('🔵 [useBluetooth] Failed to update Bluetooth presence:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to update Bluetooth presence'
      }));
    }
  }, [session, state.bluetoothId]);

  const startScanning = useCallback(async (): Promise<void> => {
    if (!state.isAvailable || !state.hasPermission) {
      console.warn('🔵 [useBluetooth] Cannot start scanning: not available or no permission');
      return;
    }

    try {
      console.log('🔵 [useBluetooth] Starting Bluetooth scanning...');
      setState(prev => ({ ...prev, isScanning: true, error: null }));

      // Perform initial scan
      const scanResult = await scanForBluetoothDevices(5000);
      setState(prev => ({ 
        ...prev, 
        nearbyDevices: scanResult.devices,
        lastScanResult: scanResult
      }));

      // Set up periodic scanning
      scanIntervalRef.current = setInterval(async () => {
        try {
          const result = await scanForBluetoothDevices(3000);
          setState(prev => ({ 
            ...prev, 
            nearbyDevices: result.devices,
            lastScanResult: result
          }));
        } catch (error) {
          console.error('🔵 [useBluetooth] Scan interval error:', error);
        }
      }, 10000); // Scan every 10 seconds

      console.log('🔵 [useBluetooth] ✅ Bluetooth scanning started');
    } catch (error) {
      console.error('🔵 [useBluetooth] Failed to start scanning:', error);
      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        error: 'Failed to start Bluetooth scanning'
      }));
    }
  }, [state.isAvailable, state.hasPermission]);

  const stopScanning = useCallback(async (): Promise<void> => {
    try {
      console.log('🔵 [useBluetooth] Stopping Bluetooth scanning...');
      
      cleanupIntervals();
      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        nearbyDevices: [],
        lastScanResult: null
      }));

      console.log('🔵 [useBluetooth] ✅ Bluetooth scanning stopped');
    } catch (error) {
      console.error('🔵 [useBluetooth] Failed to stop scanning:', error);
    }
  }, [cleanupIntervals]);

  const startAdvertising = useCallback(async (): Promise<boolean> => {
    if (!state.isAvailable || !state.hasPermission || !session?.user) {
      console.warn('🔵 [useBluetooth] Cannot start advertising: requirements not met');
      return false;
    }

    try {
      console.log('🔵 [useBluetooth] Starting Bluetooth advertising...');
      
      const deviceName = `FriendFinder_${session.user.name || 'User'}`;
      const success = await startBluetoothAdvertising(deviceName);
      
      if (success) {
        setState(prev => ({ ...prev, isAdvertising: true }));
        
        // Start periodic presence updates
        await updateBluetoothPresence();
        presenceIntervalRef.current = setInterval(updateBluetoothPresence, 30000); // Every 30 seconds
        
        console.log('🔵 [useBluetooth] ✅ Bluetooth advertising started');
      }
      
      return success;
    } catch (error) {
      console.error('🔵 [useBluetooth] Failed to start advertising:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start Bluetooth advertising'
      }));
      return false;
    }
  }, [state.isAvailable, state.hasPermission, session, updateBluetoothPresence]);

  const stopAdvertising = useCallback(async (): Promise<void> => {
    try {
      console.log('🔵 [useBluetooth] Stopping Bluetooth advertising...');
      
      await stopBluetoothAdvertising();
      
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      
      setState(prev => ({ ...prev, isAdvertising: false }));
      console.log('🔵 [useBluetooth] ✅ Bluetooth advertising stopped');
    } catch (error) {
      console.error('🔵 [useBluetooth] Failed to stop advertising:', error);
    }
  }, []);

  const findNearbyUsers = useCallback(async (): Promise<any[]> => {
    if (!session?.user || !state.bluetoothId) {
      console.log('🔵 [useBluetooth] No session or Bluetooth ID for finding nearby users');
      return [];
    }

    try {
      console.log('🔵 [useBluetooth] Finding nearby Bluetooth users...');
      
      const response = await fetch('/api/users/nearby/bluetooth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bluetoothId: state.bluetoothId })
      });

      if (!response.ok) {
        throw new Error(`Failed to find nearby users: ${response.statusText}`);
      }

      const nearbyUsers = await response.json();
      console.log(`🔵 [useBluetooth] ✅ Found ${nearbyUsers.length} nearby Bluetooth users`);
      
      return nearbyUsers;
    } catch (error) {
      console.error('🔵 [useBluetooth] Failed to find nearby users:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to find nearby Bluetooth users'
      }));
      return [];
    }
  }, [session, state.bluetoothId]);

  const cleanup = useCallback(async (): Promise<void> => {
    try {
      console.log('🔵 [useBluetooth] Cleaning up Bluetooth resources...');
      
      await stopScanning();
      await stopAdvertising();
      await cleanupBluetoothResources();
      
      setState({
        isAvailable: false,
        hasPermission: false,
        isScanning: false,
        isAdvertising: false,
        bluetoothId: null,
        nearbyDevices: [],
        lastScanResult: null,
        error: null
      });
      
      console.log('🔵 [useBluetooth] ✅ Bluetooth cleanup completed');
    } catch (error) {
      console.error('🔵 [useBluetooth] Cleanup failed:', error);
    }
  }, [stopScanning, stopAdvertising]);

  return {
    ...state,
    requestPermission,
    startScanning,
    stopScanning,
    startAdvertising,
    stopAdvertising,
    updateBluetoothPresence,
    findNearbyUsers,
    cleanup
  };
};
