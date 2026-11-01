/**
 * NotificationService.ts — Build 3B
 * Expo Push Notifications (replaces Firebase/Notifee).
 * expo-notifications is not in package.json — all usage is guarded with try/catch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIClient } from './api/client';

// Guard expo-notifications — absent from package.json
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (_) {
  /* expo-notifications not installed — notification features disabled */
}

const PUSH_TOKEN_KEY = '@safiriharaka:push_token';
const PENDING_NAV_KEY = '@safiriharaka:pending_nav';

const PROJECT_ID = '7956fd4b-f540-47d0-90ad-6904eceaaef7';

export class NotificationService {
  private static responseSubscription: any = null;

  static async initialize(): Promise<void> {
    if (Notifications === null) {
      console.warn('[NotificationService] expo-notifications not available');
      return;
    }

    try {
      // Request permission
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

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: PROJECT_ID,
      });
      const token: string = tokenData.data;

      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // Register token with backend
      try {
        await APIClient.post('/notifications/push-token', {
          token,
          platform: 'android',
        });
      } catch (regErr) {
        console.warn('[NotificationService] failed to register token:', regErr);
      }

      // Configure notification handling
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Handle notification tap
      NotificationService.responseSubscription =
        Notifications.addNotificationResponseReceivedListener(
          async (response: any) => {
            const data = response?.notification?.request?.content?.data ?? {};
            if (data.type === 'new_trip_request') {
              await AsyncStorage.setItem(
                PENDING_NAV_KEY,
                JSON.stringify({ screen: 'TripRequest', params: data })
              );
            }
          }
        );
    } catch (err) {
      console.error('[NotificationService] initialize error:', err);
    }
  }

  static async cleanup(): Promise<void> {
    if (Notifications === null) return;
    try {
      if (NotificationService.responseSubscription) {
        NotificationService.responseSubscription.remove();
        NotificationService.responseSubscription = null;
      }
    } catch (err) {
      console.warn('[NotificationService] cleanup error:', err);
    }
  }
}
