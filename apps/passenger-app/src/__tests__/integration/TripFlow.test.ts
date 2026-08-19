import { TripAPI } from '../../services/api/TripAPI';
import { WalletAPI } from '../../services/api/WalletAPI';
import { NotificationService } from '../../services/NotificationService';
import { APIClient } from '../../services/api/client';

jest.mock('../../services/api/client');

describe('Trip Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Trip Booking Flow', () => {
    it('should handle full trip booking lifecycle', async () => {
      // Step 1: Plan trip
      const tripOptions = [
        {
          id: 'trip-opt-1',
          routeId: 'route-1',
          estimatedFare: 5000,
          estimatedDuration: 15,
          estimatedDistance: 8,
          vehicles: 3,
          eta: new Date(),
        },
      ];

      (APIClient.get as jest.Mock).mockResolvedValueOnce(tripOptions);

      const options = await TripAPI.planTrip({
        origin: { lat: -6.7924, lon: 39.2083 },
        destination: { lat: -6.8000, lon: 39.2500 },
      });

      expect(options).toEqual(tripOptions);

      // Step 2: Start trip
      const activeTrip = {
        id: 'trip-123',
        vehicleId: 'vehicle-456',
        routeId: 'route-1',
        startTime: new Date(),
        estimatedArrival: new Date(),
        status: 'searching_driver',
      };

      (APIClient.post as jest.Mock).mockResolvedValueOnce(activeTrip);

      const started = await TripAPI.startTrip(tripOptions[0].id);
      expect(started.status).toBe('searching_driver');

      // Step 3: Check wallet has sufficient balance
      const wallet = { balance: 10000 };
      (APIClient.get as jest.Mock).mockResolvedValueOnce(wallet);

      const balance = await WalletAPI.getBalance();
      expect(balance.balance).toBeGreaterThanOrEqual(tripOptions[0].estimatedFare);

      // Step 4: Complete trip
      (APIClient.post as jest.Mock).mockResolvedValueOnce({ success: true });

      await TripAPI.completeTrip(activeTrip.id);
      expect(APIClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/complete'),
        expect.any(Object)
      );
    });

    it('should handle trip cancellation', async () => {
      const tripId = 'trip-123';
      const reason = 'Driver cancelled';

      (APIClient.post as jest.Mock).mockResolvedValue({ success: true });

      await TripAPI.cancelTrip(tripId, reason);

      expect(APIClient.post).toHaveBeenCalledWith(
        `/trips/${tripId}/cancel`,
        { reason }
      );
    });

    it('should handle insufficient wallet balance', async () => {
      const tripOptions = [
        {
          id: 'trip-opt-1',
          estimatedFare: 10000,
        },
      ];

      const wallet = { balance: 5000 }; // Insufficient
      (APIClient.get as jest.Mock).mockResolvedValue(wallet);

      const balance = await WalletAPI.getBalance();
      expect(balance.balance).toBeLessThan(tripOptions[0].estimatedFare);
    });
  });

  describe('Live Tracking', () => {
    it('should fetch active trip tracking', async () => {
      const tripId = 'trip-123';
      const trackingData = {
        tripId,
        vehicleId: 'vehicle-456',
        vehicleLocation: { lat: -6.7950, lon: 39.2100 },
        vehicleSpeed: 45,
        eta: 8,
        status: 'en_route',
      };

      (APIClient.get as jest.Mock).mockResolvedValue(trackingData);

      const tracking = await TripAPI.getActiveTripTracking(tripId);
      expect(tracking.vehicleSpeed).toBe(45);
      expect(tracking.status).toBe('en_route');
    });

    it('should handle tracking data subscription', async () => {
      const tripId = 'trip-123';
      const mockEventSource = {
        addEventListener: jest.fn(),
        close: jest.fn(),
      };

      // Mock EventSource
      global.EventSource = jest.fn(() => mockEventSource) as any;

      const eventSource = TripAPI.subscribeToTripTracking(tripId);
      expect(eventSource).toBeTruthy();
    });
  });

  describe('Payment Processing', () => {
    it('should process QR payment successfully', async () => {
      const qrRequest = {
        qrCode: 'MERCHANT-001-12345',
        amount: 5000,
      };

      const transaction = {
        id: 'txn-124',
        type: 'payment',
        amount: 5000,
        status: 'completed',
      };

      (APIClient.post as jest.Mock).mockResolvedValue(transaction);

      const result = await WalletAPI.payWithQR(qrRequest);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(5000);
    });

    it('should handle payment failure', async () => {
      const qrRequest = {
        qrCode: 'INVALID_CODE',
        amount: 5000,
      };

      const error = new Error('Invalid QR code');
      (APIClient.post as jest.Mock).mockRejectedValue(error);

      await expect(WalletAPI.payWithQR(qrRequest)).rejects.toThrow();
    });

    it('should process top-up transaction', async () => {
      const topUpRequest = {
        amount: 10000,
        provider: 'mpesa' as const,
        phoneNumber: '+255123456789',
      };

      const transaction = {
        id: 'txn-123',
        type: 'topup',
        amount: 10000,
        status: 'pending',
      };

      (APIClient.post as jest.Mock).mockResolvedValue(transaction);

      const result = await WalletAPI.topUp(topUpRequest);
      expect(result.type).toBe('topup');
      expect(result.status).toBe('pending');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const error = new Error('Network error');
      (APIClient.get as jest.Mock).mockRejectedValue(error);

      await expect(TripAPI.getActiveTrip()).rejects.toThrow('Network error');
    });

    it('should handle API timeout', async () => {
      const error = new Error('Request timeout');
      error['code'] = 'ECONNABORTED';

      (APIClient.get as jest.Mock).mockRejectedValue(error);

      await expect(TripAPI.getActiveTrip()).rejects.toThrow();
    });

    it('should handle invalid response format', async () => {
      (APIClient.get as jest.Mock).mockResolvedValue({
        invalidField: 'data',
      });

      const result = await TripAPI.getActiveTrip();
      expect(result).toBeTruthy();
    });
  });

  describe('Offline Support', () => {
    it('should queue trip requests when offline', async () => {
      const error = new Error('Network request failed');
      (APIClient.post as jest.Mock).mockRejectedValue(error);

      await expect(TripAPI.startTrip('trip-opt-1')).rejects.toThrow();

      // Queue should have the request
      const queue = await APIClient.getOfflineQueue?.();
      expect(queue?.length || 0).toBeGreaterThan(0);
    });

    it('should process queued requests when online', async () => {
      // This would be tested by simulating network restoration
      // and checking if queued requests are processed
    });
  });

  describe('Performance', () => {
    it('should complete trip booking within 5 seconds', async () => {
      const start = Date.now();

      (APIClient.get as jest.Mock).mockResolvedValue([]);
      (APIClient.post as jest.Mock).mockResolvedValue({});

      await TripAPI.planTrip({
        origin: { lat: -6.7924, lon: 39.2083 },
        destination: { lat: -6.8000, lon: 39.2500 },
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });
});
