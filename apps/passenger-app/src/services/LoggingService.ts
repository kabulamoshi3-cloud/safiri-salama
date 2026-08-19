import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, any>;
  stack?: string;
  platform: string;
  appVersion: string;
}

export interface PerformanceLog {
  name: string;
  startTime: number;
  duration: number;
  status: 'success' | 'failed';
  details?: Record<string, any>;
}

class LoggingServiceClass {
  private logs: LogEntry[] = [];
  private performanceLogs: PerformanceLog[] = [];
  private readonly STORAGE_KEY = '@dalasmart:logs';
  private readonly PERF_STORAGE_KEY = '@dalasmart:perf_logs';
  private readonly MAX_LOGS = 1000;
  private batchUploadTimer: NodeJS.Timeout | null = null;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = this.isDevelopment ? 'debug' : 'info';

  async initialize(): Promise<void> {
    await this.loadLogs();
    this.startBatchUpload();
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: Record<string, any>,
    stack?: string
  ): void {
    // Don't log debug in production
    if (level === 'debug' && !this.isDevelopment) return;

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      module,
      message,
      data,
      stack,
      platform: Platform.OS,
      appVersion: '1.0.0',
    };

    this.logs.unshift(entry);

    // Keep only last MAX_LOGS
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Console output
    this.consoleOutput(entry);

    // Persist to storage
    this.persistLogs();
  }

  debug(module: string, message: string, data?: Record<string, any>): void {
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: Record<string, any>): void {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: Record<string, any>): void {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, error?: Error | any, data?: Record<string, any>): void {
    this.log(
      'error',
      module,
      message,
      { ...data, error: error?.message },
      error?.stack
    );
  }

  critical(module: string, message: string, error?: Error | any): void {
    this.log(
      'critical',
      module,
      message,
      { error: error?.message },
      error?.stack
    );

    // Alert backend immediately for critical errors
    this.sendCriticalAlert(message, error);
  }

  private consoleOutput(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.module}]`;
    const message = entry.data 
      ? `${entry.message} ${JSON.stringify(entry.data)}` 
      : entry.message;

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, message);
        break;
      case 'info':
        console.log(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
      case 'critical':
        console.error(prefix, message);
        if (entry.stack) console.error(entry.stack);
        break;
    }
  }

  startTimer(name: string): () => void {
    const startTime = performance.now();

    return (status: 'success' | 'failed' = 'success', details?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      const log: PerformanceLog = {
        name,
        startTime,
        duration,
        status,
        details,
      };

      this.performanceLogs.unshift(log);

      // Keep only last 500
      if (this.performanceLogs.length > 500) {
        this.performanceLogs = this.performanceLogs.slice(0, 500);
      }

      // Log if slow
      if (duration > 1000) {
        this.warn('Performance', `${name} took ${duration.toFixed(0)}ms`, details);
      }
    };
  }

  async getLogs(filter?: { level?: LogLevel; module?: string; limit?: number }): Promise<LogEntry[]> {
    let result = [...this.logs];

    if (filter?.level) {
      result = result.filter(l => l.level === filter.level);
    }

    if (filter?.module) {
      result = result.filter(l => l.module.includes(filter.module!));
    }

    const limit = filter?.limit || 100;
    return result.slice(0, limit);
  }

  async getPerformanceLogs(limit: number = 100): Promise<PerformanceLog[]> {
    return this.performanceLogs.slice(0, limit);
  }

  async getSystemHealth(): Promise<{ logs: number; performance: number; disk: string }> {
    const diskSize = await this.getStorageSize();
    return {
      logs: this.logs.length,
      performance: this.performanceLogs.length,
      disk: `${(diskSize / 1024).toFixed(2)} KB`,
    };
  }

  async exportLogs(): Promise<string> {
    const data = {
      exported: new Date().toISOString(),
      logs: this.logs,
      performanceLogs: this.performanceLogs,
    };
    return JSON.stringify(data, null, 2);
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    this.performanceLogs = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    await AsyncStorage.removeItem(this.PERF_STORAGE_KEY);
  }

  private async persistLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  private async loadLogs(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  private startBatchUpload(): void {
    this.batchUploadTimer = setInterval(() => {
      this.uploadLogs();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async uploadLogs(): Promise<void> {
    if (this.logs.length === 0) return;

    try {
      // Get error and critical logs only
      const logsToUpload = this.logs
        .filter(l => l.level === 'error' || l.level === 'critical')
        .slice(0, 50);

      if (logsToUpload.length === 0) return;

      await fetch('https://api.dalasmart.app/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: logsToUpload,
          platform: Platform.OS,
          appVersion: '1.0.0',
        }),
      });

      this.info('Logging', `Uploaded ${logsToUpload.length} logs`);
    } catch (error) {
      this.warn('Logging', 'Failed to upload logs', { error });
    }
  }

  private async sendCriticalAlert(message: string, error?: Error): Promise<void> {
    try {
      await fetch('https://api.dalasmart.app/alerts/critical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          error: error?.message,
          stack: error?.stack,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
        }),
      });
    } catch (err) {
      console.error('Failed to send critical alert:', err);
    }
  }

  private async getStorageSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  stopBatchUpload(): void {
    if (this.batchUploadTimer) {
      clearInterval(this.batchUploadTimer);
      this.batchUploadTimer = null;
    }
  }
}

export const LoggingService = new LoggingServiceClass();
