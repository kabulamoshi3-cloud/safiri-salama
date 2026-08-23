import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import i18n from './i18n';

// Auth
import CountryLanguageScreen from './screens/CountryLanguageScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';

// Main (Maxim-style: single screen + drawer)
import MainScreen from './screens/MainScreen';
import RideRequestScreen from './screens/RideRequestScreen';
import TripActiveScreen from './screens/TripActiveScreen';
import RatingScreen from './screens/RatingScreen';
import OrdersScreen from './screens/OrdersScreen';
import PaymentScreen from './screens/PaymentScreen';
import PromoScreen from './screens/PromoScreen';
import SettingsScreen from './screens/SettingsScreen';
import SupportScreen from './screens/SupportScreen';
import ProfileScreen from './screens/ProfileScreen';

// Driver
import DriverMainScreen from './screens/DriverMainScreen';
import DriverTripRequestScreen from './screens/DriverTripRequestScreen';
import DriverActiveTripScreen from './screens/DriverActiveTripScreen';
import EarningsScreen from './screens/EarningsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await i18n.loadSavedLanguage();
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const role = await AsyncStorage.getItem('@dalasmart:role');
      const hasOnboarded = await AsyncStorage.getItem('@dalasmart:onboarded');
      const hasCountry = await AsyncStorage.getItem('@dalasmart:country');

      if (token && role === 'driver') setInitialRoute('DriverMain');
      else if (token) setInitialRoute('Main');
      else if (hasOnboarded) setInitialRoute('Welcome');
      else if (hasCountry) setInitialRoute('Onboarding');
      else setInitialRoute('CountryLanguage');
    })();
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="CountryLanguage" component={CountryLanguageScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Passenger (Maxim-style: no tabs) */}
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="RideRequest" component={RideRequestScreen} options={{ headerShown: true, title: '', headerTransparent: true }} />
        <Stack.Screen name="TripActive" component={TripActiveScreen} />
        <Stack.Screen name="Rating" component={RatingScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: true, title: 'My Orders' }} />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true, title: 'Payment' }} />
        <Stack.Screen name="Promo" component={PromoScreen} options={{ headerShown: true, title: 'Promo Codes' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: true, title: 'Help' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />

        {/* Driver */}
        <Stack.Screen name="DriverMain" component={DriverMainScreen} />
        <Stack.Screen name="TripRequest" component={DriverTripRequestScreen} />
        <Stack.Screen name="DriverActiveTrip" component={DriverActiveTripScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: true, title: 'Earnings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
