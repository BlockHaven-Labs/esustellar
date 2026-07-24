import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../context/ThemeContext';
import {
  changeLanguage,
  getLanguage,
  languageOptions,
  loadLanguage,
  type SupportedLanguage,
} from '../../constants/i18n';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<SupportedLanguage>(getLanguage());

  useEffect(() => {
    void loadLanguage().then(setSelected);
  }, []);

  const handleSelect = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
    setSelected(lang);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.language')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {t('settings.languageLabel')}
        </Text>

        <View style={[styles.list, { borderColor: colors.border }]}>
          {languageOptions.map((opt, index) => {
            const isSelected = selected === opt.value;
            const isLast = index === languageOptions.length - 1;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleSelect(opt.value)}
                style={[
                  styles.row,
                  { borderColor: colors.border },
                  !isLast && styles.rowBorder,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.label, { color: colors.text }]}>
                  {opt.label}
                </Text>
                {isSelected && (
                  <Text style={[styles.checkmark, { color: colors.accent }]}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  list: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16 },
  checkmark: { fontSize: 18, fontWeight: '700' },
});
