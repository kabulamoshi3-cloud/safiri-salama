import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';

export default function SupportScreen() {
  const faqs = [
    { q: 'How do I book a ride?', a: 'Open the app, enter destination, choose vehicle, and confirm.' },
    { q: 'How do I pay?', a: 'You can pay with Cash, M-Pesa, Tigo Pesa, or Airtel Money.' },
    { q: 'How do I become a driver?', a: 'Register as a driver, submit your documents, and start earning.' },
    { q: 'How do I cancel a trip?', a: 'Tap "Cancel Trip" before the driver starts the trip. Cancellation may incur a fee.' },
    { q: 'How do I report an issue?', a: 'Go to trip history, select the trip, and tap "Report Issue".' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <Text style={styles.headerSubtitle}>We're here to help 24/7</Text>
      </View>

      {/* Contact options */}
      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('tel:+255700000000')}>
          <Text style={styles.contactEmoji}>📞</Text>
          <Text style={styles.contactLabel}>Call Us</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('https://wa.me/255700000000')}>
          <Text style={styles.contactEmoji}>💬</Text>
          <Text style={styles.contactLabel}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('mailto:support@dalasmart.com')}>
          <Text style={styles.contactEmoji}>✉️</Text>
          <Text style={styles.contactLabel}>Email</Text>
        </TouchableOpacity>
      </View>

      {/* FAQs */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map((faq, i) => (
          <View key={i} style={styles.faqCard}>
            <Text style={styles.faqQ}>{faq.q}</Text>
            <Text style={styles.faqA}>{faq.a}</Text>
          </View>
        ))}
      </View>

      {/* Emergency */}
      <TouchableOpacity style={styles.emergencyBtn}>
        <Text style={styles.emergencyText}>🆘 Emergency? Call 112</Text>
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
