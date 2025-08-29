"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import geolocationService, {
  LocationCoordinates,
  NearbyUser,
} from "@/lib/geolocation";
import { useAuth } from "@/context/AuthContext";

interface LocationContextType {
  // Location state
  currentLocation: LocationCoordinates | null;
  isLocationEnabled: boolean;
  isWatching: boolean;
  locationError: string | null;
  permissionStatus: PermissionState | null;

  // Nearby users
  nearbyUsers: NearbyUser[];
  isLoadingNearby: boolean;
  nearbyError: string | null;

  // Actions
  requestLocationPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<void>;
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
  findNearbyUsers: (radius?: number) => Promise<void>;
  updateUserLocation: () => Promise<void>;
  toggleLocationSharing: () => Promise<void>;

  // Settings
  discoveryRadius: number;
  isDiscoveryEnabled: boolean;
  setDiscoveryRadius: (radius: number) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const { user } = useAuth();

  // Location state
  const [currentLocation, setCurrentLocation] =
    useState<LocationCoordinates | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);

  // Nearby users state
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  // Settings
  const [discoveryRadius, setDiscoveryRadius] = useState(1000); // 1km default
  const [isDiscoveryEnabled, setIsDiscoveryEnabled] = useState(true);

  // Add throttling for location updates - use ref to avoid re-render loops
  const lastLocationUpdateRef = useRef<number>(0);
  const LOCATION_UPDATE_THRESHOLD = 30000; // 30 seconds minimum between updates
  const updateInProgress = useRef(false); // Prevent concurrent updates

  useEffect(() => {
    if (!user?.id) return;

    // Check if geolocation is supported
    if (!geolocationService.isSupported()) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    // Set up event listeners
    geolocationService.onLocationUpdated((location) => {
      setCurrentLocation(location);
      setLocationError(null);

      // Only update server if enough time has passed and no update is in progress
      const now = Date.now();
      if (
        now - lastLocationUpdateRef.current > LOCATION_UPDATE_THRESHOLD &&
        !updateInProgress.current
      ) {
        updateInProgress.current = true;
        updateUserLocationOnServer(location).finally(() => {
          updateInProgress.current = false;
          lastLocationUpdateRef.current = now;
        });
      }
    });

    geolocationService.onError((error) => {
      setLocationError(error);
      setIsLocationEnabled(false);
    });

    geolocationService.onPermissionChanged((granted) => {
      setIsLocationEnabled(granted);
      if (granted) {
        setLocationError(null);
      }
    });

    // Check initial permission status once
    const checkPermissions = async () => {
      try {
        const status = await geolocationService.checkPermissionStatus();
        setPermissionStatus(status);

        if (status === "granted") {
          setIsLocationEnabled(true);
          // Only get location once on mount, don't auto-update
          try {
            await geolocationService.getCurrentPosition();
          } catch (error) {
            console.warn("Could not get initial location:", error);
          }
        }
      } catch (error) {
        console.warn("Could not check permission status:", error);
      }
    };

    checkPermissions();

    return () => {
      geolocationService.destroy();
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-runs

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const granted = await geolocationService.requestPermission();
      setIsLocationEnabled(granted);

      if (granted) {
        await getCurrentLocation();
      }

      return granted;
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Failed to request permission"
      );
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<void> => {
    try {
      setLocationError(null);
      const location = await geolocationService.getCurrentPosition();
      setCurrentLocation(location);

      if (location) {
        await updateUserLocationOnServer(location);
      }
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Failed to get location"
      );
    }
  };

  const startLocationTracking = () => {
    // Prevent infinite loop: only set error if not already set
    if (!isLocationEnabled) {
      if (locationError !== "Location permission not granted") {
        setLocationError("Location permission not granted");
      }
      return;
    }
    if (isWatching) return; // Prevent repeated calls

    const success = geolocationService.startWatching({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000, // 1 minute
    });

    if (success) {
      setIsWatching(true);
    }
  };

  const stopLocationTracking = () => {
    geolocationService.stopWatching();
    setIsWatching(false);
  };

  const findNearbyUsers = async (
    radius: number = discoveryRadius
  ): Promise<void> => {
    if (!currentLocation) {
      setNearbyError("Current location not available");
      return;
    }

    setIsLoadingNearby(true);
    setNearbyError(null);

    try {
      const users = await geolocationService.findNearbyUsers(radius);
      setNearbyUsers(users);
    } catch (error) {
      setNearbyError(
        error instanceof Error ? error.message : "Failed to find nearby users"
      );
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const updateUserLocation = async (): Promise<void> => {
    if (!currentLocation) {
      throw new Error("No current location available");
    }

    await updateUserLocationOnServer(currentLocation);
  };

  const updateUserLocationOnServer = async (
    location: LocationCoordinates
  ): Promise<void> => {
    try {
      const response = await fetch("/api/users/location", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update location on server");
      }
    } catch (error) {
      console.error("Error updating location on server:", error);
      // Don't set error state for server updates to avoid UI disruption
    }
  };

  const toggleLocationSharing = async (): Promise<void> => {
    try {
      const response = await fetch("/api/users/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isDiscoveryEnabled: !isDiscoveryEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update discovery settings");
      }

      setIsDiscoveryEnabled(!isDiscoveryEnabled);
    } catch (error) {
      console.error("Error toggling location sharing:", error);
      throw error;
    }
  };

  return (
    <LocationContext.Provider
      value={{
        // Location state
        currentLocation,
        isLocationEnabled,
        isWatching,
        locationError,
        permissionStatus,

        // Nearby users
        nearbyUsers,
        isLoadingNearby,
        nearbyError,

        // Actions
        requestLocationPermission,
        getCurrentLocation,
        startLocationTracking,
        stopLocationTracking,
        findNearbyUsers,
        updateUserLocation,
        toggleLocationSharing,

        // Settings
        discoveryRadius,
        isDiscoveryEnabled,
        setDiscoveryRadius,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
