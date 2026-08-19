import { APIClient } from './api/client';

export interface Rating {
  id: string;
  tripId: string;
  ratedBy: 'passenger' | 'driver';
  ratedTo: string;
  score: number; // 1-5
  category: 'cleanliness' | 'driving' | 'communication' | 'safety' | 'overall';
  comment?: string;
  timestamp: Date;
  anonymous: boolean;
}

export interface Review {
  id: string;
  userId: string;
  tripId: string;
  rating: number;
  comment: string;
  timestamp: Date;
  helpful: number;
  verified: boolean; // Verified trip
}

export interface UserRating {
  userId: string;
  averageRating: number;
  totalRatings: number;
  ratingsByCategory: Record<string, number>;
  recentRatings: Rating[];
  badges: UserBadge[];
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

export class RatingAPI {
  static async submitRating(rating: Omit<Rating, 'id' | 'timestamp'>): Promise<Rating> {
    return APIClient.post<Rating>('/ratings', rating);
  }

  static async updateRating(ratingId: string, updates: Partial<Rating>): Promise<Rating> {
    return APIClient.put<Rating>(`/ratings/${ratingId}`, updates);
  }

  static async getUserRating(userId: string): Promise<UserRating> {
    return APIClient.get<UserRating>(`/ratings/user/${userId}`);
  }

  static async getTripRatings(tripId: string): Promise<Rating[]> {
    return APIClient.get<Rating[]>(`/ratings/trip/${tripId}`);
  }

  static async submitReview(review: Omit<Review, 'id' | 'timestamp'>): Promise<Review> {
    return APIClient.post<Review>('/reviews', review);
  }

  static async getReviews(userId: string, limit: number = 20): Promise<Review[]> {
    return APIClient.get<Review[]>(`/reviews/user/${userId}?limit=${limit}`);
  }

  static async markReviewHelpful(reviewId: string): Promise<void> {
    return APIClient.post<void>(`/reviews/${reviewId}/helpful`, {});
  }

  static async reportReview(reviewId: string, reason: string): Promise<void> {
    return APIClient.post<void>(`/reviews/${reviewId}/report`, { reason });
  }

  static async deleteReview(reviewId: string): Promise<void> {
    return APIClient.delete<void>(`/reviews/${reviewId}`);
  }

  static async getUserBadges(userId: string): Promise<UserBadge[]> {
    return APIClient.get<UserBadge[]>(`/users/${userId}/badges`);
  }

  static async getLeaderboard(
    category: 'rating' | 'trips' | 'earnings',
    limit: number = 20
  ): Promise<any[]> {
    return APIClient.get<any[]>(`/leaderboard/${category}?limit=${limit}`);
  }
}
