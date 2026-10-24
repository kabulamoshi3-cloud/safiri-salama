import BackgroundGeolocation from 'react-native-background-geolocation';
import { DriverAPI, LocationUpdate } from './api/DriverAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationServiceConfig {
  updateInterval: number; // milliseconds
  distanceFilter: number; // meters
  enableHighAccuracy: boolean;
  batchSize: number; // number of updates to batch
}

const DEFAULT_CONFIG: LocationServiceConfig = {
  updateInterval: 10000, // 10 seconds
  distanceFilter: 10, // 10 meters
  enableHighAccuracy: true,
  batchSize: 5,
};

class LocationServiceClass {
  private isTracking = false;
  private locationQueue: LocationUpdate[] = [];
  private config: LocationServiceConfig = DEFAULT_CONFIG;
  private batchTimer: NodeJS.Timeout | null = null;
  private onLocationUpdateCallback: ((location: LocationUpdate) => void) | null = null;

  async initialize(): Promise<void> {
    try {
      // Configure background geolocation
      await BackgroundGeolocation.ready({
        reset: false,
        debug: false,
        logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: this.config.distanceFilter,
        stopOnTerminate: false,
        startOnBoot: true,
        interval: this.config.updateInterval,
        fastestInterval: this.config.updateInterval / 2,
        activitiesInterval: this.config.updateInterval,
        triggerActivities: 'in_vehicle',
      });

      await BackgroundGeolocation.start();
      console.log('LocationService initialized');
    } catch (error) {
      console.error('LocationService initialization error:', error);
      throw error;
    }
  }

  startTracking(onUpdate?: (location: LocationUpdate) => void): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.onLocationUpdateCallback = onUpdate || null;

    // Start listening to location changes
    BackgroundGeolocation.onLocation(
      (location) => {
        const update: LocationUpdate = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
          speed: location.coords.speed || 0,
          heading: location.coords.heading || 0,
          accuracy: location.coords.accuracy || 0,
        };

        this.locationQueue.push(update);

        // Call real-time callback if provided
        if (this.onLocationUpdateCallback) {
          this.onLocationUpdateCallback(update);
        }

        // Send batch when queue reaches size
        if (this.locationQueue.length >= this.config.batchSize) {
          this.flushLocationQueue();
        }
      },
      (error) => {
        console.error('LocationService error:', error);
      }
    );

    // Set up batch flush timer
    this.batchTimer = setInterval(() => {
      this.flushLocationQueue();
    }, 30000); // Flush every 30 seconds

    console.log('LocationService tracking started');
  }

  stopTracking(): void {
    if (!this.isTracking) return;

    this.isTracking = false;
    this.onLocationUpdateCallback = null;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush any remaining locations
    this.flushLocationQueue();

    console.log('LocationService tracking stopped');
  }

  private async flushLocationQueue(): Promise<void> {
    if (this.locationQueue.length === 0) return;

    const toSend = [...this.locationQueue];
    this.locationQueue = [];

    try {
      // Send all queued locations
      for (const update of toSend) {
        await DriverAPI.updateLocation(update);
      }
      console.log(`Flushed ${toSend.length} location updates`);
    } catch (error) {
      console.error('Failed to flush location queue:', error);
      // Re-add to queue for retry
      this.locationQueue.unshift(...toSend);

      // Save to AsyncStorage for recovery
      try {
        const saved = await AsyncStorage.getItem('@safiriharaka:location_queue');
        const queue = saved ? JSON.parse(saved) : [];
        await AsyncStorage.setItem(
          '@safiriharaka:location_queue',
          JSON.stringify([...queue, ...toSend])
        );
      } catch (storageError) {
        console.error('Failed to save location queue to storage:', storageError);
      }
    }
  }

  async getCurrentLocation(): Promise<LocationUpdate | null> {
    try {
      const location = await BackgroundGeolocation.getCurrentPosition({
        timeout: 30,
        maximumAge: 5000,
        desiredAccuracy: 10,
        samples: 1,
      });

      return {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        speed: location.coords.speed || 0,
        heading: location.coords.heading || 0,
        accuracy: location.coords.accuracy || 0,
      };
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  setConfig(config: Partial<LocationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LocationServiceConfig {
    return { ...this.config };
  }

  async recoverFromStorage(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('@safiriharaka:location_queue');
      if (saved) {
        const queue = JSON.parse(saved) as LocationUpdate[];
        this.locationQueue = queue;
        this.flushLocationQueue();
      }
    } catch (error) {
      console.error('Failed to recover location queue from storage:', error);
    }
  }

  isRunning(): boolean {
    return this.isTracking;
  }
}

export const LocationService = new LocationServiceClass();
