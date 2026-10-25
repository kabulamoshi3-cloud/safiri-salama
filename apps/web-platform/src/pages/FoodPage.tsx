/**
 * Food Delivery Page — discover restaurants, browse, order
 */

import React, { useEffect, useState } from 'react';
import { Search, Star, Clock, MapPin, ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { i18n } from '../i18n';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  logo: string;
  rating: string;
  delivery_time: string;
  delivery_fee: number;
  is_open: boolean;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const FoodPage: React.FC = () => {
  const navigate  = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [showCart,    setShowCart]    = useState(false);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  useEffect(() => {
    // Use a default Nairobi location; real app uses navigator.geolocation
    fetchRestaurants(-1.2921, 36.8219);
  }, []);

  const fetchRestaurants = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await api.get('/food/restaurants', { params: { latitude: lat, longitude: lng, radius: 5 } });
      setRestaurants(res.data.restaurants ?? []);
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing?.quantity === 1) return prev.filter((c) => c.id !== id);
      return prev.map((c) => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const cartTotal   = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount   = cart.reduce((s, c) => s + c.quantity, 0);
  const filtered    = restaurants.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{i18n.t('food.delivery_title')}</h1>
      <p className="text-gray-500 mb-6">{i18n.t('food.order_desc')}</p>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6 focus-within:border-blue-500">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder={i18n.t('food.search_restaurants')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-gray-900 bg-transparent"
        />
      </div>

      {/* Restaurant List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <MapPin size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">{i18n.t('food.no_restaurants')}</p>
          <p className="text-sm mt-1">{i18n.t('food.try_different')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/food/restaurant/${r.id}`)}
              disabled={!r.is_open}
              className={`bg-white rounded-xl shadow border border-gray-100 text-left overflow-hidden hover:shadow-md transition ${
                !r.is_open ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {/* Restaurant image placeholder */}
              <div className="bg-gradient-to-br from-orange-100 to-red-100 h-28 flex items-center justify-center">
                <span className="text-4xl">{r.logo || '🍽️'}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-bold text-gray-900 text-base">{r.name}</p>
                  {!r.is_open && (
                    <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded">{i18n.t('food.closed')}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3 line-clamp-1">{r.description}</p>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Star size={13} className="text-yellow-500 fill-yellow-500" />
                    {r.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {r.delivery_time}
                  </span>
                  <span className="text-gray-400">
                    {r.delivery_fee === 0 ? i18n.t('food.free_delivery') : `Sh${r.delivery_fee} ${i18n.t('food.delivery_word')}`}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Cart FAB */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-full shadow-xl flex items-center gap-3 transition"
        >
          <div className="relative">
            <ShoppingCart size={22} />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          </div>
          <span>{i18n.t('food.view_cart')} · Sh{cartTotal}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-xl font-bold text-gray-900">{i18n.t('food.your_cart')}</h2>
              <button onClick={() => setShowCart(false)}>
                <X size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Sh{item.price} {i18n.t('food.each')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100">
                      <Minus size={14} />
                    </button>
                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart({ id: item.id, name: item.name, price: item.price })} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-5">
              <div className="flex justify-between font-bold text-lg mb-4">
                <span>{i18n.t('common.total')}</span><span>Sh{cartTotal}</span>
              </div>
              <button
                onClick={() => { setShowCart(false); navigate('/food/checkout', { state: { cart } }); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
              >
                {i18n.t('food.checkout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodPage;
