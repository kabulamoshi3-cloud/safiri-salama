/**
 * App Init Hook — SkyRex Web Platform
 * On startup: check token → load profile → check active trip → route
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useTripStore } from '../store/tripStore';
import api from '../services/api';

export function useAppInit() {
  const navigate = useNavigate();
  const { fetchProfile, isAuthenticated } = useAuthStore();
  const { restoreFromStorage } = useTripStore();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('safiri_token');

      if (!token) {
        // No session — show splash
        setLoading(false);
        setInitialized(true);
        navigate('/splash', { replace: true });
        return;
      }

      try {
        // Load user profile (also validates token)
        await fetchProfile();

        // Restore any saved trip from localStorage
        restoreFromStorage();

        // Check for an active trip on the server
        try {
          const res = await api.get('/trips?limit=1&status=IN_PROGRESS');
          const trips = res.data;
          const activeTrip = Array.isArray(trips) ? trips[0] : null;

          if (activeTrip && ['REQUESTED','ACCEPTED','DRIVER_ARRIVING','ARRIVED','IN_PROGRESS'].includes(activeTrip.status)) {
            const { setActiveTrip } = useTripStore.getState();
            setActiveTrip({
              id:          activeTrip.id,
              status:      activeTrip.status.toLowerCase(),
              pickup:  {
                lat:     activeTrip.pickup_lat,
                lng:     activeTrip.pickup_lng,
                address: activeTrip.pickup_location,
              },
              dropoff: {
                lat:     activeTrip.dropoff_lat,
                lng:     activeTrip.dropoff_lng,
                address: activeTrip.dropoff_location,
              },
              fare:        activeTrip.fare || 0,
              vehicleType: activeTrip.vehicle_type || 'economy',
            });
            setLoading(false);
            setInitialized(true);
            navigate('/active-trip', { replace: true });
            return;
          }
        } catch {
          // No active trip or endpoint error — continue to home
        }

        // Check locally stored active trip
        const localTrip = useTripStore.getState().activeTrip;
        if (localTrip && ['searching','driver_assigned','driver_en_route','in_progress'].includes(localTrip.status)) {
          setLoading(false);
          setInitialized(true);
          navigate('/active-trip', { replace: true });
          return;
        }

        // All good — go home
        setLoading(false);
        setInitialized(true);
        navigate('/', { replace: true });

      } catch {
        // Token invalid — clear and go to splash
        localStorage.removeItem('safiri_token');
        setLoading(false);
        setInitialized(true);
        navigate('/splash', { replace: true });
      }
    }

    init();
  }, []);

  return { initialized, loading };
}
