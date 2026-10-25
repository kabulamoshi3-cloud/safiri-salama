/**
 * Screen 6 & 7: Driver En Route + During Ride
 * Live tracking with Leaflet map
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { Phone, MessageCircle, Share2, X } from 'lucide-react';
import { useTripStore } from '../store/tripStore';
import { trackingSocket } from '../services/trackingSocket';
import 'leaflet/dist/leaflet.css';

const ActiveTripScreenNew: React.FC = () => {
  const navigate = useNavigate();
  const { activeTrip, driver, tripStatus, setTripStatus, updateDriverLocation, clearTrip } = useTripStore();
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!activeTrip) {
      navigate('/');
      return;
    }

    // Connect to Socket.IO for live updates
    trackingSocket.connect();
    trackingSocket.emit('join_trip', { trip_id: activeTrip.id });

    trackingSocket.on('driver_location_update', (data: { lat: number; lng: number }) => {
      updateDriverLocation(data.lat, data.lng);
    });

    trackingSocket.on('trip_started', () => {
      setTripStatus('in_progress');
    });

    trackingSocket.on('trip_completed', () => {
      setTripStatus('completed');
      navigate('/trip-complete');
    });

    return () => {
      trackingSocket.off('driver_location_update');
      trackingSocket.off('trip_started');
      trackingSocket.off('trip_completed');
      trackingSocket.disconnect();
    };
  }, [activeTrip, navigate, setTripStatus, updateDriverLocation]);

  const handleCancel = () => {
    // TODO: Call API to cancel trip
    clearTrip();
    navigate('/');
  };

  if (!activeTrip) return null;

  const isEnRoute = tripStatus === 'driver_en_route';
  const isInProgress = tripStatus === 'in_progress';

  const driverPosition: [number, number] = driver?.currentLat && driver?.currentLng
    ? [driver.currentLat, driver.currentLng]
    : [activeTrip.pickup.lat, activeTrip.pickup.lng];

  return (
    <div className="h-screen flex flex-col">
      {/* Map */}
      <div className={isInProgress ? 'h-full' : 'flex-1'}>
        <MapContainer
          center={driverPosition}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {driver && <Marker position={driverPosition} />}
          <Marker position={[activeTrip.pickup.lat, activeTrip.pickup.lng]} />
          <Marker position={[activeTrip.dropoff.lat, activeTrip.dropoff.lng]} />
        </MapContainer>
      </div>

      {/* Driver En Route UI */}
      {isEnRoute && driver && (
        <div className="absolute top-0 left-0 right-0 bg-white rounded-b-3xl shadow-2xl p-6 z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {driver.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-[#0F172A] font-black text-lg">{driver.name}</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-yellow-500">★</span>
                <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                <span>·</span>
                <span>{driver.totalTrips} trips</span>
              </div>
              <p className="text-gray-700 text-sm mt-1">{driver.vehicle} · TZS {activeTrip.fare.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-3 bg-[#128901] hover:bg-[#0f7001] rounded-full transition">
                <Phone size={18} className="text-white" />
              </button>
              <button className="p-3 bg-[#2563EB] hover:bg-[#1d4ed8] rounded-full transition">
                <MessageCircle size={18} className="text-white" />
              </button>
            </div>
          </div>
          <div className="bg-[#F3F5F9] rounded-xl p-3 flex items-center justify-between">
            <span className="text-[#0F172A] font-bold">Arriving in 2 min</span>
            <button className="text-[#2563EB] font-semibold text-sm flex items-center gap-1">
              <Share2 size={14} /> Share location
            </button>
          </div>
        </div>
      )}

      {/* In Progress UI */}
      {isInProgress && (
        <>
          <div className="absolute top-0 left-0 right-0 bg-[#0F172A] text-white p-4 z-10">
            <p className="text-sm opacity-80">Ride in progress</p>
            <p className="font-bold">{driver?.vehicle || 'Vehicle'} · TZS {activeTrip.fare.toLocaleString()}</p>
          </div>

          <div className="absolute bottom-20 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-10">
            <h3 className="text-[#0F172A] font-black text-lg mb-4">Trip Details</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#128901] rounded-full flex-shrink-0 mt-1.5" />
                <div className="flex-1">
                  <p className="text-gray-500 text-xs">From</p>
                  <p className="text-[#0F172A] font-semibold text-sm">{activeTrip.pickup.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />
                <div className="flex-1">
                  <p className="text-gray-500 text-xs">To</p>
                  <p className="text-[#0F172A] font-semibold text-sm">{activeTrip.dropoff.address}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 bg-[#128901] rounded-full" />
              <div className="flex-1 h-1 bg-[#2563EB]" />
              <div className="w-3 h-3 bg-[#2563EB] rounded-full" />
              <div className="flex-1 h-1 bg-gray-200" />
              <div className="w-3 h-3 bg-gray-300 rounded-full" />
            </div>

            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full border-2 border-red-500 text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 transition"
            >
              Cancel Ride
            </button>
          </div>
        </>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-[#0F172A] font-black text-xl mb-2">Cancel Trip?</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this trip?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
              >
                No
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveTripScreenNew;
