import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import i18n from './i18n';
import { registerForPushNotifications, setupNotificationHandlers } from './services/NotificationService';

// Auth
import CountryLanguageScreen from './screens/CountryLanguageScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';

// Main Tab Navigator
import MainTabNavigator from './navigation/MainTabNavigator';

// Screens still used by other flows
import PaymentScreen from './screens/PaymentScreen';
import PromoScreen from './screens/PromoScreen';
import SettingsScreen from './screens/SettingsScreen';
import SupportScreen from './screens/SupportScreen';

// Driver
import DriverMainScreen from './screens/DriverMainScreen';
import DriverTripRequestScreen from './screens/DriverTripRequestScreen';
import DriverActiveTripScreen from './screens/DriverActiveTripScreen';
import EarningsScreen from './screens/EarningsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    (async () => {
      try {
        await i18n.loadSavedLanguage();
        const [token, role, hasOnboarded, hasCountry] = await Promise.all([
          AsyncStorage.getItem('@safiriharaka:token'),
          AsyncStorage.getItem('@safiriharaka:role'),
          AsyncStorage.getItem('@safiriharaka:onboarded'),
          AsyncStorage.getItem('@safiriharaka:country'),
        ]);

        if (token && role === 'driver') setInitialRoute('DriverMain');
        else if (token) setInitialRoute('MainTabs');
        else if (hasOnboarded) setInitialRoute('Welcome');
        else if (hasCountry) setInitialRoute('Onboarding');
        else setInitialRoute('CountryLanguage');
      } catch (error) {
        console.warn('[App] Could not restore saved app state:', error);
        setInitialRoute('CountryLanguage');
      }

      // Optional notification setup must not prevent the app from opening.
      void registerForPushNotifications();
      setupNotificationHandlers();
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 56 }}>🚗</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 12 }}>Safiri Haraka</Text>
        <ActivityIndicator color="#fff" style={{ marginTop: 32 }} size="large" />
      </View>
    );
  }

  const handleNavigationReady = async () => {
    try {
      const raw = await AsyncStorage.getItem('@safiriharaka:pending_nav');
      if (raw && navigationRef.current) {
        const { screen, params } = JSON.parse(raw);
        await AsyncStorage.removeItem('@safiriharaka:pending_nav');
        navigationRef.current.navigate(screen, params);
      }
    } catch (_) {
      /* ignore pending nav errors */
    }
  };

  return (
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
      <StatusBar style="dark" />
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="CountryLanguage" component={CountryLanguageScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Passenger (Bottom Tabs) */}
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true, title: 'Payment' }} />
        <Stack.Screen name="Promo" component={PromoScreen} options={{ headerShown: true, title: 'Promo Codes' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: true, title: 'Help' }} />

        {/* Driver */}
        <Stack.Screen name="DriverMain" component={DriverMainScreen} />
        <Stack.Screen name="TripRequest" component={DriverTripRequestScreen} />
        <Stack.Screen name="DriverActiveTrip" component={DriverActiveTripScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: true, title: 'Earnings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
