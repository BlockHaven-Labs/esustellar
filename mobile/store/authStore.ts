import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

// ── Types ───────────────────────────────────────────────────────────────────

export interface WalletInfo {
  publicKey: string;
  walletType: string;
}

export interface SessionState {
  isActive: boolean;
  connectedAt: string | null;
}

export type ColorSchemePreference = 'dark' | 'light' | 'system';

export interface AuthState {
  /** Details of the currently connected wallet */
  wallet: WalletInfo | null;
  /** Current session information */
  session: SessionState;
  /** Preferred app color scheme */
  colorScheme: ColorSchemePreference;

  // ── Actions ─────────────────────────────────────────────────────────────

  /** Persist wallet details after a successful connection */
  setWallet: (wallet: WalletInfo) => void;
  /** Update session state (e.g. mark active / set timestamp) */
  setSession: (session: Partial<SessionState>) => void;
  /** Convenience: mark the user as fully authenticated */
  login: (wallet: WalletInfo) => void;
  /** Update the preferred app color scheme */
  setColorScheme: (colorScheme: ColorSchemePreference) => void;
  /** Log out – clears wallet & resets session */
  logout: () => void;
}

// ── Initial state ───────────────────────────────────────────────────────────

const initialSession: SessionState = {
  isActive: false,
  connectedAt: null,
};

// ── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      wallet: null,
      session: { ...initialSession },
      colorScheme: 'system',

      setWallet: (wallet) => set({ wallet }),

      setSession: (partial) =>
        set((state) => ({
          session: { ...state.session, ...partial },
        })),

      login: (wallet) =>
        set({
          wallet,
          session: {
            isActive: true,
            connectedAt: new Date().toISOString(),
          },
        }),

      setColorScheme: (colorScheme) => set({ colorScheme }),

      logout: () =>
        set({
          wallet: null,
          session: { ...initialSession },
        }),
    }),
    {
      name: 'esustellar-auth',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
