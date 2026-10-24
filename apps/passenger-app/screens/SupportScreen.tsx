import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';
import i18n from '../i18n';

export default function SupportScreen() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const faqs = [
    { q: i18n.t('faq_q1'), a: i18n.t('faq_a1') },
    { q: i18n.t('faq_q2'), a: i18n.t('faq_a2') },
    { q: i18n.t('faq_q3'), a: i18n.t('faq_a3') },
    { q: i18n.t('faq_q4'), a: i18n.t('faq_a4') },
    { q: i18n.t('faq_q5'), a: i18n.t('faq_a5') },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('help')}</Text>
        <Text style={styles.headerSubtitle}>{i18n.t('we_help_247')}</Text>
      </View>

      {/* Contact options */}
      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('tel:+255700000000')}>
          <Text style={styles.contactEmoji}>📞</Text>
          <Text style={styles.contactLabel}>{i18n.t('call_us')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('https://wa.me/255700000000')}>
          <Text style={styles.contactEmoji}>💬</Text>
          <Text style={styles.contactLabel}>{i18n.t('whatsapp')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('mailto:support@safiriharaka.com')}>
          <Text style={styles.contactEmoji}>✉️</Text>
          <Text style={styles.contactLabel}>{i18n.t('email')}</Text>
        </TouchableOpacity>
      </View>

      {/* FAQs */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>{i18n.t('faq')}</Text>
        {faqs.map((faq, i) => (
          <View key={i} style={styles.faqCard}>
            <Text style={styles.faqQ}>{faq.q}</Text>
            <Text style={styles.faqA}>{faq.a}</Text>
          </View>
        ))}
      </View>

      {/* Emergency */}
      <TouchableOpacity style={styles.emergencyBtn}>
        <Text style={styles.emergencyText}>🆘 {i18n.t('emergency_call')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a73e8', padding: 24, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#e3f2fd', marginTop: 4 },
  contactRow: { flexDirection: 'row', margin: 16, justifyContent: 'space-between' },
  contactCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4, elevation: 1 },
  contactEmoji: { fontSize: 26, marginBottom: 6 },
  contactLabel: { fontSize: 12, color: '#666' },
  faqSection: { marginHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  faqCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#333' },
  faqA: { fontSize: 13, color: '#666', marginTop: 6, lineHeight: 18 },
  emergencyBtn: { margin: 16, padding: 14, borderRadius: 10, backgroundColor: '#fce4ec', alignItems: 'center' },
  emergencyText: { color: '#c62828', fontSize: 15, fontWeight: '600' },
});
