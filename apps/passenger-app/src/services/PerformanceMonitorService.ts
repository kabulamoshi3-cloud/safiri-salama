import { PerformanceObserver, performance } from 'perf_hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemoryInfo, MemoryWarning } from 'react-native';
import { AppState, Platform } from 'react-native';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  category: 'network' | 'rendering' | 'memory' | 'startup' | 'custom';
  metadata?: Record<string, any>;
}

export interface MemoryMetric {
  timestamp: Date;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface PerformanceBudget {
  apiResponseTime: number; // ms
  screenRenderTime: number; // ms
  memoryUsage: number; // MB
  batteryDrain: number; // % per hour
}

class PerformanceMonitorServiceClass {
  private metrics: PerformanceMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private startTime = Date.now();
  private appState = 'active';
  private readonly STORAGE_KEY = '@dalasmart:perf_metrics';
  private readonly MAX_METRICS = 1000;
  
  private budget: PerformanceBudget = {
    apiResponseTime: 1000,
    screenRenderTime: 16.67, // 60fps
    memoryUsage: 150, // MB
    batteryDrain: 15, // % per hour
  };

  async initialize(): Promise<void> {
    try {
      // Load persisted metrics
      await this.loadMetrics();

      // Start monitoring memory
      this.startMemoryMonitoring();

      // Monitor app lifecycle
      AppState.addEventListener('change', this.handleAppStateChange.bind(this));

      console.log('PerformanceMonitorService initialized');
    } catch (error) {
      console.error('PerformanceMonitorService error:', error);
    }
  }

  private startMemoryMonitoring(): void {
    // Monitor memory every 10 seconds
    setInterval(async () => {
      try {
        const info = process.memoryUsage();
        
        const metric: MemoryMetric = {
          timestamp: new Date(),
          heapUsed: info.heapUsed / 1024 / 1024, // Convert to MB
          heapTotal: info.heapTotal / 1024 / 1024,
          external: info.external / 1024 / 1024,
          arrayBuffers: (info.arrayBuffers || 0) / 1024 / 1024,
        };

        this.memoryMetrics.unshift(metric);

        // Keep only last 500
        if (this.memoryMetrics.length > 500) {
          this.memoryMetrics = this.memoryMetrics.slice(0, 500);
        }

        // Check budget
        if (metric.heapUsed > this.budget.memoryUsage) {
          console.warn(`Memory usage exceeded budget: ${metric.heapUsed}MB > ${this.budget.memoryUsage}MB`);
        }
      } catch (error) {
        console.error('Memory monitoring error:', error);
      }
    }, 10000);
  }

  private handleAppStateChange(state: string): void {
    this.appState = state;
    this.logMetric(`app_state_${state}`, 0, 'custom');
  }

  startMeasure(name: string): { stop: (metadata?: Record<string, any>) => void } {
    const startMark = `${name}-start-${Date.now()}`;
    const endMark = `${name}-end-${Date.now()}`;
    const measureName = `${name}-measure-${Date.now()}`;

    performance.mark(startMark);

    return {
      stop: (metadata?: Record<string, any>) => {
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);

        const measure = performance.getEntriesByName(measureName)[0];
        if (measure) {
          this.logMetric(name, measure.duration, 'custom', metadata);
        }
      },
    };
  }

  logMetric(
    name: string,
    duration: number,
    category: 'network' | 'rendering' | 'memory' | 'startup' | 'custom',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date(),
      category,
      metadata,
    };

    this.metrics.unshift(metric);

    // Keep only last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(0, this.MAX_METRICS);
    }

    // Check budget and log warning if exceeded
    this.checkBudget(metric);

    // Persist metrics
    this.persistMetrics();
  }

  private checkBudget(metric: PerformanceMetric): void {
    switch (metric.category) {
      case 'network':
        if (metric.duration > this.budget.apiResponseTime) {
          console.warn(`API response slow: ${metric.name} took ${metric.duration}ms`);
        }
        break;
      case 'rendering':
        if (metric.duration > this.budget.screenRenderTime) {
          console.warn(`Screen render slow: ${metric.name} took ${metric.duration}ms`);
        }
        break;
    }
  }

  async getMetrics(
    category?: string,
    limit: number = 100
  ): Promise<PerformanceMetric[]> {
    let result = [...this.metrics];

    if (category) {
      result = result.filter(m => m.category === category);
    }

    return result.slice(0, limit);
  }

  async getMemoryMetrics(limit: number = 100): Promise<MemoryMetric[]> {
    return this.memoryMetrics.slice(0, limit);
  }

  getAverageMetric(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;

    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  getP95Metric(name: string): number {
    const filtered = this.metrics
      .filter(m => m.name === name)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (filtered.length === 0) return 0;

    const index = Math.ceil(filtered.length * 0.95) - 1;
    return filtered[index];
  }

  async getPerformanceReport(): Promise<{
    appUptime: number;
    totalMetrics: number;
    avgApiResponseTime: number;
    p95ApiResponseTime: number;
    peakMemoryUsage: number;
    averageMemoryUsage: number;
    budgetViolations: number;
    timestamp: Date;
  }> {
    const appUptime = Date.now() - this.startTime;
    const apiMetrics = this.metrics.filter(m => m.category === 'network');

    const budgetViolations = apiMetrics.filter(
      m => m.duration > this.budget.apiResponseTime
    ).length;

    const memoryUsages = this.memoryMetrics.map(m => m.heapUsed);
    const peakMemory = Math.max(...memoryUsages);
    const avgMemory = memoryUsages.length > 0
      ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
      : 0;

    return {
      appUptime,
      totalMetrics: this.metrics.length,
      avgApiResponseTime: this.getAverageMetric('api_request'),
      p95ApiResponseTime: this.getP95Metric('api_request'),
      peakMemoryUsage: peakMemory,
      averageMemoryUsage: avgMemory,
      budgetViolations,
      timestamp: new Date(),
    };
  }

  setBudget(budget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...budget };
    console.log('Performance budget updated:', this.budget);
  }

  async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.memoryMetrics = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  private async persistMetrics(): Promise<void> {
    try {
      // Only save network metrics (smaller dataset)
      const networkMetrics = this.metrics.filter(m => m.category === 'network').slice(0, 100);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(networkMetrics));
    } catch (error) {
      console.error('Failed to persist metrics:', error);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.metrics = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }

  getMetricsByTimeRange(startTime: Date, endTime: Date): PerformanceMetric[] {
    return this.metrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  exportMetrics(): string {
    const data = {
      exported: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      metrics: this.metrics,
      memoryMetrics: this.memoryMetrics,
      report: this.getPerformanceReport(),
    };
    return JSON.stringify(data, null, 2);
  }
}

export const PerformanceMonitorService = new PerformanceMonitorServiceClass();
