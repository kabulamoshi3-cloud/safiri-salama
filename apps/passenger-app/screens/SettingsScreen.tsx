import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n, { Language } from '../i18n';

export default function SettingsScreen() {
  const [language, setLanguage] = useState<Language>(i18n.getLanguage());
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const changeLanguage = async (lang: Language) => {
    setLanguage(lang);
    await i18n.setLanguage(lang);
    Alert.alert(lang === 'sw' ? 'Lugha imebadilishwa' : 'Language changed', lang === 'sw' ? 'Kiswahili kimechaguliwa' : 'English selected');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Language */}
      <Text style={styles.sectionTitle}>{i18n.t('language')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={[styles.langRow, language === 'en' && styles.langActive]} onPress={() => changeLanguage('en')}>
          <Text style={styles.langFlag}>🇬🇧</Text>
          <Text style={styles.langText}>English</Text>
          {language === 'en' && <Ionicons name="checkmark-circle" size={20} color="#34c759" />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langRow, language === 'sw' && styles.langActive]} onPress={() => changeLanguage('sw')}>
          <Text style={styles.langFlag}>🇹🇿</Text>
          <Text style={styles.langText}>Kiswahili</Text>
          {language === 'sw' && <Ionicons name="checkmark-circle" size={20} color="#34c759" />}
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>{i18n.t('notifications')}</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Push Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#34c759' }} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>SMS Alerts</Text>
          <Switch value={true} trackColor={{ true: '#34c759' }} />
        </View>
      </View>

      {/* Safety */}
      <Text style={styles.sectionTitle}>{i18n.t('safety')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="call-outline" size={20} color="#ff3b30" />
          <Text style={styles.menuText}>Emergency Contacts</Text>
          <Ionicons name="chevron-forward" size={18} color="#ddd" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#007aff" />
          <Text style={styles.menuText}>Share Trip</Text>
          <Ionicons name="chevron-forward" size={18} color="#ddd" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="warning-outline" size={20} color="#ff9500" />
          <Text style={styles.menuText}>SOS Button</Text>
          <Ionicons name="chevron-forward" size={18} color="#ddd" />
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>{i18n.t('about')}</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>{i18n.t('legal')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#ddd" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>{i18n.t('version')} 1.0.0</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#8e8e93', marginBottom: 8, marginTop: 12, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 6, elevation: 1 },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  langActive: { backgroundColor: '#f0fdf4' },
  langFlag: { fontSize: 22, marginRight: 12 },
  langText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1c1c1e' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  switchLabel: { fontSize: 15, color: '#1c1c1e' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuText: { flex: 1, fontSize: 15, color: '#1c1c1e', marginLeft: 12 },
});
