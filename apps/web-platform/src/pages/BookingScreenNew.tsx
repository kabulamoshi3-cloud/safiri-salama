/**
 * Screen 4: Choose Ride (Booking)
 * Small map with route + vehicle cards
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { ArrowLeft, Car, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { useTripStore } from '../store/tripStore';
import { getRoute, calculateFare } from '../services/mapService';
import { i18n } from '../i18n';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';

const BookingScreenNew: React.FC = () => {
  const navigate = useNavigate();
  const {
    pickupLocation,
    dropoffLocation,
    selectedVehicle,
    setSelectedVehicle,
    fareEstimate,
    setFareEstimate,
    routeGeometry,
    setRouteGeometry,
    setActiveTrip,
  } = useTripStore();

  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { return i18n.subscribe(() => forceUpdate()); }, []);

  useEffect(() => {
    if (!pickupLocation || !dropoffLocation) {
      navigate('/');
      return;
    }

    // Calculate route
    async function loadRoute() {
      const result = await getRoute(
        [pickupLocation.lat, pickupLocation.lng],
        [dropoffLocation.lat, dropoffLocation.lng]
      );
      if (result) {
        setRouteGeometry(result.geometry);
        setRouteInfo({ distance: result.distanceKm, duration: result.durationMin });
        const fares = calculateFare(result.distanceKm);
        setFareEstimate(fares);
      }
    }
    loadRoute();
  }, [pickupLocation, dropoffLocation, navigate, setRouteGeometry, setFareEstimate]);

  const vehicles = [
    {
      type: 'economy' as const,
      icon: Car,
      label: i18n.t('booking.economy'),
      desc: i18n.t('booking.economy_desc'),
      color: 'text-gray-700',
      badge: null,
    },
    {
      type: 'comfort' as const,
      icon: Sparkles,
      label: i18n.t('booking.comfort'),
      desc: i18n.t('booking.comfort_desc'),
      color: 'text-[#7C3AED]',
      badge: 'BEST VALUE',
    },
    {
      type: 'express' as const,
      icon: Zap,
      label: i18n.t('booking.express'),
      desc: i18n.t('booking.express_desc'),
      color: 'text-[#2563EB]',
      badge: null,
    },
  ];

  const handleRequestRide = async () => {
    if (!pickupLocation || !dropoffLocation || !fareEstimate) return;
    setLoading(true);
    try {
      const res = await api.post('/trips', {
        pickup_lat: pickupLocation.lat,
        pickup_lng: pickupLocation.lng,
        pickup_location: pickupLocation.address,
        dropoff_lat: dropoffLocation.lat,
        dropoff_lng: dropoffLocation.lng,
        dropoff_location: dropoffLocation.address,
        vehicle_type: selectedVehicle,
        fare: fareEstimate[selectedVehicle],
      });

      setActiveTrip({
        id: res.data.trip.id,
        status: 'searching',
        pickup: pickupLocation,
        dropoff: dropoffLocation,
        fare: fareEstimate[selectedVehicle],
        vehicleType: selectedVehicle,
        distanceKm: routeInfo?.distance,
        durationMin: routeInfo?.duration,
      });

      navigate('/searching');
    } catch (err) {
      alert('Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!pickupLocation || !dropoffLocation) return null;

  const routePath = routeGeometry
    ? routeGeometry.map(([lng, lat]) => [lat, lng] as [number, number])
    : [];

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-[#0F172A] font-black text-xl">Choose a ride</h1>
      </div>

      {/* Small Map */}
      <div className="h-64 relative">
        <MapContainer
          center={[pickupLocation.lat, pickupLocation.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} />
          <Marker position={[dropoffLocation.lat, dropoffLocation.lng]} />
          {routePath.length > 0 && <Polyline positions={routePath} color="#2563EB" weight={4} />}
        </MapContainer>
        {routeInfo && (
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 text-xs font-semibold text-gray-700">
            {routeInfo.duration} min · {routeInfo.distance} km
          </div>
        )}
      </div>

      {/* Vehicle Cards */}
      <div className="flex-1 overflow-auto px-6 py-6 space-y-3">
        {vehicles.map((v) => {
          const isSelected = selectedVehicle === v.type;
          const fare = fareEstimate?.[v.type] ?? 0;
          return (
            <button
              key={v.type}
              onClick={() => setSelectedVehicle(v.type)}
              className={`w-full bg-white border-2 rounded-2xl p-4 transition hover:shadow-lg ${
                isSelected ? 'border-[#2563EB] bg-blue-50/50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isSelected ? 'bg-[#2563EB]' : 'bg-gray-100'}`}>
                  <v.icon size={24} className={isSelected ? 'text-white' : v.color} strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[#0F172A] font-black text-base">{v.label}</p>
                    {v.badge && (
                      <span className="bg-[#7C3AED] text-white text-xs font-bold px-2 py-0.5 rounded">
                        {v.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{v.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#0F172A] font-black text-lg">TZS {fare.toLocaleString()}</p>
                  {routeInfo && (
                    <p className="text-gray-500 text-xs">{routeInfo.duration} min</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Payment Method */}
      <div className="px-6 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm font-semibold">Payment Method</span>
          <div className="flex items-center gap-2">
            <span className="text-[#0F172A] font-bold">💵 Cash</span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Request Ride Button */}
      <div className="px-6 py-4 bg-white border-t border-gray-100">
        <button
          onClick={handleRequestRide}
          disabled={loading || !fareEstimate}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-black py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>Request Ride</>
          )}
        </button>
      </div>
    </div>
  );
};

export default BookingScreenNew;
