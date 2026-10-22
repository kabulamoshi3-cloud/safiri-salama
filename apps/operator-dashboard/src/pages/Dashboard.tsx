/**
 * Dashboard Page
 * Fleet Overview: StatCards, Leaflet live map, Revenue LineChart,
 * Trips-per-vehicle BarChart, Recent Alerts.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Users, Navigation, DollarSign, AlertTriangle, WifiOff, Wrench } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import StatCard from '../components/StatCard';
import AlertBadge from '../components/AlertBadge';
import api from '../services/api';

// ── Fix Leaflet default marker icons (must be at module level) ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ── Types ──────────────────────────────────────────────────────────────────
interface DriverLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

interface RevenuePoint {
  day: string;
  revenue: number;
}

interface VehicleTrips {
  plate: string;
  trips: number;
}

interface Alert {
  type: 'maintenance' | 'offline' | 'info' | 'warning';
  message: string;
  time: string;
}

// ── MOCK DATA ──────────────────────────────────────────────────────────────
const MOCK_DRIVERS: DriverLocation[] = [
  { id: 'drv-1', lat: -6.7920, lng: 39.2085, name: 'Juma Ally' },
  { id: 'drv-2', lat: -6.7950, lng: 39.2050, name: 'Fatuma Said' },
  { id: 'drv-3', lat: -6.7890, lng: 39.2110, name: 'Amina Hassan' },
];

const MOCK_REVENUE: RevenuePoint[] = (() => {
  const pts: RevenuePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    pts.push({
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      revenue: 80000 + Math.floor(Math.random() * 120000),
    });
  }
  return pts;
})();

// MOCK DATA — trips per vehicle
const MOCK_VEHICLE_TRIPS: VehicleTrips[] = [
  { plate: 'T 123 AAA', trips: 12 },
  { plate: 'T 456 BBB', trips: 9 },
  { plate: 'T 789 CCC', trips: 15 },
  { plate: 'T 321 DDD', trips: 7 },
  { plate: 'T 654 EEE', trips: 11 },
];

// MOCK DATA — recent alerts
const MOCK_ALERTS: Alert[] = [
  { type: 'maintenance', message: 'Vehicle T 123 AAA due for service',          time: '2h ago' },
  { type: 'offline',     message: 'Driver Juma went offline unexpectedly',       time: '4h ago' },
  { type: 'warning',     message: 'Trip #8821 flagged for unusual route',        time: '5h ago' },
  { type: 'maintenance', message: 'Vehicle T 654 EEE oil change overdue',        time: '1d ago' },
  { type: 'info',        message: 'Driver Fatuma completed 100th trip',          time: '1d ago' },
];

// Map alert type → AlertBadge status string
const alertTypeToStatus: Record<Alert['type'], string> = {
  maintenance: 'maintenance',
  offline:     'offline',
  warning:     'maintenance',
  info:        'active',
};

const alertIcons: Record<Alert['type'], React.ReactNode> = {
  maintenance: <Wrench size={16} />,
  offline:     <WifiOff size={16} />,
  warning:     <AlertTriangle size={16} />,
  info:        <Navigation size={16} />,
};

// ── Component ──────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  const [onlineDrivers, setOnlineDrivers]   = useState<number>(3);
  const [activeTrips,   setActiveTrips]     = useState<number>(7);
  const [revenueToday,  setRevenueToday]    = useState<number>(125000);
  const [totalVehicles, setTotalVehicles]   = useState<number>(5);
  const [drivers,       setDrivers]         = useState<DriverLocation[]>(MOCK_DRIVERS);
  const [revenueData,   setRevenueData]     = useState<RevenuePoint[]>(MOCK_REVENUE);
  const [vehicleTrips]                      = useState<VehicleTrips[]>(MOCK_VEHICLE_TRIPS);
  const [loading,       setLoading]         = useState(true);
  const [timestamp,     setTimestamp]       = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setTimestamp(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Nearby drivers / online count
        const nearbyRes = await api.get(
          '/tracking/nearby?lat=-6.7924&lng=39.2083&radius=50'
        );
        const nearbyData: DriverLocation[] = nearbyRes.data ?? [];
        if (nearbyData.length > 0) {
          setDrivers(nearbyData);
          setOnlineDrivers(nearbyData.length);
        }
      } catch {
        // MOCK DATA fallback — already initialised above
      }

      try {
        // Active trips
        const tripsRes = await api.get('/trips?status=in_progress');
        const tripsData = tripsRes.data ?? [];
        if (Array.isArray(tripsData) && tripsData.length > 0) {
          setActiveTrips(tripsData.length);
        }
      } catch {
        // MOCK DATA
      }

      try {
        // Today's revenue
        const earnRes = await api.get('/earnings/summary');
        const earnData = earnRes.data;
        if (earnData?.today) {
          setRevenueToday(Number(earnData.today));
        }
      } catch {
        // MOCK DATA
      }

      try {
        // Total vehicles
        const vehiclesRes = await api.get('/drivers');
        const vehiclesData = vehiclesRes.data ?? [];
        if (Array.isArray(vehiclesData) && vehiclesData.length > 0) {
          setTotalVehicles(vehiclesData.length);
        }
      } catch {
        // MOCK DATA
      }

      try {
        // Revenue history — last 7 days
        const histRes = await api.get('/earnings/history?limit=7');
        const histData: Array<{ date: string; gross: number }> = histRes.data ?? [];
        if (Array.isArray(histData) && histData.length > 0) {
          const mapped: RevenuePoint[] = histData.map((r) => ({
            day: r.date ? r.date.slice(5) : '',
            revenue: r.gross ?? 0,
          }));
          setRevenueData(mapped);
        }
      } catch {
        // MOCK DATA
      }

      setLoading(false);
    };

    load();
  }, []);

  const formattedTime = timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-8">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Overview</h1>
          <p className="text-gray-500 mt-1">{t('dashboard_subtitle')}</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: <span className="font-semibold text-gray-700">{formattedTime}</span>
        </div>
      </div>

      {/* ── Loading spinner ──────────────────────────────────── */}
      {loading && (
        <div className="flex items-center gap-3 mb-4 text-blue-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      )}

      {/* ── Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('stat_total_vehicles')}
          value={totalVehicles}
          icon={<Truck size={20} />}
          color="blue"
        />
        <StatCard
          title={t('stat_online_drivers')}
          value={onlineDrivers}
          icon={<Users size={20} />}
          color="green"
          trend="+2"
        />
        <StatCard
          title={t('stat_active_trips')}
          value={activeTrips}
          icon={<Navigation size={20} />}
          color="purple"
        />
        <StatCard
          title={t('stat_revenue_today')}
          value={`TZS ${revenueToday.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="yellow"
          subtext="Today"
        />
      </div>

      {/* ── Leaflet Map ──────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Live Fleet Map</h2>
          <p className="text-sm text-gray-500">Dar es Salaam — showing {drivers.length} active drivers</p>
        </div>
        <div className="h-80">
          <MapContainer
            center={[-6.7924, 39.2083]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {drivers.map((d) => (
              <Marker key={d.id} position={[d.lat, d.lng]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-gray-500">Driver ID: {d.id}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* ── Charts Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Revenue LineChart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('chart_revenue_7days')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`TZS ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trips-per-vehicle BarChart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('chart_trips_per_vehicle')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vehicleTrips} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plate" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="trips" fill="#10b981" radius={[4, 4, 0, 0]} name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Recent Alerts ────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('recent_alerts')}</h2>
        {/* MOCK DATA */}
        <ul className="divide-y divide-gray-100">
          {MOCK_ALERTS.map((alert, idx) => (
            <li key={idx} className="flex items-start gap-4 py-3">
              <div className="mt-0.5 text-gray-500">{alertIcons[alert.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{alert.time}</p>
              </div>
              <AlertBadge status={alertTypeToStatus[alert.type]} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
