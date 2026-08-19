/**
 * Active Trip Page with Live Tracking
 * Shows real-time driver location, ETA, and safety features
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import LiveTracking from '../components/LiveTracking';
import SOSButton from '../components/SOSButton';
import TripSharing from '../components/TripSharing';

interface TripDetails {
  id: number;
  status: 'pending' | 'driver_assigned' | 'driver_arriving' | 'in_progress' | 'completed' | 'cancelled';
  driver: {
    id: number;
    name: string;
    phone: string;
    rating: number;
    vehicle: {
      make: string;
      model: string;
      color: string;
      plate: string;
      type: 'car' | 'bajaji' | 'boda-boda';
    };
  };
  pickup_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff_location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  estimated_fare: number;
  estimated_duration: number;
}

const ActiveTripPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    fetchTripDetails();
    // Get auth token from localStorage
    const authToken = localStorage.getItem('token') || '';
    setToken(authToken);
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const response = await api.get(`/trips/${tripId}`);
      setTrip(response.data);
    } catch (error) {
      console.error('Failed to fetch trip details:', error);
      alert('Failed to load trip details');
      navigate('/trip-history');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => reject(error)
      );
    });
  };

  const handleCancelTrip = async () => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;

    try {
      await api.patch(`/trips/${tripId}/cancel`);
      alert('Trip cancelled');
      navigate('/trip-history');
    } catch (error) {
      alert('Failed to cancel trip');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Trip not found</p>
      </div>
    );
  }

  const getStatusText = (status: string): { text: string; color: string } => {
    switch (status) {
      case 'pending':
        return { text: 'Finding driver...', color: 'text-yellow-600' };
      case 'driver_assigned':
        return { text: 'Driver assigned', color: 'text-blue-600' };
      case 'driver_arriving':
        return { text: 'Driver on the way', color: 'text-blue-600' };
      case 'in_progress':
        return { text: 'Trip in progress', color: 'text-green-600' };
      case 'completed':
        return { text: 'Trip completed', color: 'text-gray-600' };
      case 'cancelled':
        return { text: 'Trip cancelled', color: 'text-red-600' };
      default:
        return { text: status, color: 'text-gray-600' };
    }
  };

  const statusInfo = getStatusText(trip.status);
  const showTracking = trip.status !== 'pending' && trip.status !== 'cancelled' && trip.status !== 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/trip-history')}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Back
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Trip #{trip.id}</h1>
              <p className={`text-sm font-medium ${statusInfo.color}`}>{statusInfo.text}</p>
            </div>
            <div className="w-16" /> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Map & Tracking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Tracking Map */}
            {showTracking && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '500px' }}>
                <LiveTracking
                  tripId={trip.id.toString()}
                  driverId={trip.driver.id.toString()}
                  pickupLocation={trip.pickup_location}
                  destinationLocation={trip.dropoff_location}
                  token={token}
                  onArrival={() => {
                    fetchTripDetails();
                  }}
                />
              </div>
            )}

            {/* Driver Info Card */}
            {trip.driver && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Details</h3>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{trip.driver.name}</h4>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-yellow-500 mr-1">⭐</span>
                      {trip.driver.rating.toFixed(1)} rating
                    </div>
                  </div>
                  <a
                    href={`tel:${trip.driver.phone}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    📞 Call
                  </a>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium text-gray-900">
                      {trip.driver.vehicle.make} {trip.driver.vehicle.model}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium text-gray-900">{trip.driver.vehicle.color}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Plate:</span>
                    <span className="font-medium text-gray-900">{trip.driver.vehicle.plate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium text-gray-900 capitalize">{trip.driver.vehicle.type}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Trip Details & Safety */}
          <div className="space-y-6">
            {/* Trip Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">From</p>
                  <p className="text-sm font-medium text-gray-900">{trip.pickup_location.address}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">To</p>
                  <p className="text-sm font-medium text-gray-900">{trip.dropoff_location.address}</p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Estimated Fare</span>
                    <span className="text-lg font-bold text-gray-900">
                      TZS {trip.estimated_fare.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Sharing */}
            {showTracking && (
              <TripSharing
                tripId={trip.id.toString()}
                passengerId={localStorage.getItem('userId') || ''}
                driverId={trip.driver.id.toString()}
                driverName={trip.driver.name}
                vehicleInfo={`${trip.driver.vehicle.color} ${trip.driver.vehicle.make} ${trip.driver.vehicle.plate}`}
                pickupLocation={trip.pickup_location}
                dropoffLocation={trip.dropoff_location}
              />
            )}

            {/* SOS Emergency Button */}
            {showTracking && (
              <SOSButton
                tripId={trip.id.toString()}
                userId={localStorage.getItem('userId') || ''}
                userType="passenger"
                getCurrentLocation={getCurrentLocation}
                className="w-full"
              />
            )}

            {/* Cancel Trip */}
            {(trip.status === 'pending' || trip.status === 'driver_assigned') && (
              <button
                onClick={handleCancelTrip}
                className="w-full bg-red-100 text-red-600 py-3 px-4 rounded-lg hover:bg-red-200 font-medium"
              >
                Cancel Trip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveTripPage;
