// Wallet + network primitives only; UI and contract layers should consume via hooks/context.

export const SOROBAN_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org"

const NETWORK_PASSPHRASES = {
  TESTNET: "Test SDF Network ; September 2015",
  PUBLIC: "Public Global Stellar Network ; September 2015",
  FUTURENET: "Test SDF Future Network ; October 2022",
} as const

type FreighterApi = {
  isConnected?: () => Promise<boolean>
  getPublicKey?: () => Promise<string>
  requestAccess?: () => Promise<string>
  signTransaction?: (txXdr: string, opts: { networkPassphrase: string }) => Promise<string>
  getNetwork?: () => Promise<string>
  getNetworkDetails?: () => Promise<{ network?: string; networkPassphrase?: string }>
}

function getFreighterApi(): FreighterApi | null {
  if (typeof window === "undefined") {
    return null
  }

  const api = (window as Window & { freighterApi?: FreighterApi }).freighterApi
  return api ?? null
}

export function isFreighterInstalled(): boolean {
  return !!getFreighterApi()
}

export async function getFreighterNetworkPassphrase(): Promise<string | null> {
  const api = getFreighterApi()
  if (!api) {
    return null
  }

  if (api.getNetworkDetails) {
    try {
      const details = await api.getNetworkDetails()
      if (details?.networkPassphrase) {
        return details.networkPassphrase
      }
    } catch {
      // Ignore and fall back to other network helpers.
    }
  }

  if (api.getNetwork) {
    try {
      const network = await api.getNetwork()
      if (!network) {
        return null
      }
      const normalized = network.toUpperCase()
      return NETWORK_PASSPHRASES[normalized as keyof typeof NETWORK_PASSPHRASES] ?? network
    } catch {
      return null
    }
  }

  return null
}

export async function connectWallet(): Promise<string> {
  const api = getFreighterApi()
  if (!api) {
    throw new Error("Freighter not installed")
  }

  if (api.requestAccess) {
    return api.requestAccess()
  }

  const connected = await api.isConnected?.()
  if (!connected) {
    throw new Error("Freighter not connected")
  }

  if (!api.getPublicKey) {
    throw new Error("Freighter unavailable")
  }

  return api.getPublicKey()
}

export async function getWalletPublicKey(): Promise<string> {
  const api = getFreighterApi()
  if (!api) {
    throw new Error("Freighter not installed")
  }

  if (api.isConnected) {
    const connected = await api.isConnected()
    if (!connected) {
      throw new Error("Freighter not connected")
    }
  }

  if (!api.getPublicKey) {
    throw new Error("Freighter unavailable")
  }

  return api.getPublicKey()
}

export async function signWithFreighter(txXdr: string): Promise<string> {
  const api = getFreighterApi()
  if (!api?.signTransaction) {
    throw new Error("Freighter not installed")
  }

  return api.signTransaction(txXdr, {
    networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
  })
}
