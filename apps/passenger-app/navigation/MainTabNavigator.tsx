import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';

// Tab Screens
import HomeStackNavigator from './HomeStackNavigator';
import ActivityStackNavigator from './ActivityStackNavigator';
import AccountStackNavigator from './AccountStackNavigator';
import PaymentsScreen from '../screens/PaymentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ActivityTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'PaymentsTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'NotificationsTab') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'AccountTab') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: i18n.t('tab_home') || 'Home' }}
      />
      <Tab.Screen
        name="ActivityTab"
        component={ActivityStackNavigator}
        options={{ tabBarLabel: i18n.t('tab_activity') || 'Activity' }}
      />
      <Tab.Screen
        name="PaymentsTab"
        component={PaymentsScreen}
        options={{ tabBarLabel: i18n.t('tab_payments') || 'Payments' }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ tabBarLabel: i18n.t('tab_notifications') || 'Notifications' }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStackNavigator}
        options={{ tabBarLabel: i18n.t('tab_account') || 'Account' }}
      />
    </Tab.Navigator>
  );
}
