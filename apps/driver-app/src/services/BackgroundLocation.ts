/**
 * BackgroundLocation.ts
 * Build 3A — Background GPS tracking using expo-location + guarded expo-task-manager
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Guard expo-task-manager — absent from package.json at build time
let TaskManager: any = null;
try {
  TaskManager = require('expo-task-manager');
} catch (_) {
  /* expo-task-manager not installed — background task registration skipped */
}

export const BACKGROUND_LOCATION_TASK = 'DALASMART_BACKGROUND_LOCATION';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://safiri-salama.vercel.app/api/v1';

// Register the background task only if TaskManager is available
if (TaskManager !== null) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error('[BackgroundLocation] task error:', error);
      return;
    }

    if (!data) return;

    const { locations } = data as {
      locations: Array<{
        coords: {
          latitude: number;
          longitude: number;
          heading: number | null;
          speed: number | null;
        };
      }>;
    };

    if (!locations || locations.length === 0) return;

    const loc = locations[locations.length - 1];
    const { latitude: lat, longitude: lng, heading, speed } = loc.coords;
    const bearing = heading ?? 0;
    const spd = speed ?? 0;

    try {
      const [token, tripId] = await Promise.all([
        AsyncStorage.getItem('@dalasmart:token'),
        AsyncStorage.getItem('@dalasmart:active_trip_id'),
      ]);

      await fetch(`${API_BASE}/tracking/driver/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ lat, lng, bearing, speed: spd, trip_id: tripId }),
      });
    } catch (fetchErr) {
      console.warn('[BackgroundLocation] failed to post location:', fetchErr);
    }
  });
}

/**
 * Request foreground + background permissions, then start background location tracking.
 * No-ops gracefully if TaskManager is unavailable.
 */
export async function startBackgroundTracking(): Promise<void> {
  if (TaskManager === null) {
    console.warn('[BackgroundLocation] expo-task-manager not available — tracking skipped');
    return;
  }

  // Request foreground permission first (required before background)
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    console.warn('[BackgroundLocation] foreground location permission denied');
    return;
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    console.warn('[BackgroundLocation] background location permission denied');
    return;
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );
  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 10000,   // 10 seconds
    distanceInterval: 10,  // 10 metres
    foregroundService: {
      notificationTitle: 'DalaSmart',
      notificationBody: 'Inafuatilia mahali pako kwa ajili ya safari',
      notificationColor: '#2e7d32',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });

  console.log('[BackgroundLocation] tracking started');
}

/**
 * Stop background location tracking.
 * No-ops gracefully if TaskManager is unavailable or task not running.
 */
export async function stopBackgroundTracking(): Promise<void> {
  if (TaskManager === null) return;

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (started) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[BackgroundLocation] tracking stopped');
    }
  } catch (err) {
    console.warn('[BackgroundLocation] stopBackgroundTracking error:', err);
  }
}

/**
 * Returns true if background location updates are currently active.
 */
export async function isBackgroundTrackingActive(): Promise<boolean> {
  if (TaskManager === null) return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
