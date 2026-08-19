import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { DriverStatusProvider } from './contexts/DriverStatusContext';
import { I18nProvider } from './i18n';
import RootNavigator from './navigation/RootNavigator';
import { NotificationService } from './services/NotificationService';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize notification service
    NotificationService.initialize();
    
    return () => {
      NotificationService.cleanup();
    };
  }, []);

  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <LocationProvider>
            <DriverStatusProvider>
              <NavigationContainer>
                <StatusBar barStyle="dark-content" />
                <RootNavigator />
              </NavigationContainer>
            </DriverStatusProvider>
          </LocationProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

export default App;
