// Local type definitions (replaces ../../../../types/shared)

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  type: 'passenger' | 'driver' | 'operator' | 'admin';
  language?: string;
}

export interface TripPlan {
  id: string;
  origin: GeoPoint;
  destination: GeoPoint;
  options: TripOption[];
  createdAt: string;
}

export interface TripOption {
  id: string;
  mode: TransportMode;
  distance: number;
  duration: number;
  fare: number;
  route: GeoPoint[];
}

export type TransportMode = 'car' | 'bajaji' | 'boda-boda';

export interface VehiclePosition {
  driverId: string;
  location: GeoPoint;
  heading: number;
  speed: number;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  createdAt: string;
}

export type MobileMoneyProvider = 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa';

export interface SavedPlace {
  id: string;
  name: string;
  location: GeoPoint;
  address: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  color: string;
  type: TransportMode;
}

export interface IncidentReport {
  id: string;
  tripId: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface EmergencyEvent {
  id: string;
  tripId: string;
  location: GeoPoint;
  status: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}


