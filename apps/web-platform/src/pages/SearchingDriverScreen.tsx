/**
 * Screen 5: Searching for Driver — with live Morogoro map
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import { Car } from 'lucide-react';
import { useTripStore } from '../store/tripStore';
import { MOROGORO_CENTER } from '../services/mapService';
import { i18n } from '../i18n';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25,41], iconAnchor: [12,41] });

// Realistic Morogoro driver positions near key areas
const MOROGORO_DRIVERS: [number, number][] = [
  [-6.8200, 37.6600], // Clock Tower area
  [-6.8050, 37.6750], // Msamvu area
  [-6.8300, 37.6800], // Kihonda
  [-6.8100, 37.6550], // Boma area
  [-6.8250, 37.6700], // Market area
  [-6.7950, 37.6650], // University area (MUCE)
  [-6.8180, 37.6720], // Hospital area
  [-6.8080, 37.6630], // Bus stand area
];

const SearchingDriverScreen: React.FC = () => {
  const navigate = useNavigate();
  const { pickupLocation } = useTripStore();
  const [dots, setDots] = useState<[number, number][]>(MOROGORO_DRIVERS);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return i18n.subscribe(() => forceUpdate()); }, []);

  // Animate driver dots — simulate movement
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.map(([lat, lng]) => [
        lat + (Math.random() - 0.5) * 0.002,
        lng + (Math.random() - 0.5) * 0.002,
      ]));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = () => navigate('/');

  const mapCenter: [number, number] = pickupLocation
    ? [pickupLocation.lat, pickupLocation.lng]
    : MOROGORO_CENTER;

  return (
    <div className="h-screen flex flex-col">
      {/* Map — takes most of screen */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Pickup marker */}
          {pickupLocation && (
            <Marker position={[pickupLocation.lat, pickupLocation.lng]}>
              <Popup>Your pickup location</Popup>
            </Marker>
          )}

          {/* Animated driver dots */}
          {dots.map(([lat, lng], i) => (
            <Circle
              key={i}
              center={[lat, lng]}
              radius={60}
              pathOptions={{ color: '#128901', fillColor: '#128901', fillOpacity: 0.85, weight: 1 }}
            />
          ))}

          {/* Search radius pulse */}
          {pickupLocation && (
            <Circle
              center={[pickupLocation.lat, pickupLocation.lng]}
              radius={800}
              pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.05, weight: 1, dashArray: '5,8' }}
            />
          )}
        </MapContainer>

        {/* Overlay: top status bar */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-[#2563EB] rounded-full flex items-center justify-center">
                <Car size={24} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-[#0F172A] font-black text-base">{i18n.t('finding_driver')}</p>
              <p className="text-gray-500 text-sm">{i18n.t('finding_driver_sub')}</p>
            </div>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Driver count badge */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-[#0F172A]/80 backdrop-blur text-white px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {dots.length} drivers nearby in Morogoro
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bg-white px-6 py-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
          <p className="text-gray-700 text-sm font-medium truncate">
            {pickupLocation?.address || 'Your pickup location'}
          </p>
        </div>
        <div className="bg-[#F3F5F9] rounded-xl p-3 mb-4 text-center">
          <p className="text-[#2563EB] font-bold text-sm">{i18n.t('eta_minutes').replace('{n}', '2-5')}</p>
        </div>
        <button
          onClick={handleCancel}
          className="w-full border-2 border-red-400 text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 transition"
        >
          {i18n.t('cancel')}
        </button>
      </div>
    </div>
  );
};

export default SearchingDriverScreen;
