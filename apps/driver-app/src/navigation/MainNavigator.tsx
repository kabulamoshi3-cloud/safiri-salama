import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

// Screens
import HomeScreen from '../screens/main/HomeScreen';
import TripsScreen from '../screens/main/TripsScreen';
import EarningsScreen from '../screens/main/EarningsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import TripDetailsScreen from '../screens/trip/TripDetailsScreen';
import ActiveTripScreen from '../screens/trip/ActiveTripScreen';
import NavigationScreen from '../screens/trip/NavigationScreen';
import RatePassengerScreen from '../screens/trip/RatePassengerScreen';
import VehicleInfoScreen from '../screens/profile/VehicleInfoScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

export type MainTabParamList = {
  Home: undefined;
  Earnings: undefined;
  Activity: undefined;
  Notifications: undefined;
  Account: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  ActiveTrip: {
    tripId: string;
    pickup_lat?: number;
    pickup_lng?: number;
    destination_lat?: number;
    destination_lng?: number;
    passenger_name?: string;
    fare?: number;
  };
  TripDetails: { tripId: string };
  Navigation: {
    tripId: string;
    pickup_lat: number;
    pickup_lng: number;
    destination_lat: number;
    destination_lng: number;
    passenger_name: string;
    fare: number;
  };
  RatePassenger: {
    tripId: string;
    passengerId: string;
    passengerName: string;
    fare: number;
  };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  VehicleInfo: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

const HomeNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ActiveTrip"
        component={ActiveTripScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="TripDetails"
        component={TripDetailsScreen}
        options={{ title: 'Trip Details' }}
      />
      <HomeStack.Screen
        name="Navigation"
        component={NavigationScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="RatePassenger"
        component={RatePassengerScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
};

const ProfileNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="VehicleInfo"
        component={VehicleInfoScreen}
        options={{ title: 'Vehicle Information' }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </ProfileStack.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarLabel: t('tabs.earnings'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="cash-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={TripsScreen}
        options={{
          tabBarLabel: t('tab_activity') || t('tabs.trips'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="map-marker-path" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: t('tab_notifications') || 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={ProfileNavigator}
        options={{
          tabBarLabel: t('tab_account') || t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
