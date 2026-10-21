import { APIClient } from './client';
import type { GeoPoint, Vehicle } from '../../types/shared';

export interface LocationUpdate {
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  accuracy: number;
}

export interface TripRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  pickup: GeoPoint;
  destination: GeoPoint;
  estimatedFare: number;
  estimatedDistance: number;
  estimatedDuration: number;
}

export interface ActiveTrip {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickup: GeoPoint;
  destination: GeoPoint;
  fare: number;
  status: 'accepted' | 'arrived' | 'in-progress' | 'completed';
  startTime?: Date;
  endTime?: Date;
}

export interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  cashCollected: number;
  digitalPayments: number;
  pendingPayment: number;
}

export class DriverAPI {
  static async updateStatus(status: string): Promise<void> {
    return APIClient.post<void>('/driver/status', { status });
  }

  static async updateLocation(location: LocationUpdate): Promise<void> {
    return APIClient.post<void>('/driver/location', location);
  }

  static async getVehicleInfo(): Promise<Vehicle> {
    return APIClient.get<Vehicle>('/driver/vehicle');
  }

  static async getTripRequests(): Promise<TripRequest[]> {
    return APIClient.get<TripRequest[]>('/driver/trip-requests');
  }

  static async acceptTrip(tripId: string): Promise<ActiveTrip> {
    return APIClient.post<ActiveTrip>(`/driver/trips/${tripId}/accept`, {});
  }

  static async declineTrip(tripId: string, reason?: string): Promise<void> {
    return APIClient.post<void>(`/driver/trips/${tripId}/decline`, { reason });
  }

  static async getActiveTrip(): Promise<ActiveTrip | null> {
    return APIClient.get<ActiveTrip | null>('/driver/trips/active');
  }

  static async arrivedAtPickup(tripId: string): Promise<void> {
    return APIClient.post<void>(`/driver/trips/${tripId}/arrived`, {});
  }

  static async startTrip(tripId: string): Promise<void> {
    return APIClient.post<void>(`/driver/trips/${tripId}/start`, {});
  }

  static async completeTrip(tripId: string, actualFare: number): Promise<void> {
    return APIClient.post<void>(`/driver/trips/${tripId}/complete`, { actualFare });
  }

  static async cancelTrip(tripId: string, reason: string): Promise<void> {
    return APIClient.post<void>(`/driver/trips/${tripId}/cancel`, { reason });
  }

  static async getTripHistory(limit: number = 20, offset: number = 0): Promise<ActiveTrip[]> {
    return APIClient.get<ActiveTrip[]>(`/driver/trips/history?limit=${limit}&offset=${offset}`);
  }

  static async getEarnings(): Promise<EarningsSummary> {
    return APIClient.get<EarningsSummary>('/earnings/summary');
  }

  static async getEarningsHistory(
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return APIClient.get<any[]>(
      `/driver/earnings/history?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
  }
}

