/**
 * Trip Store — Zustand
 * Manages active trip state, pickup/dropoff, driver info
 * Persists active trip to localStorage
 */
import { create } from 'zustand';

export type TripStatus =
  | 'idle'
  | 'searching'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type VehicleType = 'economy' | 'comfort' | 'express';

export interface TripLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  vehicle: string;
  plateNumber: string;
  photoUrl?: string;
  currentLat?: number;
  currentLng?: number;
}

export interface ActiveTrip {
  id: string;
  status: TripStatus;
  pickup: TripLocation;
  dropoff: TripLocation;
  driver?: Driver;
  fare: number;
  vehicleType: VehicleType;
  distanceKm?: number;
  durationMin?: number;
  startedAt?: string;
}

interface TripState {
  activeTrip: ActiveTrip | null;
  tripStatus: TripStatus;
  driver: Driver | null;
  pickupLocation: TripLocation | null;
  dropoffLocation: TripLocation | null;
  fareEstimate: { economy: number; comfort: number; express: number } | null;
  selectedVehicle: VehicleType;
  routeGeometry: [number, number][] | null; // [lng, lat] pairs

  // Actions
  setPickup: (loc: TripLocation) => void;
  setDropoff: (loc: TripLocation) => void;
  setFareEstimate: (fare: { economy: number; comfort: number; express: number }) => void;
  setSelectedVehicle: (v: VehicleType) => void;
  setRouteGeometry: (geom: [number, number][]) => void;
  setActiveTrip: (trip: ActiveTrip) => void;
  setDriver: (driver: Driver) => void;
  setTripStatus: (status: TripStatus) => void;
  updateDriverLocation: (lat: number, lng: number) => void;
  clearTrip: () => void;
  restoreFromStorage: () => void;
}

const STORAGE_KEY = 'safiri_active_trip';

export const useTripStore = create<TripState>((set, get) => ({
  activeTrip: null,
  tripStatus: 'idle',
  driver: null,
  pickupLocation: null,
  dropoffLocation: null,
  fareEstimate: null,
  selectedVehicle: 'economy',
  routeGeometry: null,

  setPickup: (loc) => set({ pickupLocation: loc }),

  setDropoff: (loc) => set({ dropoffLocation: loc }),

  setFareEstimate: (fare) => set({ fareEstimate: fare }),

  setSelectedVehicle: (v) => set({ selectedVehicle: v }),

  setRouteGeometry: (geom) => set({ routeGeometry: geom }),

  setActiveTrip: (trip) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    set({ activeTrip: trip, tripStatus: trip.status });
  },

  setDriver: (driver) => {
    set({ driver });
    const active = get().activeTrip;
    if (active) {
      const updated = { ...active, driver };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ activeTrip: updated });
    }
  },

  setTripStatus: (status) => {
    set({ tripStatus: status });
    const active = get().activeTrip;
    if (active) {
      const updated = { ...active, status };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      set({ activeTrip: updated });
    }
  },

  updateDriverLocation: (lat, lng) => {
    const driver = get().driver;
    if (driver) {
      set({ driver: { ...driver, currentLat: lat, currentLng: lng } });
    }
  },

  clearTrip: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      activeTrip: null,
      tripStatus: 'idle',
      driver: null,
      pickupLocation: null,
      dropoffLocation: null,
      fareEstimate: null,
      routeGeometry: null,
    });
  },

  restoreFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const trip: ActiveTrip = JSON.parse(stored);
        if (['searching', 'driver_assigned', 'driver_en_route', 'in_progress'].includes(trip.status)) {
          set({
            activeTrip: trip,
            tripStatus: trip.status,
            driver: trip.driver ?? null,
            pickupLocation: trip.pickup,
            dropoffLocation: trip.dropoff,
          });
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
}));
