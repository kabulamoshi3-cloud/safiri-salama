import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';

interface Notification {
  id: string;
  type: string;
  icon: string;
  color: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'trip',
      icon: 'car',
      color: '#007aff',
      title: 'Driver arriving in 2 minutes',
      message: 'Your driver John is on the way',
      time: 'Just now',
      read: false,
    },
    {
      id: '2',
      type: 'payment',
      icon: 'checkmark-circle',
      color: '#34c759',
      title: 'Payment successful',
      message: 'Sh 8,500 paid via M-Pesa',
      time: '15 minutes ago',
      read: false,
    },
    {
      id: '3',
      type: 'promo',
      icon: 'gift',
      color: '#ff9500',
      title: 'Special offer!',
      message: '50% off your next ride',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '4',
      type: 'trip',
      icon: 'star',
      color: '#ffc107',
      title: 'Rate your trip',
      message: 'How was your ride with James?',
      time: 'Yesterday',
      read: true,
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, read: true })));
  };

  const handleNotifPress = (notif: Notification) => {
    // Mark as read
    setNotifications((prev: Notification[]) =>
      prev.map((n: Notification) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    // Deep link based on type
    if (notif.type === 'trip_update' || notif.type === 'trip_completed' || notif.type === 'trip') {
      navigation.navigate('ActivityTab');
    } else if (notif.type === 'payment') {
      navigation.navigate('PaymentsTab');
    }
    // other types: just mark as read (no navigation)
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('notifications_title') || 'Notifications'}</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllText}>{i18n.t('mark_all_read') || 'Mark all read'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{i18n.t('no_notifications') || 'No notifications'}</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map((notif: Notification) => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
              onPress={() => handleNotifPress(notif)}
            >
              <View style={[styles.notifIcon, { backgroundColor: notif.color + '20' }]}>
                <Ionicons name={notif.icon as any} size={24} color={notif.color} />
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifHeader}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  {!notif.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifMessage}>{notif.message}</Text>
                <Text style={styles.notifTime}>{notif.time}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1c1c1e' },
  markAllText: { fontSize: 14, fontWeight: '600', color: '#007aff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notifCardUnread: {
    backgroundColor: '#f0f9ff',
  },
  notifIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { fontSize: 16, fontWeight: '600', color: '#1c1c1e', flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007aff',
  },
  notifMessage: { fontSize: 14, color: '#666', marginBottom: 8 },
  notifTime: { fontSize: 12, color: '#999' },
});
