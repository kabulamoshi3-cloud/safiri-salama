/**
 * NotificationService.ts — Build 3B (passenger-app)
 * Expo Push Notifications for the passenger app.
 * expo-notifications is not in package.json — all usage is guarded with try/catch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Guard expo-notifications — absent from package.json
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (_) {
  /* expo-notifications not installed — notification features disabled */
}

const PUSH_TOKEN_KEY = '@skyrex:push_token';
const PENDING_NAV_KEY = '@skyrex:pending_nav';
const PROJECT_ID = '5f7ad6c8-510e-4f1b-a526-2933af25b604';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';

/**
 * Request notification permission and register the Expo push token with the backend.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Notifications === null) {
    console.warn('[NotificationService] expo-notifications not available');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] permission not granted');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    });
    const token: string = tokenData.data;

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    const authToken = await AsyncStorage.getItem('@skyrex:token');

    await axios.post(
      `${API_BASE}/notifications/push-token`,
      { token, platform: 'android' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    // Configure how notifications appear when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('[NotificationService] registerForPushNotifications error:', err);
  }
}

/**
 * Set up a listener that handles notification taps.
 * Branches on data.type to navigate to the correct screen:
 *   trip_accepted, driver_arriving  → TripActive
 *   trip_completed                  → Rating
 */
export function setupNotificationHandlers(): void {
  if (Notifications === null) return;

  try {
    Notifications.addNotificationResponseReceivedListener(async (response: any) => {
      const data = response?.notification?.request?.content?.data ?? {};
      // Server sends tripId (camelCase); fall back to trip_id for older payloads
      const resolvedTripId: string | undefined = data.tripId ?? data.trip_id;
      if (!resolvedTripId) return;

      let pendingNav: { screen: string; params: Record<string, unknown> };

      if (data.type === 'trip_completed') {
        // Completed trip → go to Rating screen; include driverId so RatingScreen can post the rating
        const resolvedDriverId: string | undefined = data.driverId ?? data.driver_id;
        pendingNav = { screen: 'Rating', params: { tripId: resolvedTripId, driverId: resolvedDriverId } };
      } else {
        // trip_accepted, driver_arriving, new_request, etc. → go to active trip
        pendingNav = { screen: 'TripActive', params: { tripId: resolvedTripId } };
      }

      await AsyncStorage.setItem(PENDING_NAV_KEY, JSON.stringify(pendingNav));
    });
  } catch (err) {
    console.warn('[NotificationService] setupNotificationHandlers error:', err);
  }
}
