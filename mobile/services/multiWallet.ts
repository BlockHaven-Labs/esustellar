/**
 * multiWallet.ts
 * Manages multiple Stellar wallets: storage, CRUD, and active-wallet selection.
 * Persists to AsyncStorage so the selected wallet survives app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletEntry {
  id: string;           // UUID
  label: string;        // user-facing name e.g. "Main wallet"
  publicKey: string;    // Stellar public key (G...)
  /** Never store the secret key in plaintext — store an encrypted blob and
   *  decrypt it with the device keychain when needed for signing. */
  encryptedSecret: string;
  createdAt: string;    // ISO
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const WALLETS_KEY = 'multiWallet:list';
const ACTIVE_KEY  = 'multiWallet:activeId';

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function readWallets(): Promise<WalletEntry[]> {
  const raw = await AsyncStorage.getItem(WALLETS_KEY);
  return raw ? (JSON.parse(raw) as WalletEntry[]) : [];
}

async function writeWallets(wallets: WalletEntry[]): Promise<void> {
  await AsyncStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Return all stored wallets, ordered by creation date ascending. */
export async function getAllWallets(): Promise<WalletEntry[]> {
  return readWallets();
}

/** Return the currently active wallet, or null if none stored. */
export async function getActiveWallet(): Promise<WalletEntry | null> {
  const [wallets, activeId] = await Promise.all([
    readWallets(),
    AsyncStorage.getItem(ACTIVE_KEY),
  ]);
  if (!wallets.length) return null;
  return wallets.find((w: any) => w.id === activeId) ?? wallets[0];
}

/**
 * Add a new wallet. Automatically makes it active if it's the first one.
 * @returns the newly created WalletEntry
 */
export async function addWallet(
  label: string,
  publicKey: string,
  encryptedSecret: string,
): Promise<WalletEntry> {
  const wallets = await readWallets();

  const newWallet: WalletEntry = {
    id: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label,
    publicKey,
    encryptedSecret,
    createdAt: new Date().toISOString(),
  };

  wallets.push(newWallet);
  await writeWallets(wallets);

  if (wallets.length === 1) {
    // First wallet — set as active automatically
    await AsyncStorage.setItem(ACTIVE_KEY, newWallet.id);
  }

  return newWallet;
}

/** Switch the active wallet instantly. Throws if id not found. */
export async function setActiveWallet(id: string): Promise<void> {
  const wallets = await readWallets();
  if (!wallets.find((w) => w.id === id)) {
    throw new Error(`Wallet ${id} not found`);
  }
  await AsyncStorage.setItem(ACTIVE_KEY, id);
}

/** Update a wallet's label. */
export async function renameWallet(id: string, newLabel: string): Promise<void> {
  const wallets = await readWallets();
  const idx = wallets.findIndex((w) => w.id === id);
  if (idx === -1) throw new Error(`Wallet ${id} not found`);
  wallets[idx].label = newLabel;
  await writeWallets(wallets);
}

/**
 * Remove a wallet. If it was active, the next wallet in the list becomes active
 * (or active is cleared if no wallets remain).
 */
export async function removeWallet(id: string): Promise<void> {
  let wallets = await readWallets();
  const activeId = await AsyncStorage.getItem(ACTIVE_KEY);

  wallets = wallets.filter((w) => w.id !== id);
  await writeWallets(wallets);

  if (activeId === id) {
    if (wallets.length > 0) {
      await AsyncStorage.setItem(ACTIVE_KEY, wallets[0].id);
    } else {
      await AsyncStorage.removeItem(ACTIVE_KEY);
    }
  }
}