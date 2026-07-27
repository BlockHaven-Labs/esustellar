import AsyncStorage from '@react-native-async-storage/async-storage'
import { env } from '../config/env'

// ── Kill switch keys ──────────────────────────────────────────────────────────

export type KillSwitchKey =
  | 'contributions'
  | 'group-creation'
  | 'wallet-transfers'
  | 'notifications'

export type KillSwitch = {
  key: KillSwitchKey
  title: string
  description: string
  enabled: boolean         // true = feature is live; false = feature is off
  disabledMessage: string  // shown to the user when the feature is off
}

// Safe defaults -- all features on. Used when remote fetch fails and no cache exists.
export const DEFAULT_KILL_SWITCHES: KillSwitch[] = [
  {
    key: 'contributions',
    title: 'Contributions',
    description: 'Ability to make contributions to savings groups.',
    enabled: true,
    disabledMessage: 'Contributions are temporarily unavailable. Please try again later.',
  },
  {
    key: 'group-creation',
    title: 'Group Creation',
    description: 'Ability to create new savings groups.',
    enabled: true,
    disabledMessage: 'Group creation is temporarily unavailable. Please try again later.',
  },
  {
    key: 'wallet-transfers',
    title: 'Wallet Transfers',
    description: 'Ability to transfer funds between wallets.',
    enabled: true,
    disabledMessage: 'Wallet transfers are temporarily unavailable. Please try again later.',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Push and in-app notification delivery.',
    enabled: true,
    disabledMessage: 'Notifications are temporarily unavailable. Please try again later.',
  },
]

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'esustellar:kill-switches'

export async function loadCachedKillSwitches(): Promise<KillSwitch[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as KillSwitch[]) : null
  } catch {
    return null
  }
}

export async function cacheKillSwitches(switches: KillSwitch[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(switches))
  } catch {
    // Cache failure must never crash the app
  }
}

// ── Remote fetch ──────────────────────────────────────────────────────────────

// Merges remote payload into defaults so unknown keys never break the client.
function mergeWithDefaults(remote: Partial<Record<KillSwitchKey, boolean>>): KillSwitch[] {
  return DEFAULT_KILL_SWITCHES.map((sw) => {
    if (Object.prototype.hasOwnProperty.call(remote, sw.key)) {
      return { ...sw, enabled: remote[sw.key] as boolean }
    }
    return sw
  })
}

export async function fetchKillSwitches(): Promise<KillSwitch[]> {
  try {
    const res = await fetch(`${env.API_URL}/config/kill-switches`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const remote = (await res.json()) as Partial<Record<KillSwitchKey, boolean>>
    const merged = mergeWithDefaults(remote)
    await cacheKillSwitches(merged)
    return merged
  } catch {
    // Remote fetch failed -- try cache, then fall back to safe defaults
    const cached = await loadCachedKillSwitches()
    return cached ?? DEFAULT_KILL_SWITCHES
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isFeatureEnabled(switches: KillSwitch[], key: KillSwitchKey): boolean {
  const sw = switches.find((s) => s.key === key)
  return sw ? sw.enabled : true // default to enabled if key not found
}

export function getDisabledMessage(switches: KillSwitch[], key: KillSwitchKey): string {
  const sw = switches.find((s) => s.key === key)
  return sw?.disabledMessage ?? 'This feature is temporarily unavailable.'
}
