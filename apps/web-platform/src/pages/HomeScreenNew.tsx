/**
 * Screen 3: Home Screen
 * Live Leaflet map centered on Morogoro + booking bar
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Navigation, Home as HomeIcon, Briefcase, Bookmark, Globe } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useTripStore } from '../store/tripStore';
import { geocode, MOROGORO_CENTER, reverseGeocode } from '../services/mapService';
import { i18n } from '../i18n';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

const HomeScreenNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setPickup, setDropoff } = useTripStore();

  const [userLocation, setUserLocation] = useState<[number, number]>(MOROGORO_CENTER);
  const [pickupAddress, setPickupAddress] = useState('Your current location');
  const [destination, setDestination] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  // Get user's GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);
          const addr = await reverseGeocode(lat, lng);
          setPickupAddress(addr);
          setPickup({ lat, lng, address: addr });
        },
        () => {
          // Fallback to Morogoro center
          setPickup({
            lat: MOROGORO_CENTER[0],
            lng: MOROGORO_CENTER[1],
            address: 'Morogoro City Center',
          });
        }
      );
    }
  }, [setPickup]);

  const handleSearch = async (query: string) => {
    setDestination(query);
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const results = await geocode(query);
    setSearchResults(results);
    setShowResults(results.length > 0);
  };

  const selectDestination = (result: any) => {
    setDestination(result.address);
    setDropoff({ lat: result.lat, lng: result.lng, address: result.address });
    setShowResults(false);
    navigate('/book');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Map */}
      <MapContainer
        center={userLocation}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationUpdater center={userLocation} />
        <Marker position={userLocation}>
          <Popup>You are here</Popup>
        </Marker>
      </MapContainer>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur shadow-lg z-10 p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-600 text-sm">{greeting()},</p>
            <h1 className="text-[#0F172A] font-black text-2xl">{user?.name || i18n.t('profile.user')}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 rounded-full border border-gray-200 flex items-center gap-1 text-gray-600 hover:bg-gray-50 transition"
              >
                <Globe size={18} />
                <span className="text-xs font-bold">{i18n.getLanguage() === 'en' ? 'EN' : 'SW'}</span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <button
                    onClick={() => { i18n.setLanguage('en'); setShowLangMenu(false); }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition text-sm ${i18n.getLanguage() === 'en' ? 'font-bold text-[#2563EB]' : 'text-gray-700'}`}
                  >
                    <span>🇬🇧</span> English
                  </button>
                  <button
                    onClick={() => { i18n.setLanguage('sw'); setShowLangMenu(false); }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition text-sm ${i18n.getLanguage() === 'sw' ? 'font-bold text-[#2563EB]' : 'text-gray-700'}`}
                  >
                    <span>🇹🇿</span> Kiswahili
                  </button>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-[#2563EB] rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'G'}
            </div>
          </div>
        </div>

        {/* Booking Card */}
        <div className="bg-white rounded-2xl shadow-xl p-4 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-2 h-2 bg-[#128901] rounded-full flex-shrink-0 mt-1" />
            <input
              type="text"
              value={pickupAddress}
              readOnly
              className="flex-1 text-gray-700 font-medium outline-none bg-transparent"
            />
            <Navigation size={18} className="text-[#2563EB]" />
          </div>
          <div className="flex items-center gap-3 relative">
            <MapPin size={16} className="text-red-500 flex-shrink-0 mt-1" />
            <input
              type="text"
              placeholder={i18n.t('where_to')}
              value={destination}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="flex-1 text-gray-900 font-medium outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-64 overflow-auto z-20">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => selectDestination(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition"
                >
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#0F172A] font-semibold text-sm truncate">{result.address}</p>
                      <p className="text-gray-500 text-xs truncate">{result.displayName}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved Places */}
        <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
          {[
            { icon: HomeIcon, label: 'Home' },
            { icon: Briefcase, label: 'Work' },
            { icon: Bookmark, label: 'Saved' },
          ].map((place) => (
            <button
              key={place.label}
              className="flex items-center gap-2 bg-[#F3F5F9] hover:bg-gray-200 px-4 py-2 rounded-xl transition flex-shrink-0"
            >
              <place.icon size={16} className="text-gray-600" />
              <span className="text-gray-700 text-sm font-semibold">{place.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom padding for nav */}
      <div className="h-20" />
    </div>
  );
};

export default HomeScreenNew;
