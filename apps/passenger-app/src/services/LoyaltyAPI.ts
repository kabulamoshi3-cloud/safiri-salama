import { APIClient } from './api/client';

export interface LoyaltyProgram {
  id: string;
  userId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  totalPoints: number; // Lifetime
  level: number;
  nextLevelPoints: number;
  status: 'active' | 'inactive';
  joinedAt: Date;
  lastActivityAt: Date;
}

export interface LoyaltyReward {
  id: string;
  userId: string;
  title: string;
  description: string;
  points: number;
  pointsRequired: number;
  redeemDate?: Date;
  status: 'available' | 'redeemed' | 'expired';
  expiryDate: Date;
}

export interface LoyaltyTier {
  name: 'bronze' | 'silver' | 'gold' | 'platinum';
  minPoints: number;
  benefits: LoyaltyBenefit[];
  unlockDate?: Date;
}

export interface LoyaltyBenefit {
  id: string;
  name: string;
  description: string;
  value: number;
  type: 'discount' | 'cashback' | 'priority' | 'feature';
  icon: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'redeem' | 'expire' | 'bonus';
  points: number;
  reason: string;
  timestamp: Date;
  tripId?: string;
}

export class LoyaltyAPI {
  static async getProgram(): Promise<LoyaltyProgram> {
    return APIClient.get<LoyaltyProgram>('/loyalty/program');
  }

  static async getBalance(): Promise<{ points: number; tier: string }> {
    return APIClient.get<{ points: number; tier: string }>('/loyalty/balance');
  }

  static async getRewards(): Promise<LoyaltyReward[]> {
    return APIClient.get<LoyaltyReward[]>('/loyalty/rewards');
  }

  static async redeemReward(rewardId: string): Promise<LoyaltyReward> {
    return APIClient.post<LoyaltyReward>(`/loyalty/rewards/${rewardId}/redeem`, {});
  }

  static async getAvailableRewards(): Promise<LoyaltyReward[]> {
    return APIClient.get<LoyaltyReward[]>('/loyalty/rewards/available');
  }

  static async getTiers(): Promise<LoyaltyTier[]> {
    return APIClient.get<LoyaltyTier[]>('/loyalty/tiers');
  }

  static async getCurrentTier(): Promise<LoyaltyTier> {
    return APIClient.get<LoyaltyTier>('/loyalty/tier/current');
  }

  static async getTransactionHistory(limit: number = 50): Promise<LoyaltyTransaction[]> {
    return APIClient.get<LoyaltyTransaction[]>(
      `/loyalty/transactions?limit=${limit}`
    );
  }

  static async estimatePoints(tripFare: number): Promise<number> {
    // 1 point per 100 currency units (base)
    const basePoints = Math.floor(tripFare / 100);

    // Bonus for loyalty tiers would be applied server-side
    return basePoints;
  }

  static async getUpcomingBenefits(): Promise<LoyaltyBenefit[]> {
    return APIClient.get<LoyaltyBenefit[]>('/loyalty/benefits/upcoming');
  }

  static async referFriend(friendPhoneNumber: string): Promise<{
    referralCode: string;
    bonusPoints: number;
  }> {
    return APIClient.post<{
      referralCode: string;
      bonusPoints: number;
    }>('/loyalty/referral', { friendPhoneNumber });
  }

  static async getReferralStats(): Promise<{
    totalReferred: number;
    referralBonus: number;
    pendingBonuses: number;
  }> {
    return APIClient.get<{
      totalReferred: number;
      referralBonus: number;
      pendingBonuses: number;
    }>('/loyalty/referral/stats');
  }

  static async claimBonus(bonusType: string): Promise<{ pointsAdded: number }> {
    return APIClient.post<{ pointsAdded: number }>(
      `/loyalty/bonus/${bonusType}/claim`,
      {}
    );
  }

  static async getProgressToNextTier(): Promise<{
    currentTier: string;
    nextTier: string;
    currentPoints: number;
    pointsNeeded: number;
    percentageToNext: number;
  }> {
    return APIClient.get<{
      currentTier: string;
      nextTier: string;
      currentPoints: number;
      pointsNeeded: number;
      percentageToNext: number;
    }>('/loyalty/progress/next-tier');
  }

  static async getMilestones(): Promise<{
    id: string;
    name: string;
    description: string;
    currentProgress: number;
    targetProgress: number;
    reward: string;
    completed: boolean;
  }[]> {
    return APIClient.get<{
      id: string;
      name: string;
      description: string;
      currentProgress: number;
      targetProgress: number;
      reward: string;
      completed: boolean;
    }[]>('/loyalty/milestones');
  }
}
