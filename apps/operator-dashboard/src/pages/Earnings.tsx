/**
 * Earnings Page
 * Shows gross / commission / payout summary, commission breakdown,
 * payout history table, and CSV export.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, Percent, Download } from 'lucide-react';
import StatCard from '../components/StatCard';
import api from '../services/api';

type Period = 'today' | 'week' | 'month' | 'all';

interface EarningSummary {
  gross: number;
  trips: number;
}

interface PayoutRow {
  date: string;
  trips_count: number;
  gross: number;
  commission: number;
  net: number;
}

// MOCK DATA — fallback for GET /api/v1/earnings/summary
const MOCK_SUMMARY: Record<Period, EarningSummary> = {
  today: { gross: 125000, trips: 18 },
  week:  { gross: 840000, trips: 112 },
  month: { gross: 3200000, trips: 430 },
  all:   { gross: 18500000, trips: 2410 },
};

// MOCK DATA — fallback for GET /api/v1/earnings/history
const MOCK_HISTORY: PayoutRow[] = [
  { date: '2024-09-20', trips_count: 18, gross: 125000, commission: 18750,  net: 106250 },
  { date: '2024-09-19', trips_count: 22, gross: 148000, commission: 22200,  net: 125800 },
  { date: '2024-09-18', trips_count: 15, gross: 97000,  commission: 14550,  net: 82450  },
  { date: '2024-09-17', trips_count: 25, gross: 170000, commission: 25500,  net: 144500 },
  { date: '2024-09-16', trips_count: 20, gross: 132000, commission: 19800,  net: 112200 },
  { date: '2024-09-15', trips_count: 30, gross: 198000, commission: 29700,  net: 168300 },
  { date: '2024-09-14', trips_count: 12, gross: 79000,  commission: 11850,  net: 67150  },
  { date: '2024-09-13', trips_count: 28, gross: 187000, commission: 28050,  net: 158950 },
  { date: '2024-09-12', trips_count: 19, gross: 126000, commission: 18900,  net: 107100 },
  { date: '2024-09-11', trips_count: 23, gross: 152000, commission: 22800,  net: 129200 },
];

const COMMISSION_RATE = 0.15; // MOCK DATA commission rate

const PERIOD_KEYS: { key: Period; label: string }[] = [
  { key: 'today', label: 'earnings_today' },
  { key: 'week',  label: 'earnings_week'  },
  { key: 'month', label: 'earnings_month' },
  { key: 'all',   label: 'earnings_total' },
];

function exportCSV(rows: PayoutRow[]) {
  const headers = ['Date', 'Trips', 'Gross (TZS)', 'Commission (TZS)', 'Net Payout (TZS)'];
  const lines = rows.map((r) =>
    [r.date, r.trips_count, r.gross, r.commission, r.net].join(',')
  );
  const csv = [headers.join(','), ...lines].join('\n');
  const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  const a = document.createElement('a');
  a.href = uri;
  a.download = 'payout_history.csv';
  a.click();
}

const Earnings: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');
  const [summary, setSummary] = useState<EarningSummary>(MOCK_SUMMARY.month);
  const [history, setHistory] = useState<PayoutRow[]>(MOCK_HISTORY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sumRes, histRes] = await Promise.all([
          api.get(`/earnings/summary?period=${period}`),
          api.get('/earnings/history?limit=30'),
        ]);
        setSummary(sumRes.data ?? MOCK_SUMMARY[period]);
        setHistory(histRes.data ?? MOCK_HISTORY);
      } catch {
        // MOCK DATA
        setSummary(MOCK_SUMMARY[period]);
        setHistory(MOCK_HISTORY);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const gross      = summary.gross;
  const commission = Math.round(gross * COMMISSION_RATE);
  const payout     = gross - commission;

  // Commission breakdown rows (mock per type)
  // MOCK DATA
  const breakdown = [
    { type: 'Car Trips',    gross: Math.round(gross * 0.55) },
    { type: 'Bajaji Trips', gross: Math.round(gross * 0.30) },
    { type: 'Boda Trips',   gross: Math.round(gross * 0.15) },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('earnings_title')}</h1>
        <p className="text-gray-500 mt-1">{t('earnings_subtitle')}</p>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-6">
        {PERIOD_KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              period === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title={t('earnings_gross')}
          value={`TZS ${gross.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color="blue"
          subtext={`${summary.trips} trips`}
        />
        <StatCard
          title={`${t('earnings_fee')} (${(COMMISSION_RATE * 100).toFixed(0)}%)`}
          value={`TZS ${commission.toLocaleString()}`}
          icon={<Percent size={20} />}
          color="yellow"
        />
        <StatCard
          title={t('earnings_payout')}
          value={`TZS ${payout.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="green"
        />
      </div>

      {/* Commission Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Commission Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Type</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('earnings_gross')}</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('earnings_fee')} (15%)</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('earnings_payout')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {breakdown.map((row) => (
                <tr key={row.type} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{row.type}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{row.gross.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-yellow-600">{Math.round(row.gross * COMMISSION_RATE).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-green-600">{Math.round(row.gross * (1 - COMMISSION_RATE)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('payout_history')}</h2>
          <button
            onClick={() => exportCSV(history.slice(0, 10))}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 text-sm rounded-lg transition"
          >
            <Download size={16} />
            {t('earnings_export_csv')}
          </button>
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-500">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">{t('th_date')}</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('th_trips')}</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('earnings_gross')}</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('earnings_fee')}</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">{t('earnings_payout')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.slice(0, 10).map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.date}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{row.trips_count}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{row.gross.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-yellow-600">{row.commission.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-medium">{row.net.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;
