import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  type: 'trip' | 'document' | 'payment' | 'announcement' | 'safety';
  icon: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  color: string;
}

const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'trip',
      icon: 'car',
      title: 'New trip request nearby',
      message: 'Pickup: 0.5 km away',
      time: 'Just now',
      read: false,
      color: '#007AFF',
    },
    {
      id: '2',
      type: 'payment',
      icon: 'cash-check',
      title: 'Payment received',
      message: 'Sh 8,500 via M-Pesa',
      time: '30 minutes ago',
      read: false,
      color: '#34C759',
    },
    {
      id: '3',
      type: 'document',
      icon: 'alert-circle',
      title: 'License expires in 30 days',
      message: 'Please renew your driving license',
      time: '2 hours ago',
      read: false,
      color: '#FF9500',
    },
    {
      id: '4',
      type: 'announcement',
      icon: 'bullhorn',
      title: 'Service announcement',
      message: 'Maintenance tonight 11PM-2AM',
      time: 'Yesterday',
      read: true,
      color: '#5856D6',
    },
    {
      id: '5',
      type: 'payment',
      icon: 'bank-transfer',
      title: 'Payout processed',
      message: 'Sh 125,000 transferred to your account',
      time: '2 days ago',
      read: true,
      color: '#34C759',
    },
  ]);

  const markAllAsRead = () => {
    console.log('Mark all as read');
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        { backgroundColor: theme.colors.surface },
        !item.read && { backgroundColor: theme.colors.primary + '10' },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Icon name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {item.title}
          </Text>
          {!item.read && (
            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
          )}
        </View>
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {item.message}
        </Text>
        <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
          {item.time}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bell-off-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {t('no_notifications') || 'No notifications'}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
        You're all caught up!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('notifications_title') || 'Notifications'}
        </Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={[styles.markAllText, { color: theme.colors.primary }]}>
            {t('mark_all_read') || 'Mark all read'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications list */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default NotificationsScreen;
