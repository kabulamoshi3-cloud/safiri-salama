import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

import OnboardingScreen from './screens/OnboardingScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import TripsScreen from './screens/TripsScreen';
import ProfileScreen from './screens/ProfileScreen';
import DriverHomeScreen from './screens/DriverHomeScreen';
import EarningsScreen from './screens/EarningsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PassengerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#999',
        headerStyle: { backgroundColor: '#1a73e8' },
        headerTintColor: '#fff',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '🏠 Home' }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ title: '🚗 Trips' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '👤 Profile' }} />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: '#999',
        headerStyle: { backgroundColor: '#2e7d32' },
        headerTintColor: '#fff',
      }}
    >
      <Tab.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: '🏠 Home' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: '💰 Earnings' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '👤 Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'welcome' | 'passenger' | 'driver'>('loading');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('@dalasmart:token');
    const role = await AsyncStorage.getItem('@dalasmart:role');
    const hasOnboarded = await AsyncStorage.getItem('@dalasmart:onboarded');

    if (token && role) {
      setAppState(role === 'driver' ? 'driver' : 'passenger');
    } else if (hasOnboarded) {
      setAppState('welcome');
    } else {
      setAppState('onboarding');
    }
  };

  if (appState === 'loading') return null;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {appState === 'onboarding' ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Main" component={PassengerTabs} />
          </>
        ) : appState === 'welcome' ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Main" component={PassengerTabs} />
          </>
        ) : appState === 'passenger' ? (
          <Stack.Screen name="Main" component={PassengerTabs} />
        ) : (
          <Stack.Screen name="Main" component={DriverTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
