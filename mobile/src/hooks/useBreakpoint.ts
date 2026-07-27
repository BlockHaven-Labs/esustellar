import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

// Reference sizes (dp)
const BREAKPOINTS = {
  tablet: 600,   // ≥ 600 dp = tablet (iPad mini and up, Android tablets)
  desktop: 1024, // ≥ 1024 dp = large tablet / desktop
} as const;

export interface BreakpointInfo {
  breakpoint: Breakpoint;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True for tablet AND desktop — use for non-phone layouts */
  isTabletOrLarger: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
}

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  let breakpoint: Breakpoint = 'phone';
  if (width >= BREAKPOINTS.desktop) breakpoint = 'desktop';
  else if (width >= BREAKPOINTS.tablet) breakpoint = 'tablet';

  return {
    breakpoint,
    isPhone: breakpoint === 'phone',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isTabletOrLarger: breakpoint !== 'phone',
    width,
    height,
    isLandscape: width > height,
  };
}