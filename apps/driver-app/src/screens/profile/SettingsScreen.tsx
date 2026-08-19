import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import i18n from '../../i18n';

const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('profile.language')}
        </Text>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => changeLanguage('en')}
        >
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            English
          </Text>
          {i18n.language === 'en' && (
            <Icon name="check" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => changeLanguage('sw')}
        >
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Kiswahili
          </Text>
          {i18n.language === 'sw' && (
            <Icon name="check" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Notifications
        </Text>
        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Enable Notifications
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Appearance
        </Text>
        <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Dark Mode
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  settingText: {
    fontSize: 16,
  },
});

export default SettingsScreen;
