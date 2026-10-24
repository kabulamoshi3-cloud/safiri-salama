import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AccountScreen from '../screens/AccountScreen';
import SavedPlacesScreen from '../screens/SavedPlacesScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';

const Stack = createNativeStackNavigator();

export default function AccountStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountMain" component={AccountScreen} />
      <Stack.Screen
        name="SavedPlaces"
        component={SavedPlacesScreen}
        options={{ headerShown: true, title: 'Saved Places', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{ headerShown: true, title: 'Emergency Contacts', headerBackTitle: 'Back' }}
      />
    </Stack.Navigator>
  );
}
