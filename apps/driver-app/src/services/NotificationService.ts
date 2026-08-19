import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIClient } from './api/client';

const FCM_TOKEN_KEY = '@dalasmart:fcm_token';

export class NotificationService {
  static async initialize(): Promise<void> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn('Notification permission not granted');
      return;
    }

    const token = await messaging().getToken();
    await this.saveFCMToken(token);

    messaging().onTokenRefresh(async (newToken) => {
      await this.saveFCMToken(newToken);
    });

    messaging().onMessage(async (remoteMessage) => {
      await this.displayNotification(remoteMessage);
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message:', remoteMessage);
    });

    await this.createNotificationChannels();
  }

  static async saveFCMToken(token: string): Promise<void> {
    try {
      const oldToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);

      if (oldToken !== token) {
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        await APIClient.post('/driver/fcm-token', { token });
      }
    } catch (error) {
      console.error('Failed to save FCM token:', error);
    }
  }

  static async createNotificationChannels(): Promise<void> {
    await notifee.createChannel({
      id: 'trip-requests',
      name: 'Trip Requests',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.createChannel({
      id: 'trip-updates',
      name: 'Trip Updates',
      importance: AndroidImportance.DEFAULT,
    });

    await notifee.createChannel({
      id: 'earnings',
      name: 'Earnings Notifications',
      importance: AndroidImportance.DEFAULT,
    });
  }

  static async displayNotification(remoteMessage: any): Promise<void> {
    const { notification, data } = remoteMessage;

    if (!notification) return;

    const channelId = data?.category || 'default';

    await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      android: {
        channelId,
        smallIcon: 'ic_notification',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
      data,
    });
  }

  static async cleanup(): Promise<void> {
    // Cleanup logic if needed
  }
}
