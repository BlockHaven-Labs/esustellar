import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  KillSwitch,
  KillSwitchKey,
  DEFAULT_KILL_SWITCHES,
  fetchKillSwitches,
  isFeatureEnabled,
  getDisabledMessage,
} from '../services/killSwitch'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

type KillSwitchState = {
  switches: KillSwitch[]
  lastFetchedAt: number | null
  isFetching: boolean
  pollingHandle: ReturnType<typeof setInterval> | null

  // Actions
  hydrate: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  isEnabled: (key: KillSwitchKey) => boolean
  disabledMessage: (key: KillSwitchKey) => string
}

export const useKillSwitchStore = create<KillSwitchState>()(
  persist(
    (set, get) => ({
      switches: DEFAULT_KILL_SWITCHES,
      lastFetchedAt: null,
      isFetching: false,
      pollingHandle: null,

      hydrate: async () => {
        if (get().isFetching) return
        set({ isFetching: true })
        try {
          const switches = await fetchKillSwitches()
          set({ switches, lastFetchedAt: Date.now() })
        } finally {
          set({ isFetching: false })
        }
      },

      startPolling: () => {
        const existing = get().pollingHandle
        if (existing !== null) return // already polling

        // Fetch immediately, then on interval
        void get().hydrate()
        const handle = setInterval(() => {
          void get().hydrate()
        }, POLL_INTERVAL_MS)

        set({ pollingHandle: handle })
      },

      stopPolling: () => {
        const handle = get().pollingHandle
        if (handle !== null) {
          clearInterval(handle)
          set({ pollingHandle: null })
        }
      },

      isEnabled: (key: KillSwitchKey) => isFeatureEnabled(get().switches, key),

      disabledMessage: (key: KillSwitchKey) => getDisabledMessage(get().switches, key),
    }),
    {
      name: 'esustellar-kill-switches',
      storage: createJSONStorage(() => AsyncStorage),
      // Do not persist runtime-only fields
      partialize: (state) => ({
        switches: state.switches,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
)
