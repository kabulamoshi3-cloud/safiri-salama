/**
 * Fleet Management Page
 * Displays the operator's vehicles in a table with edit/add functionality.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import AlertBadge from '../components/AlertBadge';
import api from '../services/api';

interface Vehicle {
  id: string;
  plate: string;
  type: 'car' | 'bajaji' | 'boda';
  driver_name: string;
  mileage: number;
  last_maintenance: string;
  status: 'active' | 'maintenance' | 'offline';
}

// MOCK DATA — fallback when API is unavailable
const MOCK_VEHICLES: Vehicle[] = [
  { id: '1', plate: 'T 123 AAA', type: 'car',    driver_name: 'Juma Ally',     mileage: 45200, last_maintenance: '2024-08-10', status: 'active' },
  { id: '2', plate: 'T 456 BBB', type: 'bajaji', driver_name: 'Amina Hassan',  mileage: 23100, last_maintenance: '2024-07-22', status: 'active' },
  { id: '3', plate: 'T 789 CCC', type: 'boda',   driver_name: 'Salim Mwangi', mileage: 18500, last_maintenance: '2024-09-01', status: 'maintenance' },
  { id: '4', plate: 'T 321 DDD', type: 'car',    driver_name: 'Fatuma Said',   mileage: 62000, last_maintenance: '2024-06-15', status: 'offline' },
  { id: '5', plate: 'T 654 EEE', type: 'bajaji', driver_name: 'Omar Kimani',  mileage: 31400, last_maintenance: '2024-09-18', status: 'active' },
];

const EMPTY_FORM: Omit<Vehicle, 'id'> = {
  plate: '',
  type: 'car',
  driver_name: '',
  mileage: 0,
  last_maintenance: '',
  status: 'active',
};

const Fleet: React.FC = () => {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState<Omit<Vehicle, 'id'>>(EMPTY_FORM);
  const [addForm, setAddForm] = useState<Omit<Vehicle, 'id'>>(EMPTY_FORM);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/drivers');
        setVehicles(res.data?.vehicles ?? res.data ?? MOCK_VEHICLES);
      } catch {
        // MOCK DATA
        setVehicles(MOCK_VEHICLES);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openEdit = (v: Vehicle) => {
    setSelectedVehicle(v);
    setEditForm({ plate: v.plate, type: v.type, driver_name: v.driver_name, mileage: v.mileage, last_maintenance: v.last_maintenance, status: v.status });
  };

  const handleSave = async () => {
    if (!selectedVehicle) return;
    try {
      await api.patch(`/drivers/vehicle/${selectedVehicle.id}`, editForm);
    } catch {
      // MOCK DATA — apply locally
    }
    setVehicles((prev) =>
      prev.map((v) => (v.id === selectedVehicle.id ? { ...selectedVehicle, ...editForm } : v))
    );
    setSelectedVehicle(null);
  };

  const handleAdd = async () => {
    try {
      const res = await api.post('/drivers/vehicle', addForm);
      setVehicles((prev) => [...prev, res.data]);
    } catch {
      // MOCK DATA — add locally with generated id
      setVehicles((prev) => [...prev, { id: Date.now().toString(), ...addForm }]);
    }
    setAddForm(EMPTY_FORM);
    setShowAddForm(false);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('fleet_title')}</h1>
          <p className="text-gray-500 mt-1">{t('fleet_subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          {t('fleet_add_vehicle')}
        </button>
      </div>

      {/* Vehicle Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_plate')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_type')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_driver')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_mileage')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_maintenance')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_status')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.plate}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{v.type}</td>
                    <td className="px-4 py-3 text-gray-700">{v.driver_name}</td>
                    <td className="px-4 py-3 text-gray-600">{v.mileage.toLocaleString()} km</td>
                    <td className="px-4 py-3 text-gray-600">{v.last_maintenance}</td>
                    <td className="px-4 py-3"><AlertBadge status={v.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(v)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t('fleet_edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('fleet_edit')} — {selectedVehicle.plate}</h2>
              <button onClick={() => setSelectedVehicle(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <VehicleForm form={editForm} setForm={setEditForm} />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition"
              >
                {t('fleet_cancel')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                {t('fleet_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('fleet_add_vehicle')}</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <VehicleForm form={addForm} setForm={setAddForm} />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition"
              >
                {t('fleet_cancel')}
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                {t('fleet_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Shared form fields for both edit and add modals */
const VehicleForm: React.FC<{
  form: Omit<Vehicle, 'id'>;
  setForm: React.Dispatch<React.SetStateAction<Omit<Vehicle, 'id'>>>;
}> = ({ form, setForm }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('fleet_plate')}</span>
        <input
          type="text"
          value={form.plate}
          onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('fleet_type')}</span>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Vehicle['type'] }))}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="car">Car</option>
          <option value="bajaji">Bajaji</option>
          <option value="boda">Boda</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('fleet_driver')}</span>
        <input
          type="text"
          value={form.driver_name}
          onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('fleet_mileage')}</span>
        <input
          type="number"
          value={form.mileage}
          onChange={(e) => setForm((f) => ({ ...f, mileage: Number(e.target.value) }))}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </label>
    </div>
  );
};

export default Fleet;
