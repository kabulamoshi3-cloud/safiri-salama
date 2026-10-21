import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { DriverAPI } from '../../services/api/DriverAPI';
import type { EarningsSummary } from '../../services/api/DriverAPI';

// ── 7-day bar chart data ──────────────────────────────────────────────────────

interface DayBar {
  label: string;   // e.g. "Ju"
  amount: number;
}

function buildDayBars(history: any[]): DayBar[] {
  const days: DayBar[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
    const shortDay = d.toLocaleDateString('sw-TZ', { weekday: 'short' }).slice(0, 2);

    const dayTotal = history
      .filter((row: any) => {
        const rowDate =
          row.period_date
            ? String(row.period_date).split('T')[0]
            : row.created_at
              ? String(row.created_at).split('T')[0]
              : '';
        return rowDate === dateStr;
      })
      .reduce((sum: number, row: any) => sum + Number(row.net_amount ?? 0), 0);

    days.push({ label: shortDay, amount: dayTotal });
  }
  return days;
}

// ── Component ─────────────────────────────────────────────────────────────────

const EarningsScreen: React.FC = () => {
  const { theme } = useTheme();
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const load = useCallback(async () => {
    try {
      const [summary, hist] = await Promise.all([
        DriverAPI.getEarnings(),
        DriverAPI.getEarningsHistory(20, 0),
      ]);
      setEarnings(summary);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const formatCurrency = (amount: number) =>
    `TSh ${Math.round(amount).toLocaleString()}`;

  const formatDate = (raw: string) => {
    try {
      return new Date(raw).toLocaleDateString('sw-TZ', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return raw;
    }
  };

  const shortRoute = (pickup?: string, dropoff?: string) => {
    const p = pickup ? pickup.split(',')[0].trim().slice(0, 18) : '—';
    const d = dropoff ? dropoff.split(',')[0].trim().slice(0, 18) : '—';
    return `${p} → ${d}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!earnings) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Imeshindwa kupakia mapato
        </Text>
        <TouchableOpacity onPress={() => { setIsLoading(true); load().finally(() => setIsLoading(false)); }}>
          <Text style={[styles.retryText, { color: theme.colors.primary }]}>Jaribu tena</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedAmount =
    selectedPeriod === 'today'
      ? earnings.today
      : selectedPeriod === 'week'
        ? earnings.week
        : earnings.month;

  const dayBars = buildDayBars(history);
  const maxBar = Math.max(...dayBars.map((d) => d.amount), 1);

  const PERIOD_LABELS: Record<'today' | 'week' | 'month', string> = {
    today: 'Leo',
    week:  'Wiki hii',
    month: 'Mwezi hii',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* ── Header card ── */}
      <View style={[styles.earningsCard, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.earningsLabel, { color: theme.colors.white }]}>
          Mapato
        </Text>
        <Text style={[styles.earningsAmount, { color: theme.colors.white }]}>
          {formatCurrency(selectedAmount)}
        </Text>

        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                {
                  backgroundColor:
                    selectedPeriod === period
                      ? theme.colors.white
                      : theme.colors.primaryDark,
                },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color:
                      selectedPeriod === period
                        ? theme.colors.primary
                        : theme.colors.white,
                  },
                ]}
              >
                {PERIOD_LABELS[period]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── 7-day bar chart ── */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Siku 7 Zilizopita
        </Text>

        <View style={styles.barChart}>
          {dayBars.map((day) => {
            const heightPct = maxBar > 0 ? day.amount / maxBar : 0;
            const BAR_MAX_H = 80;
            const barH = Math.max(Math.round(heightPct * BAR_MAX_H), day.amount > 0 ? 4 : 2);

            return (
              <View key={day.label} style={styles.barCol}>
                <Text style={[styles.barValue, { color: theme.colors.textSecondary }]}>
                  {day.amount > 0 ? `${Math.round(day.amount / 1000)}k` : ''}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barH,
                        backgroundColor:
                          day.amount > 0 ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                  {day.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Breakdown ── */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Muhtasari</Text>

        {[
          { label: 'Nauli (Pesa Taslimu)',  value: earnings.cashCollected },
          { label: 'Malipo ya Kidijitali',  value: earnings.digitalPayments },
          { label: 'Jumla',                 value: earnings.total },
        ].map(({ label, value }) => (
          <View key={label} style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
              {label}
            </Text>
            <Text style={[styles.breakdownAmount, { color: theme.colors.text }]}>
              {formatCurrency(value)}
            </Text>
          </View>
        ))}
      </View>

      {/* ── History list ── */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Historia</Text>

        {history.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Hakuna rekodi bado
          </Text>
        ) : (
          history.slice(0, 20).map((row: any, idx: number) => (
            <View
              key={row.id ?? idx}
              style={[
                styles.historyRow,
                idx < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                  {formatDate(row.created_at)}
                </Text>
                <Text style={[styles.historyRoute, { color: theme.colors.text }]} numberOfLines={1}>
                  {shortRoute(row.pickup_address, row.dropoff_address)}
                </Text>
              </View>
              <Text style={[styles.historyAmount, { color: theme.colors.success }]}>
                {formatCurrency(Number(row.net_amount ?? 0))}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── Withdraw button ── */}
      <TouchableOpacity
        style={[styles.withdrawBtn, { backgroundColor: theme.colors.primary }]}
        onPress={() => Alert.alert('Inaendelea', 'Huduma ya kutoa pesa itapatikana hivi karibuni 🚀')}
      >
        <Text style={styles.withdrawText}>Toa Pesa</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:         { flex: 1 },
  centered:          { justifyContent: 'center', alignItems: 'center' },
  errorText:         { fontSize: 16, marginBottom: 12 },
  retryText:         { fontSize: 15, fontWeight: '600' },
  earningsCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  earningsLabel:     { fontSize: 14, opacity: 0.9, marginBottom: 6 },
  earningsAmount:    { fontSize: 34, fontWeight: 'bold', marginBottom: 20 },
  periodSelector:    { flexDirection: 'row', gap: 8 },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText:  { fontSize: 12, fontWeight: '600' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle:      { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  // Bar chart
  barChart:          { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingHorizontal: 4 },
  barCol:            { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue:          { fontSize: 9, marginBottom: 2 },
  barTrack:          { width: '60%', justifyContent: 'flex-end', height: 80 },
  barFill:           { width: '100%', borderRadius: 3 },
  barLabel:          { fontSize: 10, marginTop: 4 },
  // Breakdown
  breakdownRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0' },
  breakdownLabel:    { fontSize: 13 },
  breakdownAmount:   { fontSize: 13, fontWeight: '600' },
  // History
  historyRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  historyLeft:       { flex: 1, marginRight: 12 },
  historyDate:       { fontSize: 11, marginBottom: 2 },
  historyRoute:      { fontSize: 13, fontWeight: '500' },
  historyAmount:     { fontSize: 14, fontWeight: '700' },
  emptyText:         { fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  // Withdraw
  withdrawBtn:       { marginHorizontal: 16, marginBottom: 8, padding: 16, borderRadius: 12, alignItems: 'center' },
  withdrawText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomPadding:     { height: 24 },
});

export default EarningsScreen;
