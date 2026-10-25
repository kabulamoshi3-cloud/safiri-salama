/**
 * App Init Hook
 * Implements startup flow:
 * Open → check token → load profile → check active trip → route
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useTripStore } from '../store/tripStore';
import api from '../services/api';

export function useAppInit() {
  const navigate = useNavigate();
  const { fetchProfile } = useAuthStore();
  const { restoreFromStorage, activeTrip } = useTripStore();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const token = localStorage.getItem('safiri_token');

        if (!token) {
          // No session → show splash
          navigate('/splash');
          return;
        }

        // Load user profile
        await fetchProfile();

        // Restore any saved active trip from localStorage
        restoreFromStorage();

        // Check backend for active trip
        try {
          const res = await api.get('/trips/active');
          if (res.data?.trip) {
            const trip = res.data.trip;
            const { setActiveTrip } = useTripStore.getState();
            setActiveTrip({
              id: trip.id,
              status: trip.status,
              pickup: {
                lat: trip.pickup_lat,
                lng: trip.pickup_lng,
                address: trip.pickup_location,
              },
              dropoff: {
                lat: trip.dropoff_lat,
                lng: trip.dropoff_lng,
                address: trip.dropoff_location,
              },
              driver: trip.driver,
              fare: trip.fare || 0,
              vehicleType: trip.vehicle_type || 'economy',
            });
            navigate('/active-trip');
            return;
          }
        } catch {
          // No active trip endpoint or no trip — continue to home
        }

        // Check locally stored active trip
        const localTrip = useTripStore.getState().activeTrip;
        if (localTrip && ['searching', 'driver_assigned', 'driver_en_route', 'in_progress'].includes(localTrip.status)) {
          navigate('/active-trip');
          return;
        }

        // All good — go to home
        navigate('/');
      } catch {
        // Auth failed
        localStorage.removeItem('safiri_token');
        navigate('/splash');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }

    init();
  }, []);

  return { initialized, loading };
}
