'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
  DEFAULT_DND_SETTINGS,
  DndSettings,
  isValidTimeString,
  loadDndSettings,
  saveDndSettings,
} from '../../services/notifications/dndService';

// ─── Tiny time-picker ────────────────────────────────────────────────────────
// The app has no third-party time-picker dependency, so we use a minimal
// spinner-style stepper that matches the pill / section patterns in the rest
// of the settings screens.

type TimePickerProps = {
  label: string;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  disabled?: boolean;
};

function TimePicker({ label, value, onChange, colors, disabled = false }: TimePickerProps) {
  const [h, m] = value.split(':').map(Number);

  const step = (field: 'h' | 'm', delta: number) => {
    if (disabled) return;
    const newH = field === 'h' ? ((h + delta + 24) % 24) : h;
    const newM = field === 'm' ? ((m + delta + 60) % 60) : m;
    onChange(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const opacity = disabled ? 0.4 : 1;

  return (
    <View style={[pickerStyles.wrapper, { opacity }]}>
      <Text style={[pickerStyles.label, { color: colors.subtext }]}>{label}</Text>

      <View style={pickerStyles.row}>
        {/* Hours */}
        <View style={pickerStyles.field}>
          <TouchableOpacity
            onPress={() => step('h', 1)}
            style={[pickerStyles.btn, { borderColor: colors.border }]}
            accessibilityLabel={`Increase ${label} hour`}
            accessibilityRole="button"
          >
            <Text style={[pickerStyles.arrow, { color: colors.accent }]}>▲</Text>
          </TouchableOpacity>

          <Text style={[pickerStyles.value, { color: colors.text }]}>
            {String(h).padStart(2, '0')}
          </Text>

          <TouchableOpacity
            onPress={() => step('h', -1)}
            style={[pickerStyles.btn, { borderColor: colors.border }]}
            accessibilityLabel={`Decrease ${label} hour`}
            accessibilityRole="button"
          >
            <Text style={[pickerStyles.arrow, { color: colors.accent }]}>▼</Text>
          </TouchableOpacity>
        </View>

        <Text style={[pickerStyles.colon, { color: colors.text }]}>:</Text>

        {/* Minutes */}
        <View style={pickerStyles.field}>
          <TouchableOpacity
            onPress={() => step('m', 1)}
            style={[pickerStyles.btn, { borderColor: colors.border }]}
            accessibilityLabel={`Increase ${label} minute`}
            accessibilityRole="button"
          >
            <Text style={[pickerStyles.arrow, { color: colors.accent }]}>▲</Text>
          </TouchableOpacity>

          <Text style={[pickerStyles.value, { color: colors.text }]}>
            {String(m).padStart(2, '0')}
          </Text>

          <TouchableOpacity
            onPress={() => step('m', -1)}
            style={[pickerStyles.btn, { borderColor: colors.border }]}
            accessibilityLabel={`Decrease ${label} minute`}
            accessibilityRole="button"
          >
            <Text style={[pickerStyles.arrow, { color: colors.accent }]}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    borderWidth: 1,
    borderRadius: 6,
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
  colon: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format "HH:MM" → "h:MM AM/PM" for the summary line. */
function formatTime12h(hhmm: string): string {
  if (!isValidTimeString(hhmm)) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();

  const [settings, setSettings] = useState<DndSettings>(DEFAULT_DND_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    void loadDndSettings().then((loaded) => {
      setSettings(loaded);
      setLoading(false);
    });
  }, []);

  // ── Persist on every change ───────────────────────────────────────────────

  const persist = useCallback(async (next: DndSettings) => {
    setSettings(next);
    await saveDndSettings(next);

    // Brief "Saved" feedback
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, []);

  const handleToggle = (value: boolean) => {
    void persist({ ...settings, enabled: value });
  };

  const handleStartTime = (value: string) => {
    void persist({ ...settings, startTime: value });
  };

  const handleEndTime = (value: string) => {
    void persist({ ...settings, endTime: value });
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const summaryText = settings.enabled
    ? `Notifications muted from ${formatTime12h(settings.startTime)} to ${formatTime12h(settings.endTime)}`
    : 'You will receive notifications at any time.';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, padding: 16 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={[styles.title, { color: colors.text }]}>
          Notification Settings
        </Text>

        {/* ── DND master toggle ─────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Do Not Disturb
              </Text>
              <Text style={[styles.helper, { color: colors.subtext }]}>
                Mute notifications during quiet hours
              </Text>
            </View>

            <Switch
              value={settings.enabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Do Not Disturb toggle"
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.enabled }}
            />
          </View>
        </View>

        {/* ── Quiet hours ───────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quiet Hours
          </Text>
          <Text style={[styles.helper, { color: colors.subtext }]}>
            {summaryText}
          </Text>

          <View style={styles.pickersRow}>
            <TimePicker
              label="Start time"
              value={settings.startTime}
              onChange={handleStartTime}
              colors={colors}
              disabled={!settings.enabled}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TimePicker
              label="End time"
              value={settings.endTime}
              onChange={handleEndTime}
              colors={colors}
              disabled={!settings.enabled}
            />
          </View>

          {/* Overnight hint */}
          {settings.enabled &&
            settings.startTime > settings.endTime && (
              <View style={[styles.hint, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '44' }]}>
                <Text style={[styles.hintText, { color: colors.accent }]}>
                  ☽ Overnight window — ends the following morning
                </Text>
              </View>
            )}
        </View>

        {/* ── Save feedback ─────────────────────────────────────────────── */}
        {saved && (
          <Text style={[styles.savedBadge, { color: colors.accent }]}>
            ✓ Settings saved
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    gap: 2,
  },
  pickersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginTop: 20,
  },
  hint: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  hintText: {
    fontSize: 13,
  },
  savedBadge: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});
