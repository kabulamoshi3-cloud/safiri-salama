import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  tags: string[]; // For bulk invalidation
}

export interface CacheOptions {
  ttl?: number; // 5 minutes default
  tags?: string[];
  force?: boolean; // Bypass cache
}

class CacheServiceClass {
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_PREFIX = '@dalasmart:cache:';
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private observers: Map<string, Set<(value: any) => void>> = new Map();

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      // Check memory cache first
      const memEntry = this.memoryCache.get(key);
      if (memEntry && this.isValid(memEntry)) {
        return memEntry.value as T;
      }

      // Check AsyncStorage
      const stored = await AsyncStorage.getItem(this.CACHE_PREFIX + key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      if (!this.isValid(entry)) {
        await this.delete(key);
        return null;
      }

      // Update memory cache
      this.memoryCache.set(key, entry);
      return entry.value;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl,
        tags: options.tags || [],
      };

      // Store in memory cache
      this.memoryCache.set(key, entry);

      // Store in AsyncStorage
      await AsyncStorage.setItem(
        this.CACHE_PREFIX + key,
        JSON.stringify(entry)
      );

      // Notify observers
      this.notifyObservers(key, value);

      console.log(`Cache set: ${key} (TTL: ${ttl}ms)`);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Return cached value if valid and not forcing refresh
    if (!options.force) {
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch fresh value
    try {
      const value = await fetchFn();
      await this.set(key, value, options);
      return value;
    } catch (error) {
      console.error(`Cache fetch error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(this.CACHE_PREFIX + key);
      console.log(`Cache deleted: ${key}`);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      // Get all cache keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));

      for (const fullKey of cacheKeys) {
        const key = fullKey.replace(this.CACHE_PREFIX, '');
        const entry = await this.get(key);
        if (entry && this.memoryCache.get(key)?.tags.includes(tag)) {
          await this.delete(key);
        }
      }

      console.log(`Cache invalidated by tag: ${tag}`);
    } catch (error) {
      console.error(`Cache invalidation error for tag ${tag}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      this.memoryCache.clear();
      console.log(`Cache cleared (${cacheKeys.length} entries)`);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Cache size calculation error:', error);
      return 0;
    }
  }

  async pruneExpired(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));

      let prunedCount = 0;
      for (const fullKey of cacheKeys) {
        const key = fullKey.replace(this.CACHE_PREFIX, '');
        const stored = await AsyncStorage.getItem(fullKey);
        
        if (stored) {
          const entry: CacheEntry<any> = JSON.parse(stored);
          if (!this.isValid(entry)) {
            await this.delete(key);
            prunedCount++;
          }
        }
      }

      console.log(`Cache pruned: ${prunedCount} expired entries`);
      return prunedCount;
    } catch (error) {
      console.error('Cache pruning error:', error);
      return 0;
    }
  }

  subscribe(key: string, callback: (value: any) => void): () => void {
    // Add observer
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }
    this.observers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.observers.get(key)?.delete(callback);
    };
  }

  private isValid(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  private notifyObservers(key: string, value: any): void {
    const callbacks = this.observers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error('Cache observer error:', error);
        }
      });
    }
  }

  // Cache strategies for common endpoints
  async cacheTrip(tripId: string, data: any): Promise<void> {
    await this.set(`trip:${tripId}`, data, {
      ttl: 10 * 60 * 1000, // 10 minutes
      tags: ['trips', `trip:${tripId}`],
    });
  }

  async getCachedTrip(tripId: string): Promise<any> {
    return this.get(`trip:${tripId}`);
  }

  async cacheWallet(userId: string, data: any): Promise<void> {
    await this.set(`wallet:${userId}`, data, {
      ttl: 2 * 60 * 1000, // 2 minutes
      tags: ['wallet', `wallet:${userId}`],
    });
  }

  async getCachedWallet(userId: string): Promise<any> {
    return this.get(`wallet:${userId}`);
  }

  async invalidateTrips(): Promise<void> {
    await this.invalidateByTag('trips');
  }

  async invalidateWallet(): Promise<void> {
    await this.invalidateByTag('wallet');
  }
}

export const CacheService = new CacheServiceClass();
