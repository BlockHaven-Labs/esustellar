"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"

interface WalletContextType {
  isConnected: boolean
  address: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)

  const isConnected = !!address

  const connect = async () => {
    if (!(window as any).freighterApi) {
      alert("Freighter wallet not detected")
      return
    }

    try {
      const publicKey = await (window as any).freighterApi.getPublicKey()
      setAddress(publicKey)
    } catch (err) {
      console.error("Wallet connection failed", err)
    }
  }

  const disconnect = () => {
    setAddress(null)
  }

  // Optional: restore session
  useEffect(() => {
    const cached = localStorage.getItem("wallet:address")
    if (cached) setAddress(cached)
  }, [])

  useEffect(() => {
    if (address) {
      localStorage.setItem("wallet:address", address)
    } else {
      localStorage.removeItem("wallet:address")
    }
  }, [address])

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider")
  }
  return ctx
}
