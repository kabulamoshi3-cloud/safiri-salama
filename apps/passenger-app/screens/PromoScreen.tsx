import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';

export default function PromoScreen() {
  const [code, setCode] = useState('');

  const applyCode = () => {
    if (!code.trim()) { Alert.alert('Error', 'Enter a promo code'); return; }
    Alert.alert('Promo Code', `Code "${code}" applied! (demo)`);
    setCode('');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Enter code */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{i18n.t('promo_codes')}</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Enter code" value={code} onChangeText={setCode} autoCapitalize="characters" />
          <TouchableOpacity style={styles.applyBtn} onPress={applyCode}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Refer friends */}
      <View style={styles.referCard}>
        <Ionicons name="gift" size={32} color="#34c759" />
        <Text style={styles.referTitle}>{i18n.t('refer_friends')}</Text>
        <Text style={styles.referDesc}>{i18n.t('earn_per_referral')}</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>DALA5000</Text>
          <TouchableOpacity><Ionicons name="copy-outline" size={18} color="#007aff" /></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-social" size={18} color="#fff" />
          <Text style={styles.shareText}>Share with friends</Text>
        </TouchableOpacity>
      </View>

      {/* Active promos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Promotions</Text>
        <View style={styles.promoItem}>
          <Text style={styles.promoIcon}>🎉</Text>
          <View style={styles.promoInfo}>
            <Text style={styles.promoName}>First Ride 50% Off</Text>
            <Text style={styles.promoExp}>Expires in 7 days</Text>
          </View>
        </View>
        <View style={styles.promoItem}>
          <Text style={styles.promoIcon}>🌟</Text>
          <View style={styles.promoInfo}>
            <Text style={styles.promoName}>Weekend Sh 1,000 Off</Text>
            <Text style={styles.promoExp}>Sat & Sun only</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1c1c1e', marginBottom: 12 },
  inputRow: { flexDirection: 'row' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, marginRight: 8 },
  applyBtn: { backgroundColor: '#34c759', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '600' },
  referCard: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#34c75930' },
  referTitle: { fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginTop: 10 },
  referDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, marginTop: 12 },
  codeText: { fontSize: 18, fontWeight: '800', color: '#34c759', letterSpacing: 2, marginRight: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34c759', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 14 },
  shareText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  promoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  promoIcon: { fontSize: 24, marginRight: 12 },
  promoInfo: { flex: 1 },
  promoName: { fontSize: 14, fontWeight: '600', color: '#1c1c1e' },
  promoExp: { fontSize: 11, color: '#8e8e93', marginTop: 2 },
});
