/**
 * BookingScreen — Choose ride + payment method
 * Calls GET /payments/info to auto-fill phone & available methods
 * Calls POST /trips to create trip, then POST /payments/pay
 * Polls GET /payments/status/:ref for mobile money confirmation
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import {
  ArrowLeft, Car, Zap, Sparkles, ChevronRight,
  Phone, Edit2, CheckCircle, Loader, AlertCircle,
  Wallet, Banknote,
} from 'lucide-react';
import { useTripStore } from '../store/tripStore';
import { getRoute, calculateFare } from '../services/mapService';
import { i18n } from '../i18n';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl    from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize:[25,41], iconAnchor:[12,41] });

// ── Types ──────────────────────────────────────────────────────────────────

interface PaymentMethod {
  method: string;
  label: string;
  icon: string;
  available: boolean;
  recommended?: boolean;
  balance?: number;
}

interface PaymentInfo {
  registered_phone: string;
  masked_phone: string;
  detected_provider: string | null;
  wallet_balance: number;
  wallet_balance_formatted: string;
  payment_methods: PaymentMethod[];
}

type PayStep = 'select' | 'confirm_phone' | 'waiting' | 'done' | 'error';

// ── Method icon mapping ────────────────────────────────────────────────────

const METHOD_ICONS: Record<string, string> = {
  mpesa:        '📱',
  airtel_money: '📱',
  tigo_pesa:    '📱',
  halotel:      '📱',
  wallet:       '💳',
  cash:         '💵',
  qr_code:      '🔲',
};

const METHOD_COLORS: Record<string, string> = {
  mpesa:        'bg-green-50 border-green-200 text-green-800',
  airtel_money: 'bg-red-50 border-red-200 text-red-800',
  tigo_pesa:    'bg-blue-50 border-blue-200 text-blue-800',
  halotel:      'bg-orange-50 border-orange-200 text-orange-800',
  wallet:       'bg-purple-50 border-purple-200 text-purple-800',
  cash:         'bg-gray-50 border-gray-200 text-gray-800',
  qr_code:      'bg-indigo-50 border-indigo-200 text-indigo-800',
};

// ── Component ──────────────────────────────────────────────────────────────

const BookingScreenNew: React.FC = () => {
  const navigate = useNavigate();
  const {
    pickupLocation, dropoffLocation,
    selectedVehicle, setSelectedVehicle,
    fareEstimate,   setFareEstimate,
    routeGeometry,  setRouteGeometry,
    setActiveTrip,
  } = useTripStore();

  // Route info
  const [routeInfo,   setRouteInfo]   = useState<{ distance: number; duration: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);

  // Payment
  const [payInfo,     setPayInfo]     = useState<PaymentInfo | null>(null);
  const [payMethod,   setPayMethod]   = useState<string>('cash');
  const [customPhone, setCustomPhone] = useState('');
  const [useCustom,   setUseCustom]   = useState(false);
  const [payStep,     setPayStep]     = useState<PayStep>('select');
  const [payRef,      setPayRef]      = useState('');
  const [payMsg,      setPayMsg]      = useState('');
  const [payError,    setPayError]    = useState('');

  // Request loading
  const [requesting,  setRequesting]  = useState(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { return i18n.subscribe(() => forceUpdate()); }, []);

  // Redirect if no locations
  useEffect(() => {
    if (!pickupLocation || !dropoffLocation) { navigate('/'); return; }

    // Load route
    (async () => {
      setRouteLoading(true);
      const result = await getRoute(
        [pickupLocation.lat, pickupLocation.lng],
        [dropoffLocation.lat, dropoffLocation.lng]
      );
      if (result) {
        setRouteGeometry(result.geometry);
        setRouteInfo({ distance: result.distanceKm, duration: result.durationMin });
        setFareEstimate(calculateFare(result.distanceKm));
      }
      setRouteLoading(false);
    })();

    // Load payment info
    (async () => {
      try {
        const res = await api.get('/payments/info');
        setPayInfo(res.data);
        // Pre-select the recommended method, fallback to cash
        const rec = res.data.payment_methods.find((m: PaymentMethod) => m.recommended);
        if (rec) setPayMethod(rec.method);
      } catch {
        // If payment info fails, just allow cash
      }
    })();
  }, []);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  // Poll payment status
  const startPolling = (reference: string) => {
    pollTimer.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${reference}`);
        const { status, message } = res.data;
        setPayMsg(message || '');

        if (status === 'completed') {
          clearInterval(pollTimer.current!);
          setPayStep('done');
          setTimeout(() => navigate('/searching'), 1200);
        } else if (status === 'failed' || status === 'expired') {
          clearInterval(pollTimer.current!);
          setPayStep('error');
          setPayError(message || 'Payment failed. Please try again.');
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  const handleRequestRide = async () => {
    if (!pickupLocation || !dropoffLocation || !fareEstimate) return;
    setRequesting(true);
    setPayError('');

    const fare = fareEstimate[selectedVehicle];
    const phone = useCustom ? customPhone : payInfo?.registered_phone ?? '';

    try {
      // 1. Create trip
      const tripRes = await api.post('/trips', {
        pickup_lat:      pickupLocation.lat,
        pickup_lng:      pickupLocation.lng,
        pickup_location: pickupLocation.address,
        dropoff_lat:     dropoffLocation.lat,
        dropoff_lng:     dropoffLocation.lng,
        dropoff_location: dropoffLocation.address,
        vehicle_type:    selectedVehicle,
        fare,
      });

      const tripId = tripRes.data?.trip?.id;

      setActiveTrip({
        id:          tripId,
        status:      'searching',
        pickup:      pickupLocation,
        dropoff:     dropoffLocation,
        fare,
        vehicleType: selectedVehicle,
        distanceKm:  routeInfo?.distance,
        durationMin: routeInfo?.duration,
      });

      // 2. Initiate payment
      const payBody: Record<string, any> = {
        amount:     fare,
        method:     payMethod,
        context:    'ride',
        context_id: tripId,
      };
      if (payMethod !== 'cash' && payMethod !== 'wallet' && payMethod !== 'qr_code') {
        payBody.phone = phone;
        payBody.use_registered_phone = !useCustom;
      }

      const payRes = await api.post('/payments/pay', payBody);
      const { reference, status, message } = payRes.data;

      setPayRef(reference);
      setPayMsg(message || '');

      if (status === 'completed' || status === 'pending_confirmation') {
        // Cash or Wallet — go straight to searching
        navigate('/searching');
      } else if (status === 'pending') {
        // Mobile money STK push — show waiting screen and poll
        setPayStep('waiting');
        startPolling(reference);
      }

    } catch (err: any) {
      setPayError(err?.response?.data?.error || 'Failed to request ride. Please try again.');
      setPayStep('error');
    } finally {
      setRequesting(false);
    }
  };

  if (!pickupLocation || !dropoffLocation) return null;

  const routePath = routeGeometry
    ? routeGeometry.map(([lng, lat]) => [lat, lng] as [number, number])
    : [];

  const isMobileMoney = ['mpesa','airtel_money','tigo_pesa','halotel'].includes(payMethod);

  // ── Waiting for STK push ───────────────────────────────────────────────
  if (payStep === 'waiting') {
    return (
      <div className="min-h-screen bg-[#F3F5F9] flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-[#2563EB]/10 rounded-full animate-ping" />
              <div className="w-24 h-24 bg-[#2563EB]/20 rounded-full flex items-center justify-center">
                <Phone size={40} className="text-[#2563EB]" />
              </div>
            </div>
            <h2 className="text-[#0F172A] font-black text-2xl mb-2">Check Your Phone</h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">{payMsg}</p>

            <div className="bg-[#F3F5F9] rounded-xl p-4 mb-6">
              <div className="flex justify-center gap-1 mb-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <p className="text-xs text-gray-500">Waiting for confirmation...</p>
            </div>

            <button
              onClick={() => { if (pollTimer.current) clearInterval(pollTimer.current); setPayStep('select'); }}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              Cancel payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Payment success ────────────────────────────────────────────────────
  if (payStep === 'done') {
    return (
      <div className="min-h-screen bg-[#F3F5F9] flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h2 className="text-[#0F172A] font-black text-2xl mb-2">Payment Confirmed!</h2>
          <p className="text-gray-500 text-sm">Finding your driver...</p>
        </div>
      </div>
    );
  }

  // ── Main booking screen ────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white">

      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-[#0F172A] font-black text-xl">Choose a Ride</h1>
      </div>

      {/* Map */}
      <div className="h-48 flex-shrink-0 relative">
        <MapContainer
          center={[pickupLocation.lat, pickupLocation.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false} dragging={false} scrollWheelZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} />
          <Marker position={[dropoffLocation.lat, dropoffLocation.lng]} />
          {routePath.length > 0 && (
            <Polyline positions={routePath} color="#2563EB" weight={4} opacity={0.8} />
          )}
        </MapContainer>
        {routeInfo && (
          <div className="absolute bottom-3 right-3 bg-white rounded-lg shadow px-3 py-1.5 text-xs font-bold text-gray-700">
            {routeInfo.duration} min · {routeInfo.distance} km
          </div>
        )}
        {routeLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader size={24} className="text-[#2563EB] animate-spin" />
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">

        {/* Vehicle selector */}
        <div className="px-4 py-3 space-y-2">
          {[
            { type: 'economy' as const, icon: Car,      label: i18n.t('booking.economy'), desc: i18n.t('booking.economy_desc'),  badge: null },
            { type: 'comfort' as const, icon: Sparkles, label: i18n.t('booking.comfort'), desc: i18n.t('booking.comfort_desc'),  badge: 'BEST VALUE' },
            { type: 'express' as const, icon: Zap,      label: i18n.t('booking.express'), desc: i18n.t('booking.express_desc'),  badge: null },
          ].map(v => {
            const sel  = selectedVehicle === v.type;
            const fare = fareEstimate?.[v.type] ?? 0;
            return (
              <button
                key={v.type}
                onClick={() => setSelectedVehicle(v.type)}
                className={`w-full border-2 rounded-2xl p-3 transition flex items-center gap-3 ${
                  sel ? 'border-[#2563EB] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${sel ? 'bg-[#2563EB]' : 'bg-gray-100'}`}>
                  <v.icon size={20} className={sel ? 'text-white' : 'text-gray-600'} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[#0F172A] font-black text-sm">{v.label}</span>
                    {v.badge && (
                      <span className="bg-[#7C3AED] text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        {v.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{v.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#0F172A] font-black">TZS {fare.toLocaleString()}</p>
                  {routeInfo && <p className="text-gray-400 text-xs">{routeInfo.duration} min</p>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-4" />

        {/* Payment method selector */}
        <div className="px-4 py-3">
          <h3 className="text-[#0F172A] font-black text-sm mb-3">Payment Method</h3>

          {!payInfo ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader size={16} className="animate-spin" /> Loading payment options...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {payInfo.payment_methods.filter(m => m.method !== 'qr_code').map(m => {
                const sel = payMethod === m.method;
                return (
                  <button
                    key={m.method}
                    onClick={() => setPayMethod(m.method)}
                    className={`border-2 rounded-xl p-3 text-left transition flex items-center gap-2 ${
                      sel
                        ? 'border-[#2563EB] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className="text-xl">{METHOD_ICONS[m.method] || '💰'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0F172A] truncate">{m.label}</p>
                      {m.method === 'wallet' && (
                        <p className="text-xs text-gray-400">{payInfo.wallet_balance_formatted}</p>
                      )}
                      {m.recommended && (
                        <p className="text-xs text-[#2563EB] font-semibold">Recommended</p>
                      )}
                    </div>
                    {sel && <CheckCircle size={14} className="text-[#2563EB] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Phone number for mobile money */}
          {isMobileMoney && payInfo && (
            <div className="mt-3 bg-[#F3F5F9] rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">
                    {useCustom ? 'Custom number' : payInfo.masked_phone}
                  </span>
                  {!useCustom && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                      Registered
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setUseCustom(!useCustom)}
                  className="flex items-center gap-1 text-[#2563EB] text-xs font-bold"
                >
                  <Edit2 size={12} /> Change
                </button>
              </div>
              {useCustom && (
                <input
                  type="tel"
                  placeholder="0712 345 678"
                  value={customPhone}
                  onChange={e => setCustomPhone(e.target.value.replace(/[^\d]/g, ''))}
                  maxLength={12}
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                />
              )}
            </div>
          )}

          {/* Wallet warning if insufficient */}
          {payMethod === 'wallet' && payInfo && fareEstimate && payInfo.wallet_balance < fareEstimate[selectedVehicle] && (
            <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Insufficient wallet balance (TZS {payInfo.wallet_balance.toLocaleString()}).
                Top up in the Wallet page or choose another method.
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {payError && (
          <div className="mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{payError}</p>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </div>

      {/* Request button — sticky at bottom */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white flex-shrink-0">
        {/* Fare summary */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-gray-500 text-sm">Total fare</span>
          <span className="text-[#0F172A] font-black text-lg">
            TZS {(fareEstimate?.[selectedVehicle] ?? 0).toLocaleString()}
          </span>
        </div>

        <button
          onClick={handleRequestRide}
          disabled={requesting || routeLoading || !fareEstimate ||
            (payMethod === 'wallet' && payInfo !== null &&
             fareEstimate !== null &&
             payInfo.wallet_balance < fareEstimate[selectedVehicle])}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-black py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          {requesting ? (
            <><Loader size={18} className="animate-spin" /> Processing...</>
          ) : (
            <>
              {payMethod === 'cash'   && <Banknote size={18} />}
              {payMethod === 'wallet' && <Wallet size={18} />}
              {isMobileMoney          && <Phone size={18} />}
              Request Ride · {METHOD_ICONS[payMethod]} {payMethod === 'cash' ? 'Pay Cash' : payMethod === 'wallet' ? 'Pay with Wallet' : `Pay via ${payInfo?.payment_methods.find(m => m.method === payMethod)?.label ?? payMethod}`}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BookingScreenNew;
