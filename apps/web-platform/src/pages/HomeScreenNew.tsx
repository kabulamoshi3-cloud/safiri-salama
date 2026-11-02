/**
 * Home Screen — SkyRex
 * Live Morogoro map + booking bar + wallet + recent trips + promos
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import {
  MapPin, Navigation, Wallet, Clock, ChevronRight,
  Tag, Car, Globe, LogOut, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useTripStore } from '../store/tripStore';
import { geocode, MOROGORO_CENTER, reverseGeocode } from '../services/mapService';
import { i18n } from '../i18n';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41],
});

function LocationUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 14); }, [center, map]);
  return null;
}

interface RecentTrip {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  final_price: number;
  status: string;
  created_at: string;
}

const HomeScreenNew: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { setPickup, setDropoff } = useTripStore();

  const [userLocation, setUserLocation]   = useState<[number, number]>(MOROGORO_CENTER);
  const [pickupAddress, setPickupAddress] = useState('Detecting your location...');
  const [destination, setDestination]     = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults]     = useState(false);
  const [showLangMenu, setShowLangMenu]   = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [recentTrips, setRecentTrips]     = useState<RecentTrip[]>([]);
  const [loadingTrips, setLoadingTrips]   = useState(true);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return i18n.subscribe(() => forceUpdate()); }, []);

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserLocation([lat, lng]);
          const addr = await reverseGeocode(lat, lng);
          setPickupAddress(addr);
          setPickup({ lat, lng, address: addr });
        },
        () => {
          setPickupAddress('Morogoro City Center');
          setPickup({ lat: MOROGORO_CENTER[0], lng: MOROGORO_CENTER[1], address: 'Morogoro City Center' });
        }
      );
    } else {
      setPickupAddress('Morogoro City Center');
      setPickup({ lat: MOROGORO_CENTER[0], lng: MOROGORO_CENTER[1], address: 'Morogoro City Center' });
    }
  }, []);

  // Load wallet balance + recent trips
  useEffect(() => {
    const loadData = async () => {
      try {
        const walletRes = await api.get('/payments/wallet');
        setWalletBalance(Number(walletRes.data.balance) || 0);
      } catch { /* silent */ }

      try {
        setLoadingTrips(true);
        const tripsRes = await api.get('/trips', { params: { limit: 3 } });
        const trips = Array.isArray(tripsRes.data) ? tripsRes.data : tripsRes.data?.trips ?? [];
        setRecentTrips(trips.slice(0, 3));
      } catch { /* silent */ } finally {
        setLoadingTrips(false);
      }
    };
    loadData();
  }, []);

  const handleSearch = async (query: string) => {
    setDestination(query);
    if (query.length < 3) { setSearchResults([]); setShowResults(false); return; }
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

  const handleRebook = (trip: RecentTrip) => {
    setDropoff({ lat: 0, lng: 0, address: trip.dropoff_location });
    navigate('/book');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return i18n.t('good_morning');
    if (h < 18) return i18n.t('good_afternoon');
    return i18n.t('good_evening');
  };

  const statusColor: Record<string, string> = {
    completed:   'text-green-600 bg-green-50',
    cancelled:   'text-red-600 bg-red-50',
    in_progress: 'text-blue-600 bg-blue-50',
  };

  return (
    <div className="relative h-screen overflow-hidden">

      {/* ── Map ── */}
      <MapContainer
        center={userLocation}
        zoom={14}
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

      {/* ── Top panel ── */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/97 backdrop-blur shadow-lg">

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-gray-500 text-xs font-medium">{greeting()},</p>
            <h1 className="text-[#0F172A] font-black text-xl leading-tight">
              {user?.name || 'Passenger'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 rounded-full border border-gray-200 flex items-center gap-1 text-gray-500 hover:bg-gray-50"
              >
                <Globe size={15} />
                <span className="text-xs font-bold">
                  {i18n.getLanguage() === 'en' ? 'EN' : 'SW'}
                </span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  {(['en', 'sw'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => { i18n.setLanguage(l); setShowLangMenu(false); }}
                      className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 text-sm ${i18n.getLanguage() === l ? 'font-bold text-[#2563EB]' : 'text-gray-700'}`}
                    >
                      {l === 'en' ? '🇬🇧 English' : '🇹🇿 Kiswahili'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wallet badge */}
            {walletBalance !== null && (
              <button
                onClick={() => navigate('/wallet')}
                className="flex items-center gap-1.5 bg-[#2563EB]/10 text-[#2563EB] px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#2563EB]/20 transition"
              >
                <Wallet size={13} />
                Sh{walletBalance.toLocaleString()}
              </button>
            )}

            {/* Avatar */}
            <div className="w-9 h-9 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-black text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>

        {/* Booking card */}
        <div className="mx-4 mb-4 bg-white rounded-2xl shadow-md border border-gray-100 overflow-visible">
          {/* Pickup */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <div className="w-2.5 h-2.5 bg-[#128901] rounded-full flex-shrink-0" />
            <p className="flex-1 text-gray-600 text-sm truncate">{pickupAddress}</p>
            <Navigation size={15} className="text-[#2563EB] flex-shrink-0" />
          </div>

          {/* Destination */}
          <div className="relative flex items-center gap-3 px-4 py-3">
            <MapPin size={16} className="text-red-500 flex-shrink-0" />
            <input
              type="text"
              placeholder={i18n.t('where_to') || 'Where to?'}
              value={destination}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="flex-1 text-gray-900 text-sm font-medium outline-none placeholder:text-gray-400 bg-transparent"
            />
            {destination && (
              <button onClick={() => { setDestination(''); setSearchResults([]); setShowResults(false); }}
                className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            )}

            {/* Dropdown */}
            {showResults && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-56 overflow-auto z-50">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => selectDestination(r)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[#0F172A] text-sm font-semibold truncate">{r.address}</p>
                      <p className="text-gray-400 text-xs truncate">{r.displayName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick action pills */}
        <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
          {[
            { label: i18n.t('home') || 'Home',     icon: '🏠' },
            { label: i18n.t('work') || 'Work',     icon: '💼' },
            { label: i18n.t('food') || 'Food',     icon: '🍔', path: '/food' },
            { label: i18n.t('wallet') || 'Wallet', icon: '💳', path: '/wallet' },
            { label: i18n.t('activity') || 'Trips', icon: '🕐', path: '/trips' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className="flex items-center gap-1.5 bg-[#F3F5F9] hover:bg-gray-200 px-3 py-2 rounded-xl transition flex-shrink-0 text-sm font-semibold text-gray-700"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom sheet — recent trips + promo ── */}
      <div className="absolute bottom-20 left-0 right-0 z-10 px-4 space-y-3">

        {/* Promo banner */}
        <div className="bg-gradient-to-r from-[#7C3AED] to-[#2563EB] rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Tag size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">First Ride 50% Off 🎉</p>
            <p className="text-white/70 text-xs">Use code <span className="font-bold">SKYREX50</span></p>
          </div>
          <button
            onClick={() => navigate('/book')}
            className="bg-white text-[#7C3AED] text-xs font-black px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            Book
          </button>
        </div>

        {/* Recent trips */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <span className="text-[#0F172A] font-black text-sm">Recent Trips</span>
            </div>
            <button onClick={() => navigate('/trips')}
              className="flex items-center gap-1 text-[#2563EB] text-xs font-semibold">
              See all <ChevronRight size={13} />
            </button>
          </div>

          {loadingTrips ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2563EB]" />
            </div>
          ) : recentTrips.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Car size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm font-semibold">No trips yet</p>
              <p className="text-gray-300 text-xs mt-1">Book your first ride above</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTrips.map(trip => (
                <div key={trip.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 bg-[#F3F5F9] rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin size={14} className="text-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0F172A] text-sm font-semibold truncate">
                      {trip.dropoff_location}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${statusColor[trip.status] || 'text-gray-500 bg-gray-50'}`}>
                        {trip.status}
                      </span>
                      <span className="text-gray-400 text-xs">
                        Sh{trip.final_price || '—'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRebook(trip)}
                    className="flex items-center gap-1 text-[#2563EB] text-xs font-bold bg-[#2563EB]/10 px-2 py-1.5 rounded-lg hover:bg-[#2563EB]/20 transition flex-shrink-0"
                  >
                    <RefreshCw size={11} /> Rebook
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default HomeScreenNew;
