import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type PhoneVerificationRouteProp = RouteProp<AuthStackParamList, 'PhoneVerification'>;

const PhoneVerificationScreen: React.FC = () => {
  const route = useRoute<PhoneVerificationRouteProp>();
  const { phoneNumber } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { verifyPhone } = useAuth();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert(t('common.error'), 'Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyPhone(phoneNumber, code);
      Alert.alert(t('common.success'), 'Phone number verified successfully');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    // TODO: Implement resend code
    Alert.alert(t('common.success'), 'Verification code sent');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('auth.verifyPhone')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('auth.enterCode')}
          </Text>
          <Text style={[styles.phone, { color: theme.colors.text }]}>{phoneNumber}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            placeholder="000000"
            placeholderTextColor={theme.colors.textSecondary}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.colors.white }]}>
                {t('auth.verify')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendButton} onPress={handleResendCode}>
            <Text style={[styles.resendText, { color: theme.colors.primary }]}>
              {t('auth.resendCode')}
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  phone: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  form: {
    flex: 1,
  },
  input: {
    height: 64,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 24,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    padding: 12,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhoneVerificationScreen;
