import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import AnimatedButton from '../components/AnimatedButton';

const API = 'https://simon-daladala-api.vercel.app/api/v1';

export default function LoginScreen({ route, navigation }: any) {
  const role = route?.params?.role || 'passenger';
  const [phone, setPhone] = useState('+255');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');

  const formSlide = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (!phone || phone.length < 10) { Alert.alert('Error', 'Enter a valid phone number'); return; }
    if (!password || password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const endpoint = isRegister ? `${API}/auth/register` : `${API}/auth/login`;
      const body = isRegister ? { phone, password, name, userType: role } : { phone, password };
      const res = await axios.post(endpoint, body);
      await AsyncStorage.setItem('@dalasmart:token', res.data.token);
      await AsyncStorage.setItem('@dalasmart:role', role);
      await AsyncStorage.setItem('@dalasmart:user', JSON.stringify(res.data.user));
      navigation.reset({ index: 0, routes: [{ name: role === 'driver' ? 'DriverMain' : 'Main' }] });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const isDriver = role === 'driver';
  const colors: [string, string] = isDriver ? ['#2e7d32', '#1b5e20'] : ['#1a73e8', '#0d47a1'];

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.roleIcon}>{isDriver ? '🏍️' : '🚗'}</Text>
          <Text style={styles.roleLabel}>{isDriver ? 'Driver' : 'Passenger'} Account</Text>
          <Text style={styles.title}>{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
        </View>

        <Animated.View style={[styles.form, { transform: [{ translateY: formSlide }], opacity: formOpacity }]}>
          {isRegister && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.input} placeholder="Enter your name" value={name} onChangeText={setName} autoCapitalize="words" />
            </View>
          )}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput style={styles.input} placeholder="+255 7XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
          </View>

          <AnimatedButton
            title={isRegister ? 'Create Account →' : 'Login →'}
            onPress={handleAuth}
            disabled={loading}
            colors={isDriver ? ['#2e7d32', '#1b5e20'] : ['#1a73e8', '#1565c0']}
            icon={loading ? '⏳' : isRegister ? '✨' : '🔓'}
          />

          <AnimatedButton
            title={isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            onPress={() => setIsRegister(!isRegister)}
            variant="ghost"
            colors={['#1a73e8', '#1a73e8']}
            size="small"
          />

          <AnimatedButton
            title="← Change role"
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

