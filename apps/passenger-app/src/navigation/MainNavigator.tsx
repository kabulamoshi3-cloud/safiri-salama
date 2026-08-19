import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

// Screens
import HomeScreen from '../screens/main/HomeScreen';
import TripHistoryScreen from '../screens/main/TripHistoryScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import TripPlannerScreen from '../screens/trip/TripPlannerScreen';
import TripDetailsScreen from '../screens/trip/TripDetailsScreen';
import LiveTrackingScreen from '../screens/trip/LiveTrackingScreen';
import QRPaymentScreen from '../screens/payment/QRPaymentScreen';
import TopUpScreen from '../screens/payment/TopUpScreen';
import TransactionHistoryScreen from '../screens/payment/TransactionHistoryScreen';
import SavedPlacesScreen from '../screens/profile/SavedPlacesScreen';
import EmergencyContactsScreen from '../screens/profile/EmergencyContactsScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import TripSharingScreen from '../screens/safety/TripSharingScreen';
import IncidentReportScreen from '../screens/safety/IncidentReportScreen';

export type MainTabParamList = {
  Home: undefined;
  TripHistory: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  TripPlanner: undefined;
  TripDetails: { tripId: string };
  LiveTracking: { tripId: string; vehicleId: string };
  TripSharing: { tripId: string };
  IncidentReport: { tripId?: string };
};

export type WalletStackParamList = {
  WalletMain: undefined;
  QRPayment: undefined;
  TopUp: undefined;
  TransactionHistory: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  SavedPlaces: undefined;
  EmergencyContacts: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const WalletStack = createStackNavigator<WalletStackParamList>();
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
        name="TripPlanner" 
        component={TripPlannerScreen}
        options={{ title: 'Plan Your Trip' }}
      />
      <HomeStack.Screen 
        name="TripDetails" 
        component={TripDetailsScreen}
        options={{ title: 'Trip Details' }}
      />
      <HomeStack.Screen 
        name="LiveTracking" 
        component={LiveTrackingScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen 
        name="TripSharing" 
        component={TripSharingScreen}
        options={{ title: 'Share Trip' }}
      />
      <HomeStack.Screen 
        name="IncidentReport" 
        component={IncidentReportScreen}
        options={{ title: 'Report Incident' }}
      />
    </HomeStack.Navigator>
  );
};

const WalletNavigator: React.FC = () => {
  return (
    <WalletStack.Navigator>
      <WalletStack.Screen 
        name="WalletMain" 
        component={WalletScreen}
        options={{ title: 'My Wallet' }}
      />
      <WalletStack.Screen 
        name="QRPayment" 
        component={QRPaymentScreen}
        options={{ title: 'QR Payment' }}
      />
      <WalletStack.Screen 
        name="TopUp" 
        component={TopUpScreen}
        options={{ title: 'Top Up Wallet' }}
      />
      <WalletStack.Screen 
        name="TransactionHistory" 
        component={TransactionHistoryScreen}
        options={{ title: 'Transaction History' }}
      />
    </WalletStack.Navigator>
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
        name="SavedPlaces" 
        component={SavedPlacesScreen}
        options={{ title: 'Saved Places' }}
      />
      <ProfileStack.Screen 
        name="EmergencyContacts" 
        component={EmergencyContactsScreen}
        options={{ title: 'Emergency Contacts' }}
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
        name="TripHistory"
        component={TripHistoryScreen}
        options={{
          tabBarLabel: t('tabs.trips'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletNavigator}
        options={{
          tabBarLabel: t('tabs.wallet'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
