import { APIClient } from './client';
import type { GeoPoint, TripPlan, TripOption, TransportMode } from '@dalasmart/shared-types';

export interface TripRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  departureTime?: Date;
  transportMode?: TransportMode;
  preferences?: {
    fastest?: boolean;
    cheapest?: boolean;
    leastWalking?: boolean;
  };
}

export interface ActiveTrip {
  id: string;
  vehicleId: string;
  routeId: string;
  startTime: Date;
  estimatedArrival: Date;
  currentLocation?: GeoPoint;
  status: 'active' | 'completed' | 'cancelled';
}

export interface TripTracking {
  tripId: string;
  vehicleId: string;
  vehicleLocation: GeoPoint;
  passengerLocation: GeoPoint;
  destination: GeoPoint;
  vehicleSpeed: number;
  eta: number;
  status: string;
  driverName: string;
  driverRating: number;
  vehiclePlate: string;
  occupancy: number;
  crowdingLevel: string;
}

export class TripAPI {
  static async planTrip(request: TripRequest): Promise<TripOption[]> {
    return APIClient.post<TripOption[]>('/trips/plan', request);
  }

  static async startTrip(tripOptionId: string): Promise<ActiveTrip> {
    return APIClient.post<ActiveTrip>('/trips/start', { tripOptionId });
  }

  static async getActiveTrip(): Promise<ActiveTrip | null> {
    return APIClient.get<ActiveTrip | null>('/trips/active');
  }

  static async completeTrip(tripId: string): Promise<void> {
    return APIClient.post<void>(`/trips/${tripId}/complete`, {});
  }

  static async cancelTrip(tripId: string, reason?: string): Promise<void> {
    return APIClient.post<void>(`/trips/${tripId}/cancel`, { reason });
  }

  static async getTripHistory(limit: number = 20, offset: number = 0): Promise<TripPlan[]> {
    return APIClient.get<TripPlan[]>(`/trips/history?limit=${limit}&offset=${offset}`);
  }

  static async getTripDetails(tripId: string): Promise<TripPlan> {
    return APIClient.get<TripPlan>(`/trips/${tripId}`);
  }

  static async shareTrip(tripId: string, contactIds: string[]): Promise<void> {
    return APIClient.post<void>(`/trips/${tripId}/share`, { contactIds });
  }

  static async stopSharingTrip(tripId: string): Promise<void> {
    return APIClient.delete<void>(`/trips/${tripId}/share`);
  }

  // NEW: Live tracking endpoint
  static async getActiveTripTracking(tripId: string): Promise<TripTracking> {
    return APIClient.get<TripTracking>(`/trips/${tripId}/tracking`);
  }

  // NEW: Get SSE stream for live updates
  static async subscribeToTripTracking(tripId: string): Promise<EventSource> {
    const token = await this.getAuthToken();
    const eventSource = new EventSource(
      `${process.env.API_BASE_URL}/trips/${tripId}/tracking/live?token=${token}`
    );
    return eventSource;
  }

  // Helper to get auth token
  private static async getAuthToken(): Promise<string> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('@dalasmart:token') || '';
  }

  // NEW: Get vehicle position updates
  static async getVehiclePosition(vehicleId: string): Promise<GeoPoint> {
    return APIClient.get<GeoPoint>(`/vehicles/${vehicleId}/position`);
  }

  // NEW: Get route polyline
  static async getRoutePath(tripId: string): Promise<GeoPoint[]> {
    return APIClient.get<GeoPoint[]>(`/trips/${tripId}/route-path`);
  }
}
