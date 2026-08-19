import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  originalError?: Error;
  isNetworkError: boolean;
  isRetryable: boolean;
  timestamp: Date;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

class ErrorHandlerClass {
  private offlineQueue: Array<{
    id: string;
    endpoint: string;
    method: string;
    data?: any;
    timestamp: Date;
  }> = [];

  async isNetworkConnected(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  async handleError(error: any, endpoint: string): Promise<ApiError> {
    const isNetworkError =
      error.code === 'NETWORK_ERROR' || !error.response || error.message === 'Network request failed';

    const isRetryable =
      isNetworkError ||
      (error.response?.status >= 500 && error.response.status < 600) ||
      error.response?.status === 408 ||
      error.response?.status === 429;

    const apiError: ApiError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      status: error.response?.status,
      originalError: error,
      isNetworkError,
      isRetryable,
      timestamp: new Date(),
    };

    // Log error
    console.error(`[${apiError.code}] ${endpoint}:`, apiError.message);

    // Save to offline queue if network error
    if (isNetworkError) {
      await this.saveToOfflineQueue(endpoint, error);
    }

    return apiError;
  }

  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: any;
    let delay = config.initialDelay;

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const apiError = await this.handleError(error, 'unknown');
        if (!apiError.isRetryable) {
          throw error;
        }

        // Check if network is available for next attempt
        const hasNetwork = await this.isNetworkConnected();
        if (!hasNetwork && attempt < config.maxRetries - 1) {
          console.log(`Attempt ${attempt + 1} failed, no network. Waiting ${delay}ms...`);
        } else if (attempt < config.maxRetries - 1) {
          console.log(
            `Attempt ${attempt + 1} failed with status ${apiError.status}. Retrying in ${delay}ms...`
          );
        }

        // Wait before retry
        if (attempt < config.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
        }
      }
    }

    throw lastError;
  }

  private async saveToOfflineQueue(endpoint: string, error: any): Promise<void> {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const queueItem = {
        id,
        endpoint,
        method: error.config?.method || 'POST',
        data: error.config?.data,
        timestamp: new Date(),
      };

      const queue = await this.getOfflineQueue();
      queue.push(queueItem);
      await AsyncStorage.setItem('@dalasmart:offline_queue', JSON.stringify(queue));

      console.log(`Saved offline request: ${id} -> ${endpoint}`);
    } catch (storageError) {
      console.error('Failed to save to offline queue:', storageError);
    }
  }

  async getOfflineQueue(): Promise<typeof this.offlineQueue> {
    try {
      const saved = await AsyncStorage.getItem('@dalasmart:offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to retrieve offline queue:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@dalasmart:offline_queue');
      this.offlineQueue = [];
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }

  async processOfflineQueue(apiCall: (item: any) => Promise<any>): Promise<void> {
    const queue = await this.getOfflineQueue();

    for (const item of queue) {
      try {
        await this.retryWithBackoff(() => apiCall(item));
        console.log(`Processed offline request: ${item.id}`);

        // Remove from queue
        const updatedQueue = queue.filter(q => q.id !== item.id);
        await AsyncStorage.setItem('@dalasmart:offline_queue', JSON.stringify(updatedQueue));
      } catch (error) {
        console.error(`Failed to process offline request ${item.id}:`, error);
      }
    }
  }

  getUserFriendlyMessage(error: ApiError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      case 'UNAUTHORIZED':
        return 'Your session has expired. Please log in again.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND':
        return 'The requested resource was not found.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'SERVER_ERROR':
        return 'Server error occurred. Please try again later.';
      case 'TIMEOUT':
        return 'Request timed out. Please check your connection and try again.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }
}

export const ErrorHandler = new ErrorHandlerClass();
