import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { Language } from '../i18n';

const countries = [
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', prefix: '+255' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', prefix: '+254' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', prefix: '+256' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', prefix: '+250' },
  { code: 'CD', name: 'Congo DR', flag: '🇨🇩', prefix: '+243' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', prefix: '+265' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', prefix: '+258' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', prefix: '+234' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', prefix: '+27' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', prefix: '+233' },
];

const languages = [
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  { code: 'sw' as Language, name: 'Kiswahili', flag: '🇹🇿' },
];

export default function CountryLanguageScreen({ navigation }: any) {
  const [step, setStep] = useState<'country' | 'language'>('country');
  const [selectedCountry, setSelectedCountry] = useState('TZ');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [search, setSearch] = useState('');

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectCountry = (code: string) => {
    setSelectedCountry(code);
    setStep('language');
  };

  const selectLanguage = async (lang: Language) => {
    setSelectedLanguage(lang);
    try {
      await i18n.setLanguage(lang);
      const country = countries.find(c => c.code === selectedCountry);
      await AsyncStorage.setItem('@dalasmart:country', selectedCountry);
      await AsyncStorage.setItem('@dalasmart:phone_prefix', country?.prefix || '+255');
    } catch (e) {
      console.log('Language save error:', e);
    }
    navigation.replace('Onboarding');
  };

  if (step === 'country') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>DalaSmart</Text>
          <Text style={styles.title}>Select your country</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
        </View>

        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.countryRow, selectedCountry === item.code && styles.countrySelected]}
              onPress={() => selectCountry(item.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={styles.countryName}>{item.name}</Text>
              <Text style={styles.prefix}>{item.prefix}</Text>
              {selectedCountry === item.code && (
                <Ionicons name="checkmark-circle" size={22} color="#34c759" />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>DalaSmart</Text>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>Chagua lugha yako</Text>
      </View>

      <View style={styles.languageList}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.languageRow, selectedLanguage === lang.code && styles.languageSelected]}
            onPress={() => selectLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={styles.languageName}>{lang.name}</Text>
            {selectedLanguage === lang.code && (
              <Ionicons name="checkmark-circle" size={22} color="#34c759" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  header: { paddingHorizontal: 24, marginBottom: 24 },
  logo: { fontSize: 28, fontWeight: '800', color: '#34c759', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1c1c1e' },
  subtitle: { fontSize: 16, color: '#8e8e93', marginTop: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 24,
    backgroundColor: '#f2f2f7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1c1c1e' },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: '#f2f2f7',
  },
  countrySelected: { backgroundColor: '#f0fdf4' },
  flag: { fontSize: 28, marginRight: 14 },
  countryName: { flex: 1, fontSize: 17, color: '#1c1c1e', fontWeight: '500' },
  prefix: { fontSize: 15, color: '#8e8e93', marginRight: 10 },
  languageList: { paddingHorizontal: 24, marginTop: 20 },
  languageRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16,
    borderRadius: 14, marginBottom: 12, backgroundColor: '#f2f2f7',
  },
  languageSelected: { backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#34c759' },
  languageName: { flex: 1, fontSize: 18, color: '#1c1c1e', fontWeight: '600' },
});
