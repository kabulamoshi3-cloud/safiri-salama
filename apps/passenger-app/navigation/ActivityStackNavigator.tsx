import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ActivityScreen from '../screens/ActivityScreen';
import TripDetailScreen from '../screens/TripDetailScreen';

const Stack = createNativeStackNavigator();

export default function ActivityStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ActivityList" component={ActivityScreen} />
      <Stack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ headerShown: true, title: 'Trip Details', headerBackTitle: 'Back' }}
      />
    </Stack.Navigator>
  );
}
