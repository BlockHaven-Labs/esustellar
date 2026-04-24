import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ───────────────────────────────────────────────────────────────────

export interface WalletInfo {
  publicKey: string;
  walletType: string;
}

export interface SessionState {
  isActive: boolean;
  connectedAt: string | null;
}

export interface AuthState {
  /** Details of the currently connected wallet */
  wallet: WalletInfo | null;
  /** Current session information */
  session: SessionState;

  // ── Actions ─────────────────────────────────────────────────────────────

  /** Persist wallet details after a successful connection */
  setWallet: (wallet: WalletInfo) => void;
  /** Update session state (e.g. mark active / set timestamp) */
  setSession: (session: Partial<SessionState>) => void;
  /** Convenience: mark the user as fully authenticated */
  login: (wallet: WalletInfo) => void;
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

      setWallet: (wallet) =>
        set({ wallet }),

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

      logout: () =>
        set({
          wallet: null,
          session: { ...initialSession },
        }),
    }),
    {
      name: 'esustellar-auth',
    },
  ),
);
