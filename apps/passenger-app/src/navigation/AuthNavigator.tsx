import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PhoneVerificationScreen from '../screens/auth/PhoneVerificationScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  PhoneVerification: { phoneNumber: string };
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
