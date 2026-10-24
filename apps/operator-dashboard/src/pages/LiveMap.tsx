import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DAR_ES_SALAAM = { lat: -6.7924, lng: 39.2083 };

const mockDrivers = [
  { id: 1, name: 'James Mwangi', vehicle: 'T 123 ABC', lat: -6.785, lng: 39.215, status: 'available', trips: 8 },
  { id: 2, name: 'Peter Kimani',  vehicle: 'T 456 DEF', lat: -6.800, lng: 39.200, status: 'on_trip',   trips: 12 },
  { id: 3, name: 'Samuel Osei',  vehicle: 'T 789 GHI', lat: -6.775, lng: 39.225, status: 'available', trips: 5 },
  { id: 4, name: 'Ali Hassan',   vehicle: 'T 012 JKL', lat: -6.810, lng: 39.190, status: 'on_trip',   trips: 9 },
  { id: 5, name: 'David Kamau',  vehicle: 'T 345 MNO', lat: -6.760, lng: 39.230, status: 'offline',   trips: 0 },
];

const statusColor = { available: '#22c55e', on_trip: '#3b82f6', offline: '#9ca3af' };

export default function LiveMap() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'available' | 'on_trip'>('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setLastUpdate(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? mockDrivers : mockDrivers.filter((d) => d.status === filter);

  const createDriverIcon = (status: string) =>
    L.divIcon({
      html: `<div style="background:${statusColor[status as keyof typeof statusColor] ?? '#999'};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav_live_map') || 'Live Map'}</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time fleet tracking · Updated {lastUpdate.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'available', 'on_trip'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'available' ? '🟢 Available' : '🔵 On Trip'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mb-4 text-sm text-gray-600">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Available ({mockDrivers.filter(d => d.status === 'available').length})</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> On Trip ({mockDrivers.filter(d => d.status === 'on_trip').length})</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Offline ({mockDrivers.filter(d => d.status === 'offline').length})</span>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200" style={{ height: '500px' }}>
        <MapContainer
          center={[DAR_ES_SALAAM.lat, DAR_ES_SALAAM.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {/* Service area circle */}
          <Circle
            center={[DAR_ES_SALAAM.lat, DAR_ES_SALAAM.lng]}
            radius={8000}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, weight: 1 }}
          />
          {/* Driver markers */}
          {filtered.map((driver) => (
            <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={createDriverIcon(driver.status)}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{driver.name}</p>
                  <p className="text-gray-500">{driver.vehicle}</p>
                  <p className="mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      driver.status === 'available' ? 'bg-green-100 text-green-700' :
                      driver.status === 'on_trip' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>{driver.status.replace('_', ' ')}</span>
                  </p>
                  <p className="text-gray-500 mt-1">Trips today: {driver.trips}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
