import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';
import AnimatedButton from '../components/AnimatedButton';

export default function ScheduleRideScreen({ navigation }: any) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState(7);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const formatDay = (d: Date) => {
    if (d.toDateString() === today.toDateString()) return i18n.t('today');
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return i18n.t('tomorrow');
    return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
  };

  const confirmSchedule = () => {
    const scheduled = new Date(selectedDate);
    scheduled.setHours(selectedHour, selectedMinute, 0);

    if (scheduled <= new Date()) {
      Alert.alert(i18n.t('error'), i18n.t('future_time_error'));
      return;
    }

    const timeStr = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    Alert.alert(
      i18n.t('scheduled_success'),
      `${formatDay(selectedDate)} ${i18n.t('at_time')} ${timeStr}`,
      [{ text: i18n.t('ok'), onPress: () => navigation.goBack() }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Date selection */}
      <Text style={styles.sectionTitle}>{i18n.t('pick_date')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        {dates.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dateCard, selectedDate.toDateString() === d.toDateString() && styles.dateActive]}
            onPress={() => setSelectedDate(d)}
          >
            <Text style={[styles.dateDay, selectedDate.toDateString() === d.toDateString() && styles.dateTextActive]}>
              {formatDay(d)}
            </Text>
            <Text style={[styles.dateNum, selectedDate.toDateString() === d.toDateString() && styles.dateTextActive]}>
              {d.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Time selection */}
      <Text style={styles.sectionTitle}>{i18n.t('pick_time')}</Text>
      <View style={styles.timeContainer}>
        {/* Hours */}
        <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
          {hours.map(h => (
            <TouchableOpacity
              key={h}
              style={[styles.timeItem, selectedHour === h && styles.timeActive]}
              onPress={() => setSelectedHour(h)}
            >
              <Text style={[styles.timeText, selectedHour === h && styles.timeTextActive]}>
                {h.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.timeSep}>:</Text>

        {/* Minutes */}
        <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
          {minutes.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.timeItem, selectedMinute === m && styles.timeActive]}
              onPress={() => setSelectedMinute(m)}
            >
              <Text style={[styles.timeText, selectedMinute === m && styles.timeTextActive]}>
                {m.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Ionicons name="time-outline" size={20} color="#34c759" />
        <Text style={styles.summaryText}>
          {formatDay(selectedDate)} at {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
        </Text>
      </View>

      <AnimatedButton
        title={i18n.t('schedule_confirm')}
        onPress={confirmSchedule}
        colors={['#34c759', '#28a745']}
        icon="📅"
        style={{ marginHorizontal: 16, marginBottom: 30 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginHorizontal: 16, marginBottom: 12 },
  dateScroll: { paddingLeft: 16, marginBottom: 24 },
  dateCard: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 10, elevation: 1 },
  dateActive: { backgroundColor: '#34c759' },
  dateDay: { fontSize: 12, color: '#666', fontWeight: '500' },
  dateNum: { fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginTop: 2 },
  dateTextActive: { color: '#fff' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 180, marginBottom: 24, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  timeColumn: { flex: 1, maxHeight: 150 },
  timeSep: { fontSize: 28, fontWeight: '700', color: '#1c1c1e', marginHorizontal: 12 },
  timeItem: { paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  timeActive: { backgroundColor: '#34c75920' },
  timeText: { fontSize: 20, color: '#666' },
  timeTextActive: { color: '#34c759', fontWeight: '700' },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, padding: 14, backgroundColor: '#f0fdf4', marginHorizontal: 16, borderRadius: 10 },
  summaryText: { fontSize: 16, fontWeight: '600', color: '#1c1c1e', marginLeft: 8 },
});
