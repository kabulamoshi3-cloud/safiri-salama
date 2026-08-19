import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIClient } from './api/client';

export type NotificationType = 
  | 'trip_accepted'
  | 'trip_arriving'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'driver_location_update'
  | 'payment_success'
  | 'payment_failed'
  | 'safety_alert'
  | 'promo_offer';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  timestamp: Date;
  read: boolean;
}

class NotificationServiceClass {
  private notificationHandlers: Map<NotificationType, (data: any) => void> = new Map();
  private notifications: PushNotification[] = [];
  private fcmToken: string | null = null;
  private readonly STORAGE_KEY = '@dalasmart:notifications';
  private readonly FCM_TOKEN_KEY = '@dalasmart:fcm_token';

  async initialize(): Promise<void> {
    try {
      // Request user permission
      const authStatus = await messaging().requestUserPermission({
        alert: true,
        badge: true,
        sound: true,
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Notification permission not granted');
        return;
      }

      // Get FCM token
      this.fcmToken = await messaging().getToken();
      if (this.fcmToken) {
        await AsyncStorage.setItem(this.FCM_TOKEN_KEY, this.fcmToken);
        // Register token with backend
        await this.registerToken(this.fcmToken);
      }

      // Listen for FCM token refresh
      messaging().onTokenRefresh((token) => {
        this.fcmToken = token;
        AsyncStorage.setItem(this.FCM_TOKEN_KEY, token);
        this.registerToken(token);
      });

      // Handle foreground notifications
      this.handleForegroundNotifications();

      // Handle background notifications
      messaging().onNotificationOpenedApp(this.handleNotificationOpen.bind(this));

      // Handle notification from quit state
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        this.handleNotificationOpen(initialNotification);
      }

      // Load persisted notifications
      await this.loadNotifications();

      console.log('NotificationService initialized');
    } catch (error) {
      console.error('NotificationService initialization error:', error);
      throw error;
    }
  }

  private handleForegroundNotifications(): void {
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification received:', remoteMessage);

      const notification: PushNotification = {
        id: remoteMessage.messageId || `notif-${Date.now()}`,
        type: (remoteMessage.data?.type as NotificationType) || 'safety_alert',
        title: remoteMessage.notification?.title || 'DalaSmart',
        body: remoteMessage.notification?.body || '',
        data: remoteMessage.data || {},
        timestamp: new Date(),
        read: false,
      };

      this.notifications.unshift(notification);
      await this.persistNotifications();

      // Call type-specific handler
      const handler = this.notificationHandlers.get(notification.type);
      if (handler) {
        handler(notification.data);
      }

      // Show alert on Android if not handled by handler
      if (Platform.OS === 'android') {
        Alert.alert(notification.title, notification.body, [
          { text: 'Close', onPress: () => {} },
          { text: 'View', onPress: () => this.handleNotification(notification) },
        ]);
      }
    });
  }

  private handleNotificationOpen(remoteMessage: any): void {
    console.log('Notification opened:', remoteMessage);

    const notification: PushNotification = {
      id: remoteMessage.messageId || `notif-${Date.now()}`,
      type: (remoteMessage.data?.type as NotificationType) || 'safety_alert',
      title: remoteMessage.notification?.title || 'DalaSmart',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data || {},
      timestamp: new Date(),
      read: true,
    };

    this.handleNotification(notification);
  }

  private async handleNotification(notification: PushNotification): Promise<void> {
    // Route based on notification type
    switch (notification.type) {
      case 'trip_accepted':
        // Navigate to live tracking
        console.log('Trip accepted:', notification.data.tripId);
        break;
      case 'trip_arriving':
        // Show notification
        Alert.alert('Driver Arriving', notification.body);
        break;
      case 'trip_completed':
        // Show rating screen
        console.log('Trip completed:', notification.data.tripId);
        break;
      case 'payment_success':
        Alert.alert('Payment Successful', `₦${notification.data.amount} added to wallet`);
        break;
      case 'safety_alert':
        Alert.alert('Safety Alert', notification.body);
        break;
      default:
        Alert.alert(notification.title, notification.body);
    }
  }

  private async registerToken(token: string): Promise<void> {
    try {
      await APIClient.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
        appVersion: '1.0.0',
      });
      console.log('FCM token registered:', token);
    } catch (error) {
      console.error('Failed to register FCM token:', error);
    }
  }

  registerHandler(type: NotificationType, handler: (data: any) => void): void {
    this.notificationHandlers.set(type, handler);
  }

  unregisterHandler(type: NotificationType): void {
    this.notificationHandlers.delete(type);
  }

  async getNotifications(limit: number = 20): Promise<PushNotification[]> {
    return this.notifications.slice(0, limit);
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.persistNotifications();
    }
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => {
      n.read = true;
    });
    await this.persistNotifications();
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    await this.persistNotifications();
  }

  async clearAll(): Promise<void> {
    this.notifications = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  private async persistNotifications(): Promise<void> {
    try {
      // Keep only last 100 notifications
      const toSave = this.notifications.slice(0, 100);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to persist notifications:', error);
    }
  }

  private async loadNotifications(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.notifications = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  async getFCMToken(): Promise<string | null> {
    if (!this.fcmToken) {
      this.fcmToken = await AsyncStorage.getItem(this.FCM_TOKEN_KEY);
    }
    return this.fcmToken;
  }
}

export const NotificationService = new NotificationServiceClass();
