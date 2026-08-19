import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logo, { color: theme.colors.primary }]}>DalaSmart</Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
            {t('auth.tagline')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.buttonText, { color: theme.colors.white }]}>
              {t('auth.login')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
              {t('auth.register')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
