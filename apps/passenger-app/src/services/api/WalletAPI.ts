import { APIClient } from './client';
import type { Wallet, Transaction, MobileMoneyProvider } from '../../types/shared';

export interface TopUpRequest {
  amount: number;
  provider: MobileMoneyProvider;
  phoneNumber: string;
}

export interface QRPaymentRequest {
  qrCode: string;
  amount: number;
}

export class WalletAPI {
  static async getWallet(): Promise<Wallet> {
    return APIClient.get<Wallet>('/wallet');
  }

  static async topUp(request: TopUpRequest): Promise<Transaction> {
    return APIClient.post<Transaction>('/wallet/topup', request);
  }

  static async payWithQR(request: QRPaymentRequest): Promise<Transaction> {
    return APIClient.post<Transaction>('/wallet/qr-payment', request);
  }

  static async getTransactions(
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    return APIClient.get<Transaction[]>(
      `/wallet/transactions?limit=${limit}&offset=${offset}`
    );
  }

  static async getTransactionById(transactionId: string): Promise<Transaction> {
    return APIClient.get<Transaction>(`/wallet/transactions/${transactionId}`);
  }

  static async getBalance(): Promise<{ balance: number }> {
    return APIClient.get<{ balance: number }>('/wallet/balance');
  }
}




