import { resolveColorScheme } from '../context/ThemeContext';

describe('resolveColorScheme', () => {
  it('returns explicit dark and light preferences directly', () => {
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
    expect(resolveColorScheme('light', 'dark')).toBe('light');
  });

  it('uses dark system scheme when preference is system', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
  });

  it('defaults to light when system scheme is light or unavailable', () => {
    expect(resolveColorScheme('system', 'light')).toBe('light');
    expect(resolveColorScheme('system', null)).toBe('light');
    expect(resolveColorScheme('system', undefined)).toBe('light');
  });
});
