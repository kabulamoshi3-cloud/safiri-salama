import AsyncStorage from '@react-native-async-storage/async-storage';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FraudIndicator {
  name: string;
  score: number; // 0-100
  reason: string;
  timestamp: Date;
}

export interface FraudAnalysis {
  riskLevel: RiskLevel;
  overallScore: number; // 0-100
  indicators: FraudIndicator[];
  recommendation: 'allow' | 'verify' | 'block';
  timestamp: Date;
}

export interface UserBehavior {
  userId: string;
  accountAge: number; // days
  tripCount: number;
  totalSpent: number;
  averageRating: number;
  paymentMethods: Set<string>;
  deviceIds: Set<string>;
  lastRiskLevel: RiskLevel;
  suspiciousActivities: number;
}

class FraudDetectionServiceClass {
  private userBehaviors: Map<string, UserBehavior> = new Map();
  private readonly BEHAVIOR_STORAGE_KEY = '@dalasmart:user_behaviors';
  private readonly FRAUD_LOG_KEY = '@dalasmart:fraud_logs';

  async initialize(): Promise<void> {
    try {
      await this.loadUserBehaviors();
      console.log('FraudDetectionService initialized');
    } catch (error) {
      console.error('FraudDetectionService initialization error:', error);
    }
  }

  async analyzePaymentFraud(
    userId: string,
    amount: number,
    paymentMethod: string,
    deviceId: string,
    location?: { lat: number; lon: number }
  ): Promise<FraudAnalysis> {
    const indicators: FraudIndicator[] = [];
    let totalScore = 0;

    // Check 1: Unusual amount for user
    const behavior = this.userBehaviors.get(userId);
    if (behavior) {
      const avgTransaction = behavior.totalSpent / behavior.tripCount;
      const percentageDeviation = ((amount - avgTransaction) / avgTransaction) * 100;

      if (percentageDeviation > 500) {
        indicators.push({
          name: 'unusual_amount',
          score: 30,
          reason: `Transaction ${percentageDeviation.toFixed(0)}% above average`,
          timestamp: new Date(),
        });
      }
    }

    // Check 2: Multiple payments in short time
    if (await this.checkMultiplePaymentsInShortTime(userId, 5)) {
      indicators.push({
        name: 'rapid_transactions',
        score: 25,
        reason: 'Multiple transactions in 5 minutes',
        timestamp: new Date(),
      });
    }

    // Check 3: Device fraud
    if (behavior && !behavior.deviceIds.has(deviceId)) {
      indicators.push({
        name: 'new_device',
        score: 15,
        reason: 'Transaction from new device',
        timestamp: new Date(),
      });
    }

    // Check 4: Payment method fraud
    const isNewPaymentMethod = behavior && !behavior.paymentMethods.has(paymentMethod);
    if (isNewPaymentMethod && behavior && behavior.tripCount > 10) {
      indicators.push({
        name: 'new_payment_method',
        score: 20,
        reason: 'New payment method for established user',
        timestamp: new Date(),
      });
    }

    // Check 5: Geographic anomaly
    if (location && behavior) {
      const lastLocationAnomaly = await this.checkGeographicAnomaly(userId, location);
      if (lastLocationAnomaly) {
        indicators.push({
          name: 'location_anomaly',
          score: 35,
          reason: 'Impossible travel distance in short time',
          timestamp: new Date(),
        });
      }
    }

    // Check 6: Account age check
    if (behavior && behavior.accountAge < 7) {
      indicators.push({
        name: 'new_account',
        score: 20,
        reason: 'Account less than 7 days old',
        timestamp: new Date(),
      });
    }

    // Check 7: Low rating fraud
    if (behavior && behavior.averageRating < 3 && behavior.tripCount > 5) {
      indicators.push({
        name: 'low_rating',
        score: 25,
        reason: 'User with consistently low ratings attempting transaction',
        timestamp: new Date(),
      });
    }

    // Calculate total score
    totalScore = indicators.reduce((sum, ind) => sum + ind.score, 0);
    totalScore = Math.min(totalScore, 100);

    // Determine risk level
    let riskLevel: RiskLevel;
    if (totalScore >= 80) {
      riskLevel = 'critical';
    } else if (totalScore >= 60) {
      riskLevel = 'high';
    } else if (totalScore >= 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Recommendation
    let recommendation: 'allow' | 'verify' | 'block';
    if (riskLevel === 'critical') {
      recommendation = 'block';
    } else if (riskLevel === 'high') {
      recommendation = 'verify';
    } else {
      recommendation = 'allow';
    }

    // Update behavior
    if (behavior) {
      behavior.lastRiskLevel = riskLevel;
      if (riskLevel === 'high' || riskLevel === 'critical') {
        behavior.suspiciousActivities++;
      }
      behavior.deviceIds.add(deviceId);
      behavior.paymentMethods.add(paymentMethod);
    }

    // Log fraud analysis
    await this.logFraudAnalysis(userId, { riskLevel, totalScore, indicators });

    return {
      riskLevel,
      overallScore: totalScore,
      indicators,
      recommendation,
      timestamp: new Date(),
    };
  }

  private async checkMultiplePaymentsInShortTime(userId: string, minutes: number): Promise<boolean> {
    // Check if user has multiple transactions in last N minutes
    // This would typically query backend transaction logs
    return false; // Placeholder
  }

  private async checkGeographicAnomaly(
    userId: string,
    currentLocation: { lat: number; lon: number }
  ): Promise<boolean> {
    // Check if user traveled impossible distance since last transaction
    // This would query last known location
    return false; // Placeholder
  }

  async analyzeNewAccountFraud(userId: string): Promise<FraudAnalysis> {
    const indicators: FraudIndicator[] = [];

    // New accounts are inherently risky
    indicators.push({
      name: 'new_account_registration',
      score: 40,
      reason: 'Newly registered account',
      timestamp: new Date(),
    });

    // Check for bulk activity
    const isHighActivity = await this.checkHighInitialActivity(userId);
    if (isHighActivity) {
      indicators.push({
        name: 'high_initial_activity',
        score: 30,
        reason: 'Unusual activity pattern for new account',
        timestamp: new Date(),
      });
    }

    const totalScore = Math.min(
      indicators.reduce((sum, ind) => sum + ind.score, 0),
      100
    );

    return {
      riskLevel: 'high',
      overallScore: totalScore,
      indicators,
      recommendation: 'verify',
      timestamp: new Date(),
    };
  }

  private async checkHighInitialActivity(userId: string): Promise<boolean> {
    // Check if new account has made many trips/payments quickly
    return false; // Placeholder
  }

  async flagUserForManualReview(userId: string, reason: string): Promise<void> {
    try {
      await fetch('https://api.dalasmart.app/fraud/flag-manual-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason }),
      });

      console.log(`User ${userId} flagged for manual review: ${reason}`);
    } catch (error) {
      console.error('Failed to flag user for manual review:', error);
    }
  }

  private async logFraudAnalysis(
    userId: string,
    analysis: Partial<FraudAnalysis>
  ): Promise<void> {
    try {
      const logs = await AsyncStorage.getItem(this.FRAUD_LOG_KEY);
      const fraudLogs = logs ? JSON.parse(logs) : [];

      fraudLogs.push({
        userId,
        ...analysis,
        timestamp: new Date().toISOString(),
      });

      // Keep last 1000 logs
      if (fraudLogs.length > 1000) {
        fraudLogs.shift();
      }

      await AsyncStorage.setItem(this.FRAUD_LOG_KEY, JSON.stringify(fraudLogs));
    } catch (error) {
      console.error('Failed to log fraud analysis:', error);
    }
  }

  private async loadUserBehaviors(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(this.BEHAVIOR_STORAGE_KEY);
      if (saved) {
        const behaviors = JSON.parse(saved);
        this.userBehaviors = new Map(behaviors);
      }
    } catch (error) {
      console.error('Failed to load user behaviors:', error);
    }
  }

  private async persistUserBehaviors(): Promise<void> {
    try {
      const behaviors = Array.from(this.userBehaviors.entries());
      await AsyncStorage.setItem(this.BEHAVIOR_STORAGE_KEY, JSON.stringify(behaviors));
    } catch (error) {
      console.error('Failed to persist user behaviors:', error);
    }
  }

  async generateFraudReport(days: number = 30): Promise<any> {
    try {
      return await fetch(
        `https://api.dalasmart.app/fraud/report?days=${days}`
      ).then(r => r.json());
    } catch (error) {
      console.error('Failed to generate fraud report:', error);
      return null;
    }
  }
}

export const FraudDetectionService = new FraudDetectionServiceClass();
