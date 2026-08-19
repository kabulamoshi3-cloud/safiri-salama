import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TOKEN_KEY = '@dalasmart:token';
const OFFLINE_QUEUE_KEY = '@dalasmart:offline_queue';

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  data?: any;
  timestamp: Date;
  retries: number;
}

export class APIClient {
  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: 'Network error',
        }));

        // Handle 401 - token expired
        if (response.status === 401) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          throw new Error('UNAUTHORIZED');
        }

        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      // Check if it's a network error
      const isNetworkError = error.message === 'Network request failed' || !navigator.onLine;

      if (isNetworkError && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
        // Queue for retry when online
        await this.queueRequest(endpoint, options.method || 'GET', options);
      }

      throw error;
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  static async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  private static async queueRequest(
    endpoint: string,
    method: string,
    options: RequestInit
  ): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const request: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        endpoint,
        method,
        data: options.body ? JSON.parse(options.body as string) : undefined,
        timestamp: new Date(),
        retries: 0,
      };

      queue.push(request);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log(`Queued offline request: ${request.id}`);
    } catch (error) {
      console.error('Failed to queue request:', error);
    }
  }

  static async getOfflineQueue(): Promise<QueuedRequest[]> {
    try {
      const queue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to retrieve offline queue:', error);
      return [];
    }
  }

  static async processOfflineQueue(): Promise<void> {
    const isConnected = await NetInfo.fetch().then(state => state.isConnected ?? false);
    if (!isConnected) return;

    const queue = await this.getOfflineQueue();
    const failedRequests: QueuedRequest[] = [];

    for (const request of queue) {
      try {
        if (request.method === 'POST') {
          await this.post(request.endpoint, request.data);
        } else if (request.method === 'PUT') {
          await this.put(request.endpoint, request.data);
        } else if (request.method === 'PATCH') {
          await this.patch(request.endpoint, request.data);
        }

        console.log(`Processed offline request: ${request.id}`);
      } catch (error) {
        request.retries++;
        if (request.retries < 3) {
          failedRequests.push(request);
        }
        console.error(`Failed to process offline request ${request.id}:`, error);
      }
    }

    // Update queue with failed requests
    if (failedRequests.length > 0) {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedRequests));
    } else {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
  }

  static async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }
}
