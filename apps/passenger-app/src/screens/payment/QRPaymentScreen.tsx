import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { WalletAPI } from '../../services/api/WalletAPI';

const QRPaymentScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isScan ning, setIsScanning] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQRCodeScanned = ({ data }: { data: string }) => {
    setQrCode(data);
    setIsScanning(false);
  };

  const handlePayment = async () => {
    if (!qrCode || !amount) {
      Alert.alert(t('common.error'), 'Please scan QR code and enter amount');
      return;
    }

    setIsProcessing(true);
    try {
      const transaction = await WalletAPI.payWithQR({
        qrCode,
        amount: parseFloat(amount),
      });

      Alert.alert(
        t('common.success'),
        `Payment of TSh ${amount} successful`,
        [{ text: t('common.ok'), onPress: () => {} }]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isScanning ? (
        <View style={styles.cameraContainer}>
          <RNCamera
            style={styles.camera}
            type={RNCamera.Constants.Type.back}
            onBarCodeRead={handleQRCodeScanned}
            barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <Text style={[styles.scanText, { color: theme.colors.white }]}>
                {t('wallet.scanTooltip')}
              </Text>
            </View>
          </RNCamera>
        </View>
      ) : (
        <View style={styles.paymentForm}>
          <View style={[styles.qrCodeCard, { backgroundColor: theme.colors.surface }]}>
            <Icon name="check-circle" size={48} color={theme.colors.success} />
            <Text style={[styles.qrCodeText, { color: theme.colors.text }]}>
              QR Code Scanned
            </Text>
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setIsScanning(true)}
            >
              <Text style={[styles.rescanText, { color: theme.colors.primary }]}>
                Scan Again
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.amountSection}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {t('wallet.amount')}
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <Text style={[styles.currency, { color: theme.colors.textSecondary }]}>
              TSh
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.payButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: isProcessing ? 0.6 : 1,
              },
            ]}
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={[styles.payButtonText, { color: theme.colors.white }]}>
                Pay Now
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanText: {
    marginTop: 32,
    fontSize: 16,
    textAlign: 'center',
  },
  paymentForm: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  qrCodeCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrCodeText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  rescanButton: {
    paddingVertical: 8,
  },
  rescanText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountInput: {
    height: 72,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 24,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  currency: {
    position: 'absolute',
    right: 24,
    top: 62,
    fontSize: 18,
  },
  payButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default QRPaymentScreen;
