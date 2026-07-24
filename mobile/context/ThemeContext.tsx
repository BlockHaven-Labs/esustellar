import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ColorSchemePreference, useAuthStore } from '../store/authStore';

export type ResolvedColorScheme = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  accent: string;
}

interface ThemeContextValue {
  colorScheme: ColorSchemePreference;
  resolvedColorScheme: ResolvedColorScheme;
  colors: ThemeColors;
  setColorScheme: (value: ColorSchemePreference) => void;
}

const LIGHT_COLORS: ThemeColors = {
  background: '#FFFFFF',
  card: '#F6F7FB',
  text: '#111827',
  subtext: '#4B5563',
  border: '#D1D5DB',
  accent: '#0EA5E9',
};

const DARK_COLORS: ThemeColors = {
  background: '#0B1220',
  card: '#111B2E',
  text: '#F3F4F6',
  subtext: '#9CA3AF',
  border: '#374151',
  accent: '#38BDF8',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function resolveColorScheme(
  preference: ColorSchemePreference,
  systemScheme: 'dark' | 'light' | null | undefined,
): ResolvedColorScheme {
  if (preference !== 'system') {
    return preference;
  }

  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useAuthStore((state) => state.colorScheme);
  const setColorScheme = useAuthStore((state) => state.setColorScheme);
  const systemScheme = useColorScheme();

  const resolvedColorScheme = resolveColorScheme(colorScheme, systemScheme);

  const colors = resolvedColorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const value = useMemo(
    () => ({
      colorScheme,
      resolvedColorScheme,
      colors,
      setColorScheme,
    }),
    [colorScheme, colors, resolvedColorScheme, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
