'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * User preferences interface
 */
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    friendRequests: boolean;
    messages: boolean;
    discoveries: boolean;
  };
  privacy: {
    showLocation: boolean;
    showOnlineStatus: boolean;
  };
  discovery: {
    enabled: boolean;
    range: number;
    methods: {
      gps: boolean;
      wifi: boolean;
      bluetooth: boolean;
    };
  };
}

/**
 * Default user preferences
 */
const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: {
    friendRequests: true,
    messages: true,
    discoveries: true,
  },
  privacy: {
    showLocation: true,
    showOnlineStatus: true,
  },
  discovery: {
    enabled: true,
    range: 1000, // 1km
    methods: {
      gps: true,
      wifi: false,
      bluetooth: false,
    },
  },
};

/**
 * Hook for managing user preferences
 */
export function useUserPreferences() {
  const { user, updateUserProfile } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load preferences from localStorage and user profile
   */
  useEffect(() => {
    const loadPreferences = () => {
      try {
        // Load from localStorage
        const stored = localStorage.getItem('userPreferences');
        let loadedPreferences = defaultPreferences;

        if (stored) {
          loadedPreferences = { ...defaultPreferences, ...JSON.parse(stored) };
        }

        // Override with user profile data if available
        if (user) {
          loadedPreferences.discovery.enabled = user.isDiscoveryEnabled;
          loadedPreferences.discovery.range = user.discoveryRange;
        }

        setPreferences(loadedPreferences);
      } catch (error) {
        console.error('Error loading user preferences:', error);
        setPreferences(defaultPreferences);
      }
    };

    loadPreferences();
  }, [user]);

  /**
   * Save preferences to localStorage
   */
  const saveToLocalStorage = (newPreferences: UserPreferences) => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error);
    }
  };

  /**
   * Update theme preference
   */
  const updateTheme = async (theme: 'light' | 'dark' | 'system') => {
    const newPreferences = { ...preferences, theme };
    setPreferences(newPreferences);
    saveToLocalStorage(newPreferences);

    // Apply theme immediately
    applyTheme(theme);
  };

  /**
   * Update notification preferences
   */
  const updateNotifications = async (notifications: Partial<UserPreferences['notifications']>) => {
    const newPreferences = {
      ...preferences,
      notifications: { ...preferences.notifications, ...notifications },
    };
    setPreferences(newPreferences);
    saveToLocalStorage(newPreferences);
  };

  /**
   * Update privacy preferences
   */
  const updatePrivacy = async (privacy: Partial<UserPreferences['privacy']>) => {
    const newPreferences = {
      ...preferences,
      privacy: { ...preferences.privacy, ...privacy },
    };
    setPreferences(newPreferences);
    saveToLocalStorage(newPreferences);
  };

  /**
   * Update discovery preferences
   */
  const updateDiscovery = async (discovery: Partial<UserPreferences['discovery']>) => {
    setIsLoading(true);
    
    try {
      const newPreferences = {
        ...preferences,
        discovery: { ...preferences.discovery, ...discovery },
      };

      // Update user profile if discovery settings changed
      if (discovery.enabled !== undefined || discovery.range !== undefined) {
        const result = await updateUserProfile({
          isDiscoveryEnabled: discovery.enabled ?? preferences.discovery.enabled,
          discoveryRange: discovery.range ?? preferences.discovery.range,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to update discovery settings');
        }
      }

      setPreferences(newPreferences);
      saveToLocalStorage(newPreferences);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating discovery preferences:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update preferences' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset preferences to defaults
   */
  const resetPreferences = async () => {
    setPreferences(defaultPreferences);
    saveToLocalStorage(defaultPreferences);
    
    // Reset user profile discovery settings
    if (user) {
      await updateUserProfile({
        isDiscoveryEnabled: defaultPreferences.discovery.enabled,
        discoveryRange: defaultPreferences.discovery.range,
      });
    }
  };

  /**
   * Apply theme to document
   */
  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  /**
   * Apply theme on mount and preference change
   */
  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  /**
   * Listen for system theme changes
   */
  useEffect(() => {
    if (preferences.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [preferences.theme]);

  return {
    preferences,
    isLoading,
    updateTheme,
    updateNotifications,
    updatePrivacy,
    updateDiscovery,
    resetPreferences,
  };
}
