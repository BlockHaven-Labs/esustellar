import { Dimensions, PixelRatio } from 'react-native';
import type { Breakpoint } from '../hooks/useBreakpoint';

const BASE_WIDTH = 375; // iPhone 14 base

/** Scale a value relative to screen width, capped at a max. */
export function scaleSize(size: number, maxScale = 1.4): number {
  const { width } = Dimensions.get('window');
  const scale = Math.min(width / BASE_WIDTH, maxScale);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

/** Font scale per breakpoint — larger screens get slightly larger type. */
export const FONT_SCALE: Record<Breakpoint, number> = {
  phone: 1,
  tablet: 1.15,
  desktop: 1.25,
};

/** Spacing scale per breakpoint. */
export const SPACING: Record<Breakpoint, { xs: number; sm: number; md: number; lg: number; xl: number }> = {
  phone:   { xs: 4,  sm: 8,  md: 16, lg: 24, xl: 32 },
  tablet:  { xs: 6,  sm: 12, md: 20, lg: 32, xl: 48 },
  desktop: { xs: 8,  sm: 16, md: 24, lg: 40, xl: 64 },
};

/** Minimum touch target sizes (px) per breakpoint. */
export const TOUCH_TARGET: Record<Breakpoint, number> = {
  phone:   44,
  tablet:  48,
  desktop: 48,
};

/**
 * Returns the number of grid columns appropriate for the current breakpoint.
 * @param breakpoint current breakpoint
 * @param phoneColumns override for phone (default 1)
 * @param tabletColumns override for tablet (default 2)
 * @param desktopColumns override for desktop (default 3)
 */
export function gridColumns(
  breakpoint: Breakpoint,
  phoneColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
): number {
  switch (breakpoint) {
    case 'desktop': return desktopColumns;
    case 'tablet':  return tabletColumns;
    default:        return phoneColumns;
  }
}

/**
 * Returns item width as a fraction string for use with FlatList numColumns.
 * e.g. "49%" for 2 columns with a small gap.
 */
export function columnWidth(columns: number, gapPercent = 1): string {
  const width = (100 - gapPercent * (columns - 1)) / columns;
  return `${width.toFixed(1)}%`;
}