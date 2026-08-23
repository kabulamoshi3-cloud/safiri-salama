import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import i18n from './i18n';

// Auth
import CountryLanguageScreen from './screens/CountryLanguageScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';

// Passenger (Bolt-style 3 tabs)
import RidesScreen from './screens/RidesScreen';
import ActivityScreen from './screens/ActivityScreen';
import AccountScreen from './screens/AccountScreen';

// Passenger sub-screens
import RideRequestScreen from './screens/RideRequestScreen';
import TripActiveScreen from './screens/TripActiveScreen';
import RatingScreen from './screens/RatingScreen';
import SupportScreen from './screens/SupportScreen';
import ScheduleRideScreen from './screens/ScheduleRideScreen';

// Driver
import DriverHomeScreen from './screens/DriverHomeScreen';
import EarningsScreen from './screens/EarningsScreen';
import DriverTripRequestScreen from './screens/DriverTripRequestScreen';
import DriverActiveTripScreen from './screens/DriverActiveTripScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PassengerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'car';
          if (route.name === 'Rides') iconName = focused ? 'navigate' : 'navigate-outline';
          else if (route.name === 'Activity') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Account') iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#34c759',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Rides" component={RidesScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'car';
          if (route.name === 'DriverHome') iconName = focused ? 'radio' : 'radio-outline';
          else if (route.name === 'Earnings') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Account') iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#34c759',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 20,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Online' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await i18n.loadSavedLanguage();
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const role = await AsyncStorage.getItem('@dalasmart:role');
      const hasOnboarded = await AsyncStorage.getItem('@dalasmart:onboarded');
      const hasCountry = await AsyncStorage.getItem('@dalasmart:country');

      if (token && role === 'driver') setInitialRoute('MainDriver');
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

        {/* Passenger */}
        <Stack.Screen name="Main" component={PassengerTabs} />
        <Stack.Screen name="RideRequest" component={RideRequestScreen} options={{ headerShown: true, title: '', headerTransparent: true, headerTintColor: '#000' }} />
        <Stack.Screen name="TripActive" component={TripActiveScreen} options={{ headerShown: true, title: 'Your Trip', headerStyle: { backgroundColor: '#fff' } }} />
        <Stack.Screen name="Rating" component={RatingScreen} />
        <Stack.Screen name="ScheduleRide" component={ScheduleRideScreen} options={{ headerShown: true, title: 'Schedule a Ride', headerStyle: { backgroundColor: '#fff' } }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ headerShown: true, title: 'Help', headerStyle: { backgroundColor: '#fff' } }} />

        {/* Driver */}
        <Stack.Screen name="MainDriver" component={DriverTabs} />
        <Stack.Screen name="TripRequest" component={DriverTripRequestScreen} />
        <Stack.Screen name="DriverActiveTrip" component={DriverActiveTripScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
