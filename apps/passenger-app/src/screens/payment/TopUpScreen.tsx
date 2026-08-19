import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { WalletAPI } from '../../services/api/WalletAPI';
import type { MobileMoneyProvider } from '@dalasmart/shared-types';

const TopUpScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [selectedAmount, setSelectedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider>('mpesa');
  const [isProcessing, setIsProcessing] = useState(false);

  const amounts = ['5000', '10000', '20000', '50000'];

  const providers: { id: MobileMoneyProvider; name: string; icon: string }[] = [
    { id: 'mpesa', name: 'M-Pesa', icon: 'currency-usd' },
    { id: 'airtel', name: 'Airtel Money', icon: 'currency-usd' },
    { id: 'tigo', name: 'Tigo Pesa', icon: 'currency-usd' },
  ];

  const handleTopUp = async () => {
    const amount = customAmount || selectedAmount;
    if (!amount) {
      Alert.alert(t('common.error'), 'Please select or enter an amount');
      return;
    }

    setIsProcessing(true);
    try {
      await WalletAPI.topUp({
        amount: parseFloat(amount),
        provider: selectedProvider,
        phoneNumber: '', // Will be fetched from user profile
      });

      Alert.alert(t('common.success'), 'Top up request sent');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Top up failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('wallet.selectAmount')}
        </Text>
        <View style={styles.amountsGrid}>
          {amounts.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.amountButton,
                {
                  backgroundColor:
                    selectedAmount === amount
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => {
                setSelectedAmount(amount);
                setCustomAmount('');
              }}
            >
              <Text
                style={[
                  styles.amountText,
                  {
                    color:
                      selectedAmount === amount
                        ? theme.colors.white
                        : theme.colors.text,
                  },
                ]}
              >
                TSh {parseInt(amount).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[
            styles.customInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder={t('wallet.customAmount')}
          placeholderTextColor={theme.colors.textSecondary}
          value={customAmount}
          onChangeText={(text) => {
            setCustomAmount(text);
            setSelectedAmount('');
          }}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('wallet.paymentMethod')}
        </Text>
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor:
                  selectedProvider === provider.id
                    ? theme.colors.primary
                    : theme.colors.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedProvider(provider.id)}
          >
            <Icon
              name={provider.icon}
              size={24}
              color={
                selectedProvider === provider.id
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.providerText,
                {
                  color:
                    selectedProvider === provider.id
                      ? theme.colors.primary
                      : theme.colors.text,
                },
              ]}
            >
              {provider.name}
            </Text>
            {selectedProvider === provider.id && (
              <Icon name="check-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.topUpButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleTopUp}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <Text style={[styles.topUpButtonText, { color: theme.colors.white }]}>
            {t('wallet.topUp')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  amountButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  providerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  topUpButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  topUpButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default TopUpScreen;
