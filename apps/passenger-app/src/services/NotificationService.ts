// Notification service stub — will be implemented with expo-notifications
import { Platform } from 'react-native';

export class NotificationService {
  static async initialize(): Promise<void> {
    console.log('NotificationService: initialized (stub)');
  }

  static async cleanup(): Promise<void> {
    // no-op
  }

  static async requestPermission(): Promise<boolean> {
    return true;
  }
}
