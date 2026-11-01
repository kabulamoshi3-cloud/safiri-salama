import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import AnimatedButton from '../components/AnimatedButton';
import i18n from '../i18n';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://safiriharaka-api.vercel.app/api/v1';

export default function LoginScreen({ route, navigation }: any) {
  const role = route?.params?.role || 'passenger';
  const [phone, setPhone] = useState('+255');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [, forceUpdate] = useState(0);

  const formSlide = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const handleAuth = async () => {
    if (!phone || phone.length < 10) { Alert.alert(i18n.t('error'), i18n.t('invalid_phone')); return; }
    if (!password || password.length < 6) { Alert.alert(i18n.t('error'), i18n.t('password_too_short')); return; }
    setLoading(true);
    try {
      const endpoint = isRegister ? `${API}/auth/register` : `${API}/auth/login`;
      if (isRegister && role === 'driver' && (!licenseNumber.trim() || !plateNumber.trim())) {
        Alert.alert(i18n.t('error'), 'Enter your license number and vehicle plate number');
        setLoading(false);
        return;
      }
      const body = isRegister
        ? {
            phone,
            password,
            name,
            user_type: role,
            ...(role === 'driver'
              ? { license_number: licenseNumber, plate_number: plateNumber, vehicle_type: vehicleType }
              : {}),
          }
        : { phone, password };
      const res = await axios.post(endpoint, body);
      const authenticatedRole = res.data.user?.userType || role;
      await AsyncStorage.setItem('@safiriharaka:token', res.data.token);
      await AsyncStorage.setItem('@safiriharaka:role', authenticatedRole);
      await AsyncStorage.setItem('@safiriharaka:user', JSON.stringify(res.data.user));
      navigation.reset({ index: 0, routes: [{ name: authenticatedRole === 'driver' ? 'DriverMain' : 'MainTabs' }] });
    } catch (err: any) {
      Alert.alert(i18n.t('error'), err.response?.data?.error || i18n.t('auth_failed'));
    } finally { setLoading(false); }
  };

  const isDriver = role === 'driver';

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.roleIcon}>{isDriver ? '🏍️' : '🚗'}</Text>
          <Text style={styles.roleLabel}>
            {isDriver ? i18n.t('driver_account') : i18n.t('passenger_account')}
          </Text>
          <Text style={styles.title}>
            {isRegister ? i18n.t('create_account') : i18n.t('welcome_back')}
          </Text>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateY: formSlide }], opacity: formOpacity }]}>
          {isRegister && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{i18n.t('full_name')}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enter_your_name')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}
          {isRegister && role === 'driver' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>License number</Text>
                <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Vehicle plate number</Text>
                <TextInput style={styles.input} value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Vehicle type</Text>
                <View style={styles.vehicleTypes}>
                  {['car', 'bajaji', 'boda-boda'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      accessibilityRole="button"
                      accessibilityState={{ selected: vehicleType === type }}
                      onPress={() => setVehicleType(type)}
                      style={[styles.vehicleTypeButton, vehicleType === type && styles.vehicleTypeSelected]}
                    >
                      <Text style={vehicleType === type ? styles.vehicleTypeSelectedText : styles.vehicleTypeText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{i18n.t('phone_number')}</Text>
            <TextInput style={styles.input} placeholder="+255 7XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{i18n.t('password')}</Text>
            <TextInput style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <AnimatedButton
            title={isRegister ? `${i18n.t('create_account')} →` : `${i18n.t('login')} →`}
            onPress={handleAuth}
            disabled={loading}
            colors={isDriver ? ['#2e7d32', '#1b5e20'] : ['#1a73e8', '#1565c0']}
            icon={loading ? '⏳' : isRegister ? '✨' : '🔓'}
          />

          <AnimatedButton
            title={isRegister ? i18n.t('have_account') : i18n.t('no_account')}
            onPress={() => setIsRegister(!isRegister)}
            variant="ghost"
            colors={['#1a73e8', '#1a73e8']}
            size="small"
          />

          <AnimatedButton
            title={i18n.t('change_role')}
            onPress={() => navigation.goBack()}
            variant="ghost"
            colors={['#999', '#999']}
            size="small"
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  roleIcon: { fontSize: 40, marginBottom: 8 },
  roleLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  form: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 24, padding: 28, elevation: 8 },
  inputContainer: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5, borderColor: '#eee', borderRadius: 12,
    padding: 14, fontSize: 16, backgroundColor: '#fafafa',
  },
  vehicleTypes: { flexDirection: 'row', gap: 8 },
  vehicleTypeButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingVertical: 10 },
  vehicleTypeSelected: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  vehicleTypeText: { color: '#333', fontSize: 11 },
  vehicleTypeSelectedText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  button: {
    backgroundColor: '#1a73e8', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 10, elevation: 3,
  },
  driverBtn: { backgroundColor: '#2e7d32' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { marginTop: 16 },
  switchText: { textAlign: 'center', color: '#1a73e8', fontSize: 14, fontWeight: '500' },
  backBtn: { marginTop: 12, alignItems: 'center' },
  backText: { color: '#aaa', fontSize: 13 },
});
