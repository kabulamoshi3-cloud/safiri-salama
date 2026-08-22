import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Geolocation from '@react-native-community/geolocation';
import type { GeoPoint } from '../types/shared';

interface LocationContextType {
  currentLocation: GeoPoint | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestLocation();
    
    // Watch position changes
    const watchId = Geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setError(null);
      },
      (err) => {
        console.error('Location watch error:', err);
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
      }
    );

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, []);

  const requestLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      Geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setIsLoading(false);
        },
        (err) => {
          console.error('Location request error:', err);
          setError(err.message);
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } catch (err) {
      setError('Failed to get location');
      setIsLoading(false);
    }
  };

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        isLoading,
        error,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};




