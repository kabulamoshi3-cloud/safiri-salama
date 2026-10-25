/**
 * Unit tests for mapService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateFare, MOROGORO_CENTER } from '../services/mapService';

describe('mapService', () => {
  describe('MOROGORO_CENTER', () => {
    it('is set to correct Morogoro coordinates', () => {
      expect(MOROGORO_CENTER[0]).toBeCloseTo(-6.816, 2);
      expect(MOROGORO_CENTER[1]).toBeCloseTo(37.667, 2);
    });
  });

  describe('calculateFare', () => {
    it('calculates economy fare correctly', () => {
      const fare = calculateFare(5); // 5km
      expect(fare.economy).toBe(1500 + 5 * 800); // 5500
    });

    it('calculates comfort fare higher than economy', () => {
      const fare = calculateFare(5);
      expect(fare.comfort).toBeGreaterThan(fare.economy);
    });

    it('calculates express fare highest', () => {
      const fare = calculateFare(5);
      expect(fare.express).toBeGreaterThan(fare.comfort);
    });

    it('returns 0 distance base fares correctly', () => {
      const fare = calculateFare(0);
      expect(fare.economy).toBe(1500);
      expect(fare.comfort).toBe(2000);
      expect(fare.express).toBe(2500);
    });

    it('rounds fares to integers', () => {
      const fare = calculateFare(1.5);
      expect(fare.economy).toBe(Math.round(1500 + 1.5 * 800));
      expect(Number.isInteger(fare.economy)).toBe(true);
      expect(Number.isInteger(fare.comfort)).toBe(true);
      expect(Number.isInteger(fare.express)).toBe(true);
    });

    it('scales fare with distance', () => {
      const short = calculateFare(2);
      const long = calculateFare(10);
      expect(long.economy).toBeGreaterThan(short.economy);
    });
  });

  describe('geocode (mocked)', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve([
          {
            lat: '-6.8160',
            lon: '37.6677',
            display_name: 'Morogoro, Tanzania',
          },
        ]),
      }) as any;
    });

    it('calls Nominatim with query + Morogoro Tanzania', async () => {
      const { geocode } = await import('../services/mapService');
      const results = await geocode('Market');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('Morogoro'),
        expect.any(Object)
      );
      expect(results).toHaveLength(1);
      expect(results[0].lat).toBeCloseTo(-6.816, 2);
    });
  });

  describe('getRoute (mocked)', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          code: 'Ok',
          routes: [{
            distance: 3600,
            duration: 480,
            geometry: { coordinates: [[37.66, -6.81], [37.67, -6.82]] },
          }],
        }),
      }) as any;
    });

    it('returns distance and duration from OSRM', async () => {
      const { getRoute } = await import('../services/mapService');
      const result = await getRoute([-6.81, 37.66], [-6.82, 37.67]);
      expect(result).not.toBeNull();
      expect(result!.distanceKm).toBe(3.6);
      expect(result!.durationMin).toBe(8);
    });

    it('returns null when OSRM returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ code: 'Error' }),
      }) as any;
      const { getRoute } = await import('../services/mapService');
      const result = await getRoute([-6.81, 37.66], [-6.82, 37.67]);
      expect(result).toBeNull();
    });
  });
});
