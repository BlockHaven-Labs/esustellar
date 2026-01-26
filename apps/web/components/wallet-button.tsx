"use client"

import * as React from "react"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"

const DEFAULT_ADDRESS_SLICE = 4

function shortenAddress(address: string, prefix = DEFAULT_ADDRESS_SLICE, suffix = DEFAULT_ADDRESS_SLICE) {
  if (address.length <= prefix + suffix) {
    return address
  }
  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`
}

export type WalletButtonProps = React.ComponentProps<typeof Button> & {
  showIcon?: boolean
}

// UI-only wallet control; all connection logic stays in wallet context.
export function WalletButton({ showIcon = true, onClick, type = "button", ...props }: WalletButtonProps) {
  const {
    publicKey,
    isConnected,
    isConnecting,
    hasFreighter,
    error,
    walletNetworkPassphrase,
    isOnAllowedNetwork,
    connect,
    disconnect,
  } = useWallet()

  const showWrongNetwork = isConnected && !isOnAllowedNetwork
  const displayAddress = publicKey ? shortenAddress(publicKey) : null

  let label = "Connect Wallet"
  if (!hasFreighter) {
    label = "Install Freighter"
  } else if (isConnecting) {
    label = "Connecting..."
  } else if (showWrongNetwork) {
    label = "Wrong Network"
  } else if (isConnected && displayAddress) {
    label = displayAddress
  } else if (error) {
    label = error
  }

  const title = !hasFreighter
    ? "Freighter extension not detected"
    : showWrongNetwork
      ? `Switch Freighter to the expected network. Current: ${walletNetworkPassphrase ?? "Unknown"}`
      : error ?? undefined

  const isDisabled = props.disabled || isConnecting || !hasFreighter

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || isDisabled) {
      return
    }

    if (isConnected) {
      disconnect()
      return
    }

    await connect()
  }

  return (
    <Button
      {...props}
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={isConnecting || undefined}
      title={title}
    >
      {showIcon ? <Wallet className="mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  )
}
