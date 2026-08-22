import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);

  const toggleOnline = () => {
    setIsOnline(!isOnline);
    Alert.alert(
      isOnline ? 'Going Offline' : 'Going Online',
      isOnline ? 'You will not receive trip requests' : 'You are now accepting trips!'
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Status Card */}
      <View style={[styles.statusCard, isOnline ? styles.online : styles.offline]}>
        <Text style={styles.statusText}>
          {isOnline ? '🟢 You are Online' : '🔴 You are Offline'}
        </Text>
        <TouchableOpacity
          style={[styles.toggleBtn, isOnline ? styles.offlineBtn : styles.onlineBtn]}
          onPress={toggleOnline}
        >
          <Text style={styles.toggleText}>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Today's Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Trips Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Sh 0</Text>
          <Text style={styles.statLabel}>Earned Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5.0 ⭐</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Trip Requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Requests</Text>
        {isOnline ? (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>📡</Text>
            <Text style={styles.waitingText}>Waiting for trip requests...</Text>
            <Text style={styles.waitingSubtext}>Stay online to receive bookings</Text>
          </View>
        ) : (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>💤</Text>
            <Text style={styles.waitingText}>You are offline</Text>
            <Text style={styles.waitingSubtext}>Go online to start accepting trips</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {[
            { label: 'Earnings', emoji: '💰' },
            { label: 'History', emoji: '📋' },
            { label: 'Vehicle', emoji: '🚗' },
            { label: 'Support', emoji: '❓' },
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
  statusCard: {
    margin: 16, padding: 24, borderRadius: 14, alignItems: 'center',
  },
  online: { backgroundColor: '#e8f5e9' },
  offline: { backgroundColor: '#fce4ec' },
  statusText: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 14 },
  toggleBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 },
  onlineBtn: { backgroundColor: '#2e7d32' },
  offlineBtn: { backgroundColor: '#c62828' },
  toggleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', marginHorizontal: 4, elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 12 },
  waitingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 30,
    alignItems: 'center', elevation: 1,
  },
  waitingEmoji: { fontSize: 36, marginBottom: 10 },
  waitingText: { fontSize: 16, color: '#333', fontWeight: '500' },
  waitingSubtext: { fontSize: 13, color: '#999', marginTop: 4 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, flex: 1,
    marginHorizontal: 3, alignItems: 'center', elevation: 1,
  },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 11, color: '#666' },
});
