import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import AnimatedButton from '../components/AnimatedButton';
import i18n from '../i18n';

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const toggleOnline = () => {
    setIsOnline(!isOnline);
    Alert.alert(
      isOnline ? i18n.t('going_offline_title') : i18n.t('going_online_title'),
      isOnline ? i18n.t('offline_alert_body') : i18n.t('online_alert_body')
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Status Card */}
      <View style={[styles.statusCard, isOnline ? styles.online : styles.offline]}>
        <Text style={styles.statusText}>
          {isOnline ? `🟢 ${i18n.t('you_are_online')}` : `🔴 ${i18n.t('you_are_offline')}`}
        </Text>
        <AnimatedButton
          title={isOnline ? `⏸ ${i18n.t('go_offline')}` : `▶ ${i18n.t('go_online')}`}
          onPress={toggleOnline}
          colors={isOnline ? ['#c62828', '#b71c1c'] : ['#2e7d32', '#1b5e20']}
          icon={isOnline ? '🔴' : '🟢'}
        />
      </View>

      {/* Today's Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>{i18n.t('trips_today')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Sh 0</Text>
          <Text style={styles.statLabel}>{i18n.t('earned_today')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5.0 ⭐</Text>
          <Text style={styles.statLabel}>{i18n.t('rating')}</Text>
        </View>
      </View>

      {/* Trip Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('trip_requests')}</Text>
        {isOnline ? (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>📡</Text>
            <Text style={styles.waitingText}>{i18n.t('waiting_trips')}</Text>
            <Text style={styles.waitingSubtext}>{i18n.t('stay_online')}</Text>
          </View>
        ) : (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>💤</Text>
            <Text style={styles.waitingText}>{i18n.t('you_are_offline')}</Text>
            <Text style={styles.waitingSubtext}>{i18n.t('offline_msg')}</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('quick_actions')}</Text>
        <View style={styles.actionsRow}>
          {[
            { label: i18n.t('earnings'), emoji: '💰' },
            { label: i18n.t('history'), emoji: '📋' },
            { label: i18n.t('vehicle'), emoji: '🚗' },
            { label: i18n.t('support'), emoji: '❓' },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.actionCard}>
              <Text style={styles.actionEmoji}>{item.emoji}</Text>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statusCard: { margin: 16, padding: 24, borderRadius: 14, alignItems: 'center' },
  online: { backgroundColor: '#e8f5e9' },
  offline: { backgroundColor: '#fce4ec' },
  statusText: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 14 },
  statsRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 12 },
  waitingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 30, alignItems: 'center', elevation: 1 },
  waitingEmoji: { fontSize: 36, marginBottom: 10 },
  waitingText: { fontSize: 16, color: '#333', fontWeight: '500' },
  waitingSubtext: { fontSize: 13, color: '#999', marginTop: 4 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flex: 1, marginHorizontal: 3, alignItems: 'center', elevation: 1 },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 11, color: '#666' },
});
