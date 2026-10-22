import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileStackParamList } from '../../navigation/MainNavigator';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert(t('common.error'), t('profile.logoutFailed'));
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'truck',
      label: t('profile.vehicleInfo'),
      onPress: () => navigation.navigate('VehicleInfo'),
    },
    {
      icon: 'cog',
      label: t('tabs.profile'),
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'help-circle',
      label: t('profile.helpSupport'),
      onPress: () => {},
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarText, { color: theme.colors.white }]}>
              {user?.fullName?.charAt(0).toUpperCase() || 'D'}
            </Text>
          </View>
        </View>

        <Text style={[styles.name, { color: theme.colors.text }]}>
          {user?.fullName || 'Driver'}
        </Text>
        <Text style={[styles.phone, { color: theme.colors.textSecondary }]}>
          {user?.phoneNumber || ''}
        </Text>

        <TouchableOpacity style={styles.editButton}>
          <Icon name="pencil" size={16} color={theme.colors.primary} />
          <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
            {t('profile.editProfile')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
            onPress={item.onPress}
          >
            <Icon name={item.icon} size={24} color={theme.colors.primary} />
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
              {item.label}
            </Text>
            <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: theme.colors.error }]}
        onPress={handleLogout}
      >
        <Icon name="logout" size={20} color={theme.colors.error} />
        <Text style={[styles.logoutText, { color: theme.colors.error }]}>
          {t('profile.logout')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menu: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
