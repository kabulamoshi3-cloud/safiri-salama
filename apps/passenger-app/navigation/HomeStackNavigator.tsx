import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import HomeScreen from '../screens/HomeScreen';
import RideRequestScreen from '../screens/RideRequestScreen';
import TripActiveScreen from '../screens/TripActiveScreen';
import RatingScreen from '../screens/RatingScreen';
import TrafficScreen from '../screens/TrafficScreen';

const Stack = createNativeStackNavigator();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen 
        name="RideRequest" 
        component={RideRequestScreen}
        options={{ headerShown: true, title: '', headerTransparent: true }}
      />
      <Stack.Screen name="TripActive" component={TripActiveScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
      <Stack.Screen name="Traffic" component={TrafficScreen} />
    </Stack.Navigator>
  );
}
