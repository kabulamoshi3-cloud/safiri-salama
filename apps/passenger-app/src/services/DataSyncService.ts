import BackgroundTask from 'react-native-background-task';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalletAPI } from './api/WalletAPI';
import { TripAPI } from './api/TripAPI';
import { DriverAPI } from '../../../driver-app/src/services/api/DriverAPI';
import { CacheService } from './CacheService';
import { LoggingService } from './LoggingService';

export type SyncResource = 'wallet' | 'trips' | 'earnings' | 'profile';

export interface SyncJob {
  id: string;
  resource: SyncResource;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retries: number;
  error?: string;
}

class DataSyncServiceClass {
  private syncJobs: Map<string, SyncJob> = new Map();
  private readonly SYNC_KEY = '@dalasmart:sync_jobs';
  private readonly MIN_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private lastSyncTime: Map<SyncResource, number> = new Map();
  private syncEnabled = true;

  async initialize(): Promise<void> {
    try {
      // Register background task
      BackgroundTask.define(async () => {
        await this.performSync();
      });

      // Load persisted sync jobs
      await this.loadSyncJobs();

      // Start periodic sync
      await this.scheduleSyncTask();

      LoggingService.info('DataSync', 'DataSyncService initialized');
    } catch (error) {
      LoggingService.error('DataSync', 'Initialization error', error as Error);
    }
  }

  async scheduleSyncTask(): Promise<void> {
    try {
      await BackgroundTask.schedule({
        period: 15 * 60, // 15 minutes
      });
    } catch (error) {
      LoggingService.warn('DataSync', 'Failed to schedule background task', { error });
    }
  }

  async performSync(): Promise<void> {
    if (!this.syncEnabled) return;

    LoggingService.info('DataSync', 'Starting background sync');

    try {
      // Sync wallet
      await this.syncResource('wallet');

      // Sync trips
      await this.syncResource('trips');

      // Sync earnings (driver app)
      await this.syncResource('earnings');

      // Clear old sync jobs
      this.clearCompletedJobs();

      LoggingService.info('DataSync', 'Background sync completed');
    } catch (error) {
      LoggingService.error('DataSync', 'Background sync failed', error as Error);
    }
  }

  private async syncResource(resource: SyncResource): Promise<void> {
    const jobId = `${resource}-${Date.now()}`;
    const job: SyncJob = {
      id: jobId,
      resource,
      timestamp: new Date(),
      status: 'syncing',
      retries: 0,
    };

    this.syncJobs.set(jobId, job);

    try {
      // Check if already synced recently
      const lastSync = this.lastSyncTime.get(resource) || 0;
      if (Date.now() - lastSync < this.MIN_SYNC_INTERVAL) {
        job.status = 'completed';
        return;
      }

      switch (resource) {
        case 'wallet':
          await this.syncWallet();
          break;
        case 'trips':
          await this.syncTrips();
          break;
        case 'earnings':
          await this.syncEarnings();
          break;
        case 'profile':
          await this.syncProfile();
          break;
      }

      job.status = 'completed';
      this.lastSyncTime.set(resource, Date.now());

      LoggingService.info('DataSync', `Synced ${resource}`);
    } catch (error: any) {
      job.retries++;
      job.error = error.message;

      // Retry up to 3 times
      if (job.retries < 3) {
        job.status = 'pending';
        LoggingService.warn('DataSync', `Retry ${job.retries} for ${resource}`, { error });
      } else {
        job.status = 'failed';
        LoggingService.error('DataSync', `Failed to sync ${resource} after retries`, error);
      }
    }

    await this.persistSyncJobs();
  }

  private async syncWallet(): Promise<void> {
    const userId = await AsyncStorage.getItem('@dalasmart:user_id');
    if (!userId) return;

    const wallet = await WalletAPI.getWallet();
    await CacheService.cacheWallet(userId, wallet);
  }

  private async syncTrips(): Promise<void> {
    const activeTrip = await TripAPI.getActiveTrip();
    if (activeTrip) {
      await CacheService.cacheTrip(activeTrip.id, activeTrip);
    }

    // Also get trip history
    const history = await TripAPI.getTripHistory(10);
    await AsyncStorage.setItem(
      '@dalasmart:trip_history',
      JSON.stringify(history)
    );
  }

  private async syncEarnings(): Promise<void> {
    try {
      const earnings = await DriverAPI.getEarnings();
      await AsyncStorage.setItem(
        '@dalasmart:earnings',
        JSON.stringify(earnings)
      );
    } catch (error) {
      // May not be a driver
      console.log('Not a driver, skipping earnings sync');
    }
  }

  private async syncProfile(): Promise<void> {
    // Implement profile sync
  }

  async getLastSyncTime(resource: SyncResource): Promise<Date | null> {
    const timestamp = this.lastSyncTime.get(resource);
    return timestamp ? new Date(timestamp) : null;
  }

  async getSyncStatus(): Promise<Record<SyncResource, { lastSync: Date | null; status: 'synced' | 'pending' | 'failed' }>> {
    return {
      wallet: {
        lastSync: await this.getLastSyncTime('wallet'),
        status: this.getSyncResourceStatus('wallet'),
      },
      trips: {
        lastSync: await this.getLastSyncTime('trips'),
        status: this.getSyncResourceStatus('trips'),
      },
      earnings: {
        lastSync: await this.getLastSyncTime('earnings'),
        status: this.getSyncResourceStatus('earnings'),
      },
      profile: {
        lastSync: await this.getLastSyncTime('profile'),
        status: this.getSyncResourceStatus('profile'),
      },
    };
  }

  private getSyncResourceStatus(resource: SyncResource): 'synced' | 'pending' | 'failed' {
    const jobs = Array.from(this.syncJobs.values()).filter(j => j.resource === resource);
    if (jobs.length === 0) return 'synced';

    const latest = jobs[jobs.length - 1];
    if (latest.status === 'completed') return 'synced';
    if (latest.status === 'pending' || latest.status === 'syncing') return 'pending';
    return 'failed';
  }

  async manualSync(resource?: SyncResource): Promise<void> {
    LoggingService.info('DataSync', 'Manual sync triggered', { resource });

    if (resource) {
      await this.syncResource(resource);
    } else {
      // Sync all
      await this.performSync();
    }
  }

  async setSyncEnabled(enabled: boolean): Promise<void> {
    this.syncEnabled = enabled;
    LoggingService.info('DataSync', `Sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  private async persistSyncJobs(): Promise<void> {
    try {
      const jobs = Array.from(this.syncJobs.values());
      await AsyncStorage.setItem(this.SYNC_KEY, JSON.stringify(jobs));
    } catch (error) {
      LoggingService.error('DataSync', 'Failed to persist sync jobs', error as Error);
    }
  }

  private async loadSyncJobs(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(this.SYNC_KEY);
      if (saved) {
        const jobs = JSON.parse(saved);
        this.syncJobs = new Map(jobs.map((j: SyncJob) => [j.id, j]));
      }
    } catch (error) {
      LoggingService.error('DataSync', 'Failed to load sync jobs', error as Error);
    }
  }

  private clearCompletedJobs(): void {
    const completed = Array.from(this.syncJobs.entries())
      .filter(([, job]) => job.status === 'completed')
      .map(([id]) => id);

    completed.forEach(id => this.syncJobs.delete(id));
  }

  async getSyncJobs(): Promise<SyncJob[]> {
    return Array.from(this.syncJobs.values());
  }

  async clearSyncJobs(): Promise<void> {
    this.syncJobs.clear();
    await AsyncStorage.removeItem(this.SYNC_KEY);
  }
}

export const DataSyncService = new DataSyncServiceClass();
