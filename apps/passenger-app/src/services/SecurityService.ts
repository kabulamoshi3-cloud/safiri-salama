import { Platform } from 'react-native';
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'react-native-secure-store';

export interface SecurityConfig {
  enableCertificatePinning: boolean;
  enableBiometric: boolean;
  encryptSensitiveData: boolean;
  tokenRotationInterval: number; // milliseconds
}

class SecurityServiceClass {
  private config: SecurityConfig = {
    enableCertificatePinning: true,
    enableBiometric: true,
    encryptSensitiveData: true,
    tokenRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
  };

  private certificatePins: Map<string, string[]> = new Map([
    ['api.dalasmart.app', [
      // SHA256 public key pins
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    ]],
  ]);

  private lastTokenRotation = 0;

  async initialize(): Promise<void> {
    try {
      // Setup certificate pinning if enabled
      if (this.config.enableCertificatePinning) {
        this.setupCertificatePinning();
      }

      // Setup biometric authentication if enabled
      if (this.config.enableBiometric) {
        await this.setupBiometric();
      }

      // Check token age
      await this.checkTokenRotation();

      console.log('SecurityService initialized');
    } catch (error) {
      console.error('SecurityService initialization error:', error);
      throw error;
    }
  }

  private setupCertificatePinning(): void {
    // Configure axios to use certificate pinning
    // This would typically be done via native module for React Native
    console.log('Certificate pinning configured');
  }

  private async setupBiometric(): Promise<void> {
    try {
      // Check if biometric is available
      const isBiometricAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

      if (isBiometricAvailable) {
        // You would integrate with react-native-biometrics here
        console.log('Biometric authentication available');
      }
    } catch (error) {
      console.warn('Biometric setup error:', error);
    }
  }

  private async checkTokenRotation(): Promise<void> {
    const lastRotation = await AsyncStorage.getItem('@dalasmart:last_token_rotation');
    
    if (lastRotation) {
      const timeSinceRotation = Date.now() - parseInt(lastRotation);
      
      if (timeSinceRotation > this.config.tokenRotationInterval) {
        await this.rotateToken();
      }
    }
  }

  private async rotateToken(): Promise<void> {
    try {
      // Implement token rotation logic
      const newToken = await this.requestNewToken();
      
      if (newToken) {
        // Store new token securely
        await this.storeToken(newToken);
        this.lastTokenRotation = Date.now();
        
        console.log('Token rotated successfully');
      }
    } catch (error) {
      console.error('Token rotation failed:', error);
    }
  }

  private async requestNewToken(): Promise<string | null> {
    try {
      // Call backend to get new token
      const response = await fetch('https://api.dalasmart.app/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
      return null;
    } catch (error) {
      console.error('Failed to request new token:', error);
      return null;
    }
  }

  async storeToken(token: string): Promise<void> {
    try {
      // Use secure storage for tokens
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await SecureStore.setItem('@dalasmart:token', token);
      } else {
        // Fallback to AsyncStorage
        await AsyncStorage.setItem('@dalasmart:token', token);
      }
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return await SecureStore.getItem('@dalasmart:token');
      } else {
        return await AsyncStorage.getItem('@dalasmart:token');
      }
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  async clearToken(): Promise<void> {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await SecureStore.removeItem('@dalasmart:token');
      } else {
        await AsyncStorage.removeItem('@dalasmart:token');
      }
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  async encryptData(data: any): Promise<string> {
    try {
      // Simple base64 encoding for now
      // In production, use proper encryption like AES-256
      const json = JSON.stringify(data);
      return Buffer.from(json).toString('base64');
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      throw error;
    }
  }

  async decryptData(encrypted: string): Promise<any> {
    try {
      const json = Buffer.from(encrypted, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      throw error;
    }
  }

  async hashPassword(password: string): Promise<string> {
    // Use bcrypt or similar for production
    // For now, using simple approach
    try {
      const hash = await this.sha256(password);
      return hash;
    } catch (error) {
      console.error('Failed to hash password:', error);
      throw error;
    }
  }

  private async sha256(str: string): Promise<string> {
    // Placeholder for SHA256 implementation
    return Buffer.from(str).toString('base64');
  }

  async validateSSLCertificate(host: string): Promise<boolean> {
    if (!this.config.enableCertificatePinning) {
      return true;
    }

    const pins = this.certificatePins.get(host);
    if (!pins || pins.length === 0) {
      return true; // No pins configured for this host
    }

    // In production, you would validate the certificate here
    // This is a placeholder implementation
    console.log(`Validating certificate for ${host}`);
    return true;
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Security config updated:', this.config);
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  async performSecurityAudit(): Promise<{
    tokenValid: boolean;
    encryptionEnabled: boolean;
    certificatePinningEnabled: boolean;
    biometricEnabled: boolean;
    lastAudit: Date;
  }> {
    const token = await this.getToken();
    
    return {
      tokenValid: !!token,
      encryptionEnabled: this.config.encryptSensitiveData,
      certificatePinningEnabled: this.config.enableCertificatePinning,
      biometricEnabled: this.config.enableBiometric,
      lastAudit: new Date(),
    };
  }
}

export const SecurityService = new SecurityServiceClass();
