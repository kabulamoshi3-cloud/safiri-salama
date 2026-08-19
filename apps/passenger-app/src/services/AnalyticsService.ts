import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';

export type EventCategory = 
  | 'trip'
  | 'payment'
  | 'auth'
  | 'navigation'
  | 'error'
  | 'performance'
  | 'engagement'
  | 'retention';

export interface AnalyticsEvent {
  name: string;
  category: EventCategory;
  parameters: Record<string, any>;
  timestamp: Date;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface CrashReport {
  id: string;
  message: string;
  stack: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  context: Record<string, any>;
  platform: string;
  appVersion: string;
}

class AnalyticsServiceClass {
  private eventQueue: AnalyticsEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private crashReports: CrashReport[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private readonly STORAGE_KEY = '@dalasmart:analytics';
  private readonly CRASH_KEY = '@dalasmart:crashes';
  private batchTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize(userId?: string): Promise<void> {
    try {
      this.userId = userId || null;

      // Set Firebase Analytics user ID
      if (userId) {
        await analytics().setUserId(userId);
      }

      // Set custom properties
      await analytics().setDefaultEventParameters({
        session_id: this.sessionId,
        platform: Platform.OS,
        app_version: '1.0.0',
      });

      // Set crash reporter user ID
      if (userId) {
        await crashlytics().setUserId(userId);
      }

      // Setup global error handler
      this.setupErrorHandler();

      // Start batch processing
      this.startBatchProcessing();

      console.log('AnalyticsService initialized');
    } catch (error) {
      console.error('AnalyticsService initialization error:', error);
    }
  }

  private setupErrorHandler(): void {
    // Handle unhandled promise rejections
    const originalUnhandledRejection = process.on;
    process.on = function (event: string, listener: any) {
      if (event === 'unhandledRejection') {
        return originalUnhandledRejection.call(process, event, (reason: any) => {
          AnalyticsServiceClass.logError('Unhandled Promise Rejection', reason);
          listener(reason);
        });
      }
      return originalUnhandledRejection.apply(process, arguments as any);
    };

    // Handle uncaught exceptions
    ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      AnalyticsServiceClass.logError(
        isFatal ? 'Uncaught Exception' : 'Error',
        error,
        { isFatal }
      );
    });
  }

  static logEvent(
    name: string,
    category: EventCategory,
    parameters?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      name,
      category,
      parameters: parameters || {},
      timestamp: new Date(),
    };

    // Log to Firebase
    analytics().logEvent(name, {
      category,
      ...parameters,
    });

    // Queue for batching
    this.eventQueue.push(event);
  }

  static logTripEvent(action: 'started' | 'completed' | 'cancelled', tripId: string, fare?: number): void {
    this.logEvent(`trip_${action}`, 'trip', {
      tripId,
      fare,
    });
  }

  static logPaymentEvent(amount: number, method: string, status: 'success' | 'failed'): void {
    this.logEvent(
      `payment_${status}`,
      'payment',
      { amount, method }
    );
  }

  static logNavigationEvent(screenName: string): void {
    this.logEvent(`screen_view`, 'navigation', {
      screen_name: screenName,
    });
  }

  static logPerformanceMetric(name: string, value: number, unit: string = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
    };

    this.performanceMetrics.push(metric);

    // Log warning if threshold exceeded
    if (name === 'api_response_time' && value > 1000) {
      console.warn(`Slow API response: ${value}ms`);
    }
  }

  static logError(
    message: string,
    error?: Error | any,
    context?: Record<string, any>
  ): void {
    const stackTrace = error?.stack || 'No stack trace';
    const errorMessage = error?.message || String(error) || message;

    // Log to Crashlytics
    if (error instanceof Error) {
      crashlytics().recordError(error);
    } else {
      crashlytics().log(message);
    }

    const report: CrashReport = {
      id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: errorMessage,
      stack: stackTrace,
      timestamp: new Date(),
      level: 'error',
      context: context || {},
      platform: Platform.OS,
      appVersion: '1.0.0',
    };

    this.crashReports.push(report);

    // Persist for offline storage
    this.persistCrashes();
  }

  static logUserAction(action: string, details?: Record<string, any>): void {
    this.logEvent(`user_${action}`, 'engagement', details);
  }

  private static startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, 30000); // Every 30 seconds
  }

  private static async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const batch = this.eventQueue.splice(0, 50); // Process 50 at a time
      
      // Send to analytics backend
      await fetch('https://api.dalasmart.app/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          user_id: this.userId,
          events: batch,
        }),
      });

      console.log(`Processed ${batch.length} analytics events`);
    } catch (error) {
      console.error('Failed to process analytics batch:', error);
      // Re-add to queue
      this.eventQueue.unshift(...this.eventQueue.splice(0, 50));
    }
  }

  private static async persistCrashes(): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(this.CRASH_KEY);
      const crashes = existing ? JSON.parse(existing) : [];
      crashes.push(...this.crashReports.slice(-10)); // Keep last 10
      await AsyncStorage.setItem(this.CRASH_KEY, JSON.stringify(crashes));
    } catch (error) {
      console.error('Failed to persist crashes:', error);
    }
  }

  static async getCrashReports(limit: number = 20): Promise<CrashReport[]> {
    try {
      const saved = await AsyncStorage.getItem(this.CRASH_KEY);
      if (!saved) return [];
      const crashes = JSON.parse(saved);
      return crashes.slice(0, limit);
    } catch (error) {
      console.error('Failed to retrieve crash reports:', error);
      return [];
    }
  }

  static async clearCrashReports(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CRASH_KEY);
      this.crashReports = [];
    } catch (error) {
      console.error('Failed to clear crash reports:', error);
    }
  }

  static getSessionId(): string {
    return this.sessionId;
  }

  static stopBatchProcessing(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

export const AnalyticsService = AnalyticsServiceClass;
