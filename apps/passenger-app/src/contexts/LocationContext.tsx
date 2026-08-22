import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
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

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setIsLoading(false);
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (loc) => {
          setCurrentLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
          setError(null);
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  const requestLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setIsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
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
