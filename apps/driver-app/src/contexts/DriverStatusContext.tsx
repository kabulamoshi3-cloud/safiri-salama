import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DriverAPI } from '../services/api/DriverAPI';
import { LocationService } from '../services/LocationService';

type DriverStatus = 'offline' | 'available' | 'on-trip' | 'break';

interface DriverStatusContextType {
  status: DriverStatus;
  setStatus: (status: DriverStatus) => Promise<void>;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  currentTripId: string | null;
}

const DriverStatusContext = createContext<DriverStatusContextType | undefined>(undefined);

const STATUS_KEY = '@dalasmart:driver_status';

export const DriverStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatusState] = useState<DriverStatus>('offline');
  const [isTracking, setIsTracking] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);

  useEffect(() => {
    initializeDriver();
    return () => {
      LocationService.stopTracking();
    };
  }, []);

  const initializeDriver = async () => {
    try {
      // Initialize location service
      await LocationService.initialize();
      await LocationService.recoverFromStorage();

      // Load saved status
      const savedStatus = await AsyncStorage.getItem(STATUS_KEY);
      if (savedStatus) {
        setStatusState(savedStatus as DriverStatus);
      }

      // Check for active trip
      const activeTrip = await DriverAPI.getActiveTrip();
      if (activeTrip) {
        setCurrentTripId(activeTrip.id);
        setStatusState('on-trip');
      }
    } catch (error) {
      console.error('Failed to initialize driver:', error);
    }
  };

  const setStatus = async (newStatus: DriverStatus) => {
    try {
      await AsyncStorage.setItem(STATUS_KEY, newStatus);
      setStatusState(newStatus);

      // Update status on backend
      await DriverAPI.updateStatus(newStatus);

      // Start/stop tracking based on status
      if (newStatus === 'available' || newStatus === 'on-trip') {
        await startLocationTracking();
      } else {
        LocationService.stopTracking();
      }
    } catch (error) {
      console.error('Failed to update driver status:', error);
      throw error;
    }
  };

  const startLocationTracking = async () => {
    try {
      LocationService.startTracking((location) => {
        console.log('Location updated:', location);
      });
      setIsTracking(true);
    } catch (error) {
      console.error('Failed to start tracking:', error);
      throw error;
    }
  };

  const startTracking = async () => {
    await startLocationTracking();
  };

  const stopTracking = async () => {
    try {
      LocationService.stopTracking();
      setIsTracking(false);
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      throw error;
    }
  };

  return (
    <DriverStatusContext.Provider
      value={{
        status,
        setStatus,
        isTracking,
        startTracking,
        stopTracking,
        currentTripId,
      }}
    >
      {children}
    </DriverStatusContext.Provider>
  );
};

export const useDriverStatus = (): DriverStatusContextType => {
  const context = useContext(DriverStatusContext);
  if (!context) {
    throw new Error('useDriverStatus must be used within DriverStatusProvider');
  }
  return context;
};
