import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = 'https://simon-daladala-api.vercel.app/api/v1';

export default function LoginScreen({ route, navigation }: any) {
  const role = route?.params?.role || 'passenger';
  const [phone, setPhone] = useState('+255');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');

  const handleAuth = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Enter a valid phone number');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const endpoint = isRegister ? `${API}/auth/register` : `${API}/auth/login`;
      const body = isRegister
        ? { phone, password, name, userType: role }
        : { phone, password };

      const res = await axios.post(endpoint, body);
      const token = res.data.token;
      await AsyncStorage.setItem('@dalasmart:token', token);
      await AsyncStorage.setItem('@dalasmart:role', role);
      await AsyncStorage.setItem('@dalasmart:user', JSON.stringify(res.data.user));
      navigation.reset({ index: 0, routes: [{ name: role === 'driver' ? 'MainDriver' : 'Main' }] });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.roleLabel}>
          {role === 'driver' ? '🏍️ Driver' : '🚗 Passenger'} Account
        </Text>
        <Text style={styles.title}>{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
      </View>

      <View style={styles.form}>
        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Phone (+255...)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={[styles.button, role === 'driver' && styles.driverButton]} onPress={handleAuth} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isRegister ? 'Sign Up' : 'Login'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
          <Text style={styles.switchText}>
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Change role</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a73e8', justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  roleLabel: { fontSize: 14, color: '#e3f2fd', marginBottom: 6 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  form: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 24 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 14, fontSize: 16, marginBottom: 12,
  },
  button: {
    backgroundColor: '#1a73e8', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  driverButton: { backgroundColor: '#2e7d32' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchText: { textAlign: 'center', marginTop: 16, color: '#1a73e8', fontSize: 14 },
  backBtn: { marginTop: 12, alignItems: 'center' },
  backText: { color: '#999', fontSize: 13 },
});
