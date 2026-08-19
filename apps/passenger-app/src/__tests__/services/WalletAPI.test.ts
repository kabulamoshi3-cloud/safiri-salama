import { WalletAPI } from '../../services/api/WalletAPI';
import { APIClient } from '../../services/api/client';

jest.mock('../../services/api/client');

describe('WalletAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should return wallet data', async () => {
      const mockWallet = {
        id: 'wallet-123',
        balance: 50000,
        locked: 0,
        lastUpdated: new Date(),
      };

      (APIClient.get as jest.Mock).mockResolvedValue(mockWallet);

      const result = await WalletAPI.getWallet();

      expect(result).toEqual(mockWallet);
      expect(APIClient.get).toHaveBeenCalledWith('/wallet');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (APIClient.get as jest.Mock).mockRejectedValue(error);

      await expect(WalletAPI.getWallet()).rejects.toThrow('Network error');
    });
  });

  describe('getBalance', () => {
    it('should return balance', async () => {
      const mockBalance = { balance: 25000 };
      (APIClient.get as jest.Mock).mockResolvedValue(mockBalance);

      const result = await WalletAPI.getBalance();

      expect(result.balance).toBe(25000);
      expect(APIClient.get).toHaveBeenCalledWith('/wallet/balance');
    });
  });

  describe('topUp', () => {
    it('should process top up request', async () => {
      const topUpRequest = {
        amount: 10000,
        provider: 'mpesa' as const,
        phoneNumber: '+255123456789',
      };

      const mockTransaction = {
        id: 'txn-123',
        type: 'topup' as const,
        amount: 10000,
        timestamp: new Date(),
        status: 'pending' as const,
        description: 'Top up via M-Pesa',
      };

      (APIClient.post as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await WalletAPI.topUp(topUpRequest);

      expect(result).toEqual(mockTransaction);
      expect(APIClient.post).toHaveBeenCalledWith('/wallet/topup', topUpRequest);
    });

    it('should handle invalid amount', async () => {
      const topUpRequest = {
        amount: -1000,
        provider: 'mpesa' as const,
        phoneNumber: '+255123456789',
      };

      const error = new Error('Invalid amount');
      (APIClient.post as jest.Mock).mockRejectedValue(error);

      await expect(WalletAPI.topUp(topUpRequest)).rejects.toThrow();
    });
  });

  describe('getTransactions', () => {
    it('should return transaction history', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          type: 'payment' as const,
          amount: 5000,
          timestamp: new Date(),
          status: 'completed' as const,
          description: 'Trip payment',
        },
        {
          id: 'txn-2',
          type: 'topup' as const,
          amount: 10000,
          timestamp: new Date(),
          status: 'completed' as const,
          description: 'Top up',
        },
      ];

      (APIClient.get as jest.Mock).mockResolvedValue(mockTransactions);

      const result = await WalletAPI.getTransactions(2, 0);

      expect(result).toEqual(mockTransactions);
      expect(result).toHaveLength(2);
    });

    it('should support pagination', async () => {
      (APIClient.get as jest.Mock).mockResolvedValue([]);

      await WalletAPI.getTransactions(50, 100);

      expect(APIClient.get).toHaveBeenCalledWith(
        '/wallet/transactions?limit=50&offset=100'
      );
    });
  });

  describe('payWithQR', () => {
    it('should process QR payment', async () => {
      const qrRequest = {
        qrCode: 'MERCHANT-001-12345',
        amount: 5000,
      };

      const mockTransaction = {
        id: 'txn-124',
        type: 'payment' as const,
        amount: 5000,
        timestamp: new Date(),
        status: 'completed' as const,
        description: 'QR Payment',
      };

      (APIClient.post as jest.Mock).mockResolvedValue(mockTransaction);

      const result = await WalletAPI.payWithQR(qrRequest);

      expect(result).toEqual(mockTransaction);
      expect(APIClient.post).toHaveBeenCalledWith(
        '/wallet/qr-payment',
        qrRequest
      );
    });
  });
});
