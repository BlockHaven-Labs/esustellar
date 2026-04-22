'use client'

import { useState } from 'react'
import { useSavingsContract } from '@/context/savingsContract'
import { useRegistryContract } from '@/context/registryContract'
import { useWallet } from '@/hooks/use-wallet'

type JoinStep = 'idle' | 'joining' | 'registering' | 'done' | 'error'

interface UseJoinGroupReturn {
  join: (groupId: string) => Promise<void>
  step: JoinStep
  isLoading: boolean
  error: string | null
  reset: () => void
}

/**
 * Handles the two-step join flow:
 * 1. Call join_group on the savings contract
 * 2. Call add_member on the registry contract
 *
 * Both steps must succeed for the user to be properly discoverable.
 * On registry failure, we retry once automatically before surfacing an error.
 */
export function useJoinGroup(): UseJoinGroupReturn {
  const { publicKey } = useWallet()
  const savings = useSavingsContract()
  const registry = useRegistryContract()

  const [step, setStep] = useState<JoinStep>('idle')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStep('idle')
    setError(null)
  }

  const join = async (groupId: string) => {
    if (!publicKey) {
      setError('Wallet not connected')
      return
    }

    setError(null)

    // ── Step 1: Join group on savings contract ────────────────
    try {
      setStep('joining')
      await savings.joinGroup(groupId)
    } catch (err: any) {
      console.error('join_group failed:', err)
      setError(err.message || 'Failed to join group. Please try again.')
      setStep('error')
      return
    }

    // ── Step 2: Register membership in registry ───────────────
    // The savings contract address is the contract_address key in the registry
    const savingsContractAddress = process.env.NEXT_PUBLIC_SAVINGS_CONTRACT_ID!

    const attemptRegister = () =>
      registry.addMember(savingsContractAddress, publicKey)

    try {
      setStep('registering')
      await attemptRegister()
    } catch (firstErr) {
      console.warn('add_member failed on first attempt, retrying...', firstErr)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      try {
        await attemptRegister()
      } catch (retryErr: any) {
        console.error('add_member failed after retry:', retryErr)
        // User HAS joined on-chain — make that clear in the error
        setError(
          `You have joined the group on-chain, but your membership could not be registered ` +
          `for the "My Groups" view. Please contact support with group ID: ${groupId}`
        )
        setStep('error')
        return
      }
    }

    setStep('done')
  }

  return {
    join,
    step,
    isLoading: step === 'joining' || step === 'registering',
    error,
    reset,
  }
}