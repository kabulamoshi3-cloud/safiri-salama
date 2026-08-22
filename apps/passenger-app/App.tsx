import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import OnboardingScreen from './screens/OnboardingScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import RideRequestScreen from './screens/RideRequestScreen';
import TripActiveScreen from './screens/TripActiveScreen';
import RatingScreen from './screens/RatingScreen';
import TripsScreen from './screens/TripsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SupportScreen from './screens/SupportScreen';
import DriverHomeScreen from './screens/DriverHomeScreen';
import DriverTripRequestScreen from './screens/DriverTripRequestScreen';
import DriverActiveTripScreen from './screens/DriverActiveTripScreen';
import EarningsScreen from './screens/EarningsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PassengerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Trips') iconName = focused ? 'car' : 'car-outline';
          else if (route.name === 'Support') iconName = focused ? 'help-circle' : 'help-circle-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: 6, paddingTop: 6, height: 60, borderTopWidth: 0, elevation: 10, shadowOpacity: 0.1 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#1a73e8', elevation: 0 },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ title: 'Trips' }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ title: 'Help' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Me' }} />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'DriverHome') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Earnings') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'Support') iconName = focused ? 'help-circle' : 'help-circle-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { paddingBottom: 6, paddingTop: 6, height: 60, borderTopWidth: 0, elevation: 10, shadowOpacity: 0.1 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#2e7d32', elevation: 0 },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ title: 'Help' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Me' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const role = await AsyncStorage.getItem('@dalasmart:role');
      const hasOnboarded = await AsyncStorage.getItem('@dalasmart:onboarded');

      if (token && role === 'driver') setInitialRoute('MainDriver');
      else if (token) setInitialRoute('Main');
      else if (hasOnboarded) setInitialRoute('Welcome');
      else setInitialRoute('Onboarding');
    })();
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={PassengerTabs} />
        <Stack.Screen name="MainDriver" component={DriverTabs} />
        <Stack.Screen name="RideRequest" component={RideRequestScreen} options={{ headerShown: true, title: 'Book a Ride', headerStyle: { backgroundColor: '#1a73e8' }, headerTintColor: '#fff' }} />
        <Stack.Screen name="TripActive" component={TripActiveScreen} options={{ headerShown: true, title: 'Your Trip', headerStyle: { backgroundColor: '#1a73e8' }, headerTintColor: '#fff' }} />
        <Stack.Screen name="Rating" component={RatingScreen} />
        <Stack.Screen name="TripRequest" component={DriverTripRequestScreen} options={{ headerShown: true, title: 'New Trip', headerStyle: { backgroundColor: '#2e7d32' }, headerTintColor: '#fff' }} />
        <Stack.Screen name="DriverActiveTrip" component={DriverActiveTripScreen} options={{ headerShown: true, title: 'Active Trip', headerStyle: { backgroundColor: '#2e7d32' }, headerTintColor: '#fff' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
