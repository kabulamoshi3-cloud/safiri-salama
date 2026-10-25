/**
 * Booking Page — select ride type, confirm fare, apply promo
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Tag, ChevronRight, Car, Zap } from 'lucide-react';
import api from '../services/api';
import { i18n } from '../i18n';

interface RideOption {
  id: string;
  nameKey: string;
  descKey: string;
  base_fare: number;
  estimated_time: string;
  icon: React.ReactNode;
}

const rideOptions: RideOption[] = [
  { id: 'economy',  nameKey: 'booking.economy',  descKey: 'booking.economy_desc', base_fare: 1500, estimated_time: '3-5', icon: <Car size={24} /> },
  { id: 'comfort',  nameKey: 'booking.comfort',  descKey: 'booking.comfort_desc', base_fare: 2500, estimated_time: '5-8', icon: <Car size={24} /> },
  { id: 'express',  nameKey: 'booking.express',  descKey: 'booking.express_desc', base_fare: 3000, estimated_time: '2-4', icon: <Zap size={24} /> },
];

const BookingPage: React.FC = () => {
  const { state }  = useLocation() as { state: { pickup: string; dropoff: string } | null };
  const navigate   = useNavigate();

  const [selected,   setSelected]   = useState<string>('economy');
  const [promoCode,  setPromoCode]  = useState('');
  const [promoMsg,   setPromoMsg]   = useState<{ text: string; ok: boolean } | null>(null);
  const [discount,   setDiscount]   = useState(0);
  const [validating, setValidating] = useState(false);
  const [booking,    setBooking]    = useState(false);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const currentOption = rideOptions.find((r) => r.id === selected)!;
  const finalFare     = Math.max(0, currentOption.base_fare - discount);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setValidating(true);
    setPromoMsg(null);
    try {
      const res = await api.post('/promo/validate', {
        code: promoCode.toUpperCase(),
        trip_amount: currentOption.base_fare,
      });
      if (res.data.valid) {
        setDiscount(res.data.discount_amount);
        setPromoMsg({ text: `✓ ${i18n.t('booking.saved')} Sh${res.data.discount_amount}!`, ok: true });
      }
    } catch {
      setDiscount(0);
      setPromoMsg({ text: i18n.t('booking.promo_invalid'), ok: false });
    } finally {
      setValidating(false);
    }
  };

  const handleBook = async () => {
    setBooking(true);
    try {
      const res = await api.post('/trips', {
        pickup_location:  state?.pickup,
        dropoff_location: state?.dropoff,
        ride_type:        selected,
        promo_code:       promoCode || undefined,
      });
      navigate(`/trip/${res.data.trip_id}`);
    } catch {
      alert(i18n.t('booking.failed'));
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Route Summary */}
      <div className="bg-white shadow-sm px-4 py-4 max-w-2xl mx-auto mt-2 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="w-0.5 h-8 bg-gray-300" />
            <MapPin size={14} className="text-red-500" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <p className="text-xs text-gray-500">{i18n.t('common.from')}</p>
              <p className="font-semibold text-gray-900">{state?.pickup || i18n.t('pickup_location')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{i18n.t('common.to')}</p>
              <p className="font-semibold text-gray-900">{state?.dropoff || i18n.t('destination')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6 pb-32">
        {/* Ride Options */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{i18n.t('booking.choose_ride_type')}</h2>
          <div className="space-y-3">
            {rideOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSelected(opt.id); setDiscount(0); setPromoMsg(null); }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                  selected === opt.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${selected === opt.id ? 'text-blue-600' : 'text-gray-500'}`}>
                    {opt.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{i18n.t(opt.nameKey)}</p>
                    <p className="text-sm text-gray-500">{i18n.t(opt.descKey)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">Sh{opt.base_fare}</p>
                  <p className="text-xs text-gray-500">{opt.estimated_time} {i18n.t('minutes')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Promo Code */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag size={16} className="text-blue-600" /> {i18n.t('booking.promo_code')}
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={i18n.t('booking.enter_promo')}
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(null); setDiscount(0); }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 uppercase"
            />
            <button
              onClick={validatePromo}
              disabled={validating || !promoCode}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              {validating ? '...' : i18n.t('apply')}
            </button>
          </div>
          {promoMsg && (
            <p className={`text-sm mt-2 font-semibold ${promoMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {promoMsg.text}
            </p>
          )}
        </div>

        {/* Fare Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 mb-2">{i18n.t('booking.fare_summary')}</h3>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{i18n.t('booking.base_fare')} ({i18n.t(currentOption.nameKey)})</span>
            <span>Sh{currentOption.base_fare}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
              <span>{i18n.t('booking.promo_discount')}</span>
              <span>-Sh{discount}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
            <span>{i18n.t('common.total')}</span>
            <span>Sh{finalFare}</span>
          </div>
        </div>
      </div>

      {/* Book Button — sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleBook}
            disabled={booking}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 text-lg"
          >
            {booking
              ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              : <><span>{i18n.t('booking.book')} {i18n.t(currentOption.nameKey)} · Sh{finalFare}</span><ChevronRight size={20} /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
