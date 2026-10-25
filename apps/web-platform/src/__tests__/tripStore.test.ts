/**
 * Unit tests for tripStore
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTripStore } from '../store/tripStore';

const pickup = { lat: -6.81, lng: 37.66, address: 'Morogoro Station' };
const dropoff = { lat: -6.82, lng: 37.67, address: '10th Street' };
const driver = {
  id: 'd1',
  name: 'David M.',
  phone: '+255700000001',
  rating: 4.8,
  totalTrips: 124,
  vehicle: 'Toyota Corolla',
  plateNumber: 'T123ABC',
};

describe('tripStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useTripStore.getState().clearTrip();
  });

  it('starts with idle status', () => {
    expect(useTripStore.getState().tripStatus).toBe('idle');
  });

  it('sets pickup location', () => {
    useTripStore.getState().setPickup(pickup);
    expect(useTripStore.getState().pickupLocation).toEqual(pickup);
  });

  it('sets dropoff location', () => {
    useTripStore.getState().setDropoff(dropoff);
    expect(useTripStore.getState().dropoffLocation).toEqual(dropoff);
  });

  it('sets fare estimate', () => {
    useTripStore.getState().setFareEstimate({ economy: 5500, comfort: 8000, express: 10000 });
    expect(useTripStore.getState().fareEstimate?.economy).toBe(5500);
  });

  it('sets selected vehicle', () => {
    useTripStore.getState().setSelectedVehicle('comfort');
    expect(useTripStore.getState().selectedVehicle).toBe('comfort');
  });

  it('persists active trip to localStorage', () => {
    useTripStore.getState().setActiveTrip({
      id: 'trip1',
      status: 'searching',
      pickup,
      dropoff,
      fare: 6000,
      vehicleType: 'economy',
    });
    const stored = localStorage.getItem('safiri_active_trip');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.id).toBe('trip1');
    expect(parsed.status).toBe('searching');
  });

  it('sets driver and updates active trip', () => {
    useTripStore.getState().setActiveTrip({
      id: 'trip1', status: 'driver_assigned',
      pickup, dropoff, fare: 6000, vehicleType: 'economy',
    });
    useTripStore.getState().setDriver(driver);
    expect(useTripStore.getState().driver?.name).toBe('David M.');
  });

  it('updates trip status', () => {
    useTripStore.getState().setActiveTrip({
      id: 'trip1', status: 'searching',
      pickup, dropoff, fare: 6000, vehicleType: 'economy',
    });
    useTripStore.getState().setTripStatus('in_progress');
    expect(useTripStore.getState().tripStatus).toBe('in_progress');
  });

  it('updates driver location', () => {
    useTripStore.getState().setDriver(driver);
    useTripStore.getState().updateDriverLocation(-6.815, 37.665);
    expect(useTripStore.getState().driver?.currentLat).toBe(-6.815);
    expect(useTripStore.getState().driver?.currentLng).toBe(37.665);
  });

  it('clears trip and removes from localStorage', () => {
    useTripStore.getState().setActiveTrip({
      id: 'trip1', status: 'searching',
      pickup, dropoff, fare: 6000, vehicleType: 'economy',
    });
    useTripStore.getState().clearTrip();
    expect(useTripStore.getState().activeTrip).toBeNull();
    expect(useTripStore.getState().tripStatus).toBe('idle');
    expect(localStorage.getItem('safiri_active_trip')).toBeNull();
  });

  it('restores active trip from localStorage', () => {
    const trip = {
      id: 'trip1', status: 'in_progress',
      pickup, dropoff, fare: 6000, vehicleType: 'economy',
    };
    localStorage.setItem('safiri_active_trip', JSON.stringify(trip));
    useTripStore.getState().restoreFromStorage();
    expect(useTripStore.getState().activeTrip?.id).toBe('trip1');
    expect(useTripStore.getState().tripStatus).toBe('in_progress');
  });

  it('does not restore completed trips from localStorage', () => {
    const trip = {
      id: 'trip1', status: 'completed',
      pickup, dropoff, fare: 6000, vehicleType: 'economy',
    };
    localStorage.setItem('safiri_active_trip', JSON.stringify(trip));
    useTripStore.getState().restoreFromStorage();
    expect(useTripStore.getState().activeTrip).toBeNull();
  });
});
