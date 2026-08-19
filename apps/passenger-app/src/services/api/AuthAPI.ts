import { APIClient } from './client';
import type { User } from '@dalasmart/shared-types';

interface AuthResponse {
  token: string;
  user: User;
}

interface VerifyPhoneResponse {
  success: boolean;
  message: string;
}

export class AuthAPI {
  static async login(phoneNumber: string, password: string): Promise<AuthResponse> {
    return APIClient.post<AuthResponse>('/auth/login', {
      phoneNumber,
      password,
    });
  }

  static async register(
    phoneNumber: string,
    password: string,
    fullName: string
  ): Promise<AuthResponse> {
    return APIClient.post<AuthResponse>('/auth/register', {
      phoneNumber,
      password,
      fullName,
      userType: 'passenger',
    });
  }

  static async verifyPhone(
    phoneNumber: string,
    code: string
  ): Promise<VerifyPhoneResponse> {
    return APIClient.post<VerifyPhoneResponse>('/auth/verify-phone', {
      phoneNumber,
      code,
    });
  }

  static async resendVerificationCode(phoneNumber: string): Promise<void> {
    return APIClient.post<void>('/auth/resend-code', { phoneNumber });
  }

  static async forgotPassword(phoneNumber: string): Promise<void> {
    return APIClient.post<void>('/auth/forgot-password', { phoneNumber });
  }

  static async resetPassword(
    phoneNumber: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    return APIClient.post<void>('/auth/reset-password', {
      phoneNumber,
      code,
      newPassword,
    });
  }
}
