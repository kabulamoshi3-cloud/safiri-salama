import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';

export default function PaymentScreen() {
  const [defaultMethod, setDefaultMethod] = useState('cash');

  const methods = [
    { id: 'cash', icon: 'cash-outline', label: i18n.t('cash'), desc: i18n.t('pay_driver'), color: '#34c759' },
    { id: 'mpesa', icon: 'phone-portrait-outline', label: i18n.t('mpesa'), desc: i18n.t('vodacom_mobile'), color: '#e21c23' },
    { id: 'tigo', icon: 'phone-portrait-outline', label: i18n.t('tigo_pesa'), desc: i18n.t('tigo_mobile'), color: '#003d7a' },
    { id: 'airtel', icon: 'phone-portrait-outline', label: i18n.t('airtel_money'), desc: i18n.t('airtel_mobile'), color: '#ff0000' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>{i18n.t('payment_method')}</Text>
      {methods.map((m) => (
        <TouchableOpacity key={m.id} style={[styles.card, defaultMethod === m.id && styles.cardActive]} onPress={() => setDefaultMethod(m.id)}>
          <View style={[styles.iconBox, { backgroundColor: m.color + '15' }]}>
            <Ionicons name={m.icon as any} size={22} color={m.color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.label}>{m.label}</Text>
            <Text style={styles.desc}>{m.desc}</Text>
          </View>
          {defaultMethod === m.id && <Ionicons name="checkmark-circle" size={22} color="#34c759" />}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addBtn}>
        <Ionicons name="add-circle-outline" size={22} color="#007aff" />
        <Text style={styles.addText}>{i18n.t('add_payment')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, borderWidth: 2, borderColor: 'transparent' },
  cardActive: { borderColor: '#34c759', backgroundColor: '#f0fdf4' },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#1c1c1e' },
  desc: { fontSize: 12, color: '#8e8e93', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 10 },
  addText: { fontSize: 15, color: '#007aff', fontWeight: '600', marginLeft: 8 },
});
