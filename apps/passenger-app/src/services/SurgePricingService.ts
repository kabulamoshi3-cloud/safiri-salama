import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SurgePricingFactor {
  name: string;
  value: number; // multiplier 0.5-3.0
  weight: number; // 0-1
  reason: string;
}

export interface SurgeData {
  factors: SurgePricingFactor[];
  multiplier: number; // 0.5-3.0
  baseFare: number;
  estimatedFare: number;
  surgePercentage: number; // -50 to +200
  timestamp: Date;
  expiresAt: Date;
}

export interface PeakHour {
  day: string; // monday, tuesday, etc
  startHour: number;
  endHour: number;
  surgeMultiplier: number;
}

class SurgePricingServiceClass {
  private peakHours: PeakHour[] = [
    { day: 'monday', startHour: 7, endHour: 9, surgeMultiplier: 1.5 },
    { day: 'monday', startHour: 17, endHour: 19, surgeMultiplier: 1.8 },
    { day: 'tuesday', startHour: 7, endHour: 9, surgeMultiplier: 1.5 },
    { day: 'tuesday', startHour: 17, endHour: 19, surgeMultiplier: 1.8 },
    { day: 'wednesday', startHour: 7, endHour: 9, surgeMultiplier: 1.5 },
    { day: 'wednesday', startHour: 17, endHour: 19, surgeMultiplier: 1.8 },
    { day: 'thursday', startHour: 7, endHour: 9, surgeMultiplier: 1.5 },
    { day: 'thursday', startHour: 17, endHour: 19, surgeMultiplier: 1.8 },
    { day: 'friday', startHour: 7, endHour: 9, surgeMultiplier: 1.5 },
    { day: 'friday', startHour: 17, endHour: 22, surgeMultiplier: 2.0 },
    { day: 'saturday', startHour: 22, endHour: 23, surgeMultiplier: 2.2 },
    { day: 'sunday', startHour: 22, endHour: 23, surgeMultiplier: 1.8 },
  ];

  private readonly SURGE_CACHE_KEY = '@dalasmart:surge_data';

  calculateSurgeMultiplier(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    distance: number,
    time: Date
  ): SurgeData {
    const factors: SurgePricingFactor[] = [];

    // Factor 1: Time-based surge (peak hours)
    const timeMultiplier = this.calculateTimeMultiplier(time);
    if (timeMultiplier > 1) {
      factors.push({
        name: 'time_based',
        value: timeMultiplier,
        weight: 0.3,
        reason: `${((timeMultiplier - 1) * 100).toFixed(0)}% peak hour surge`,
      });
    }

    // Factor 2: Demand-supply ratio
    const demandMultiplier = this.calculateDemandMultiplier(origin);
    if (demandMultiplier > 1) {
      factors.push({
        name: 'demand_supply',
        value: demandMultiplier,
        weight: 0.4,
        reason: `High demand in this area (${(demandMultiplier * 100).toFixed(0)}%)`,
      });
    }

    // Factor 3: Weather impact
    const weatherMultiplier = this.calculateWeatherMultiplier(origin);
    if (weatherMultiplier > 1) {
      factors.push({
        name: 'weather',
        value: weatherMultiplier,
        weight: 0.15,
        reason: 'Bad weather conditions',
      });
    }

    // Factor 4: Event impact
    const eventMultiplier = this.calculateEventMultiplier(origin);
    if (eventMultiplier > 1) {
      factors.push({
        name: 'event',
        value: eventMultiplier,
        weight: 0.15,
        reason: 'Major event in area',
      });
    }

    // Calculate weighted average multiplier
    let multiplier = 1.0;
    let totalWeight = 0;

    factors.forEach(factor => {
      multiplier += (factor.value - 1) * factor.weight;
      totalWeight += factor.weight;
    });

    // Normalize to account for weights that don't sum to 1
    if (totalWeight > 0) {
      multiplier = 1 + (multiplier - 1) * (1 / Math.min(totalWeight, 1));
    }

    // Cap multiplier between 0.5 and 3.0
    multiplier = Math.max(0.5, Math.min(3.0, multiplier));

    // Calculate fares
    const baseFare = this.calculateBaseFare(distance);
    const estimatedFare = Math.round(baseFare * multiplier);
    const surgePercentage = ((multiplier - 1) * 100);

    return {
      factors,
      multiplier,
      baseFare,
      estimatedFare,
      surgePercentage,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 60000), // 1 minute expiration
    };
  }

  private calculateTimeMultiplier(time: Date): number {
    const day = time.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const hour = time.getHours();

    const applicablePeakHours = this.peakHours.filter(
      ph => ph.day === day && hour >= ph.startHour && hour < ph.endHour
    );

    if (applicablePeakHours.length > 0) {
      return applicablePeakHours[0].surgeMultiplier;
    }

    return 1.0;
  }

  private calculateDemandMultiplier(location: { lat: number; lon: number }): number {
    // This would normally query backend for real-time demand data
    // Placeholder: return random multiplier between 1.0 and 1.5
    const random = Math.random();
    
    if (random > 0.8) {
      return 1.5; // High demand
    } else if (random > 0.6) {
      return 1.2; // Medium demand
    }
    
    return 1.0; // Normal demand
  }

  private calculateWeatherMultiplier(location: { lat: number; lon: number }): number {
    // Would query weather API for location
    // Placeholder: no weather surge for now
    return 1.0;
  }

  private calculateEventMultiplier(location: { lat: number; lon: number }): number {
    // Would check if major events (concerts, sports, etc.) are near location
    // Placeholder: no event surge for now
    return 1.0;
  }

  private calculateBaseFare(distanceKm: number): number {
    // Base fare structure
    const minimumFare = 2500; // TSh
    const baseRatePerKm = 1500; // TSh/km
    const fare = Math.max(minimumFare, distanceKm * baseRatePerKm);
    
    return Math.round(fare);
  }

  async getSurgeData(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number },
    distance: number
  ): Promise<SurgeData> {
    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(this.SURGE_CACHE_KEY);
      if (cached) {
        const data: SurgeData = JSON.parse(cached);
        if (new Date(data.expiresAt) > new Date()) {
          return data;
        }
      }

      // Calculate new surge data
      const surgeData = this.calculateSurgeMultiplier(
        origin,
        destination,
        distance,
        new Date()
      );

      // Cache for 1 minute
      await AsyncStorage.setItem(this.SURGE_CACHE_KEY, JSON.stringify(surgeData));

      return surgeData;
    } catch (error) {
      console.error('Failed to get surge data:', error);
      // Return no surge as fallback
      return {
        factors: [],
        multiplier: 1.0,
        baseFare: this.calculateBaseFare(distance),
        estimatedFare: this.calculateBaseFare(distance),
        surgePercentage: 0,
        timestamp: new Date(),
        expiresAt: new Date(),
      };
    }
  }

  async setPeakHours(peakHours: PeakHour[]): Promise<void> {
    this.peakHours = peakHours;
    console.log('Peak hours updated');
  }

  getPeakHours(): PeakHour[] {
    return [...this.peakHours];
  }

  isCurrentlyInPeakHour(): boolean {
    return this.calculateTimeMultiplier(new Date()) > 1.0;
  }

  getNextPeakHour(): { startHour: number; endHour: number } | null {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentHour = now.getHours();

    // Find next peak hour
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const day = checkDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      const peakHour = this.peakHours.find(
        ph => ph.day === day && (i > 0 || ph.startHour > currentHour)
      );

      if (peakHour) {
        return { startHour: peakHour.startHour, endHour: peakHour.endHour };
      }
    }

    return null;
  }
}

export const SurgePricingService = new SurgePricingServiceClass();
