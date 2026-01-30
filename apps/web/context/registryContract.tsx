'use client'

import * as React from 'react'
import {
  Contract,
  xdr,
  scValToNative,
  nativeToScVal,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  Account,
} from '@stellar/stellar-sdk'
import { useWallet } from '@/hooks/use-wallet'
import { SOROBAN_NETWORK_PASSPHRASE, SOROBAN_RPC_URL } from '@/config/walletConfig'

export interface GroupInfo {
  contract_address: string
  group_id: string
  name: string
  admin: string
  is_public: boolean
  created_at: number
  total_members: number
}

export interface RegistryContractContextValue {
  getUserGroups: (userAddress: string) => Promise<string[]>
  getGroupInfo: (contractAddress: string) => Promise<GroupInfo>
  getAllPublicGroups: () => Promise<GroupInfo[]>
  getAllGroups: () => Promise<string[]>
  getGroupCount: () => Promise<number>
  contractId: string
  isReady: boolean
  error: string | null
}

const RegistryContractContext = React.createContext<RegistryContractContextValue | undefined>(undefined)

export function RegistryContractProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet()
  const contractId = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID || ''
  const [error, setError] = React.useState<string | null>(null)

  const isReady = !!contractId && !!SOROBAN_RPC_URL
  
  const server = React.useMemo(() => new rpc.Server(SOROBAN_RPC_URL, { allowHttp: true }), [])

  const simulateCall = React.useCallback(async (method: string, ...args: xdr.ScVal[]): Promise<xdr.ScVal> => {
    const source = wallet.publicKey || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
    const contract = new Contract(contractId)
    
    const sourceAccount = new Account(source, "0")

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build()

    const result = await server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(result)) throw new Error(result.error)
    if (!result.result) throw new Error('Simulation result empty')
    return result.result.retval
  }, [wallet.publicKey, contractId, server])

  const getUserGroups = React.useCallback(async (userAddress: string): Promise<string[]> => {
    const res = await simulateCall('get_user_groups', nativeToScVal(userAddress, { type: 'address' }))
    return scValToNative(res) as string[]
  }, [simulateCall])

  const getGroupInfo = React.useCallback(async (contractAddress: string): Promise<GroupInfo> => {
    const res = await simulateCall('get_group_info', nativeToScVal(contractAddress, { type: 'address' }))
    return scValToNative(res) as GroupInfo
  }, [simulateCall])

  const getAllPublicGroups = React.useCallback(async (): Promise<GroupInfo[]> => {
    const res = await simulateCall('get_all_public_groups')
    return scValToNative(res) as GroupInfo[]
  }, [simulateCall])

  const getAllGroups = React.useCallback(async (): Promise<string[]> => {
    const res = await simulateCall('get_all_groups')
    return scValToNative(res) as string[]
  }, [simulateCall])

  const getGroupCount = React.useCallback(async (): Promise<number> => {
    const res = await simulateCall('get_group_count')
    return scValToNative(res) as number
  }, [simulateCall])

  const value = React.useMemo(() => ({
    getUserGroups,
    getGroupInfo,
    getAllPublicGroups,
    getAllGroups,
    getGroupCount,
    contractId,
    isReady,
    error
  }), [
    getUserGroups,
    getGroupInfo,
    getAllPublicGroups,
    getAllGroups,
    getGroupCount,
    contractId,
    isReady,
    error
  ])

  return <RegistryContractContext.Provider value={value}>{children}</RegistryContractContext.Provider>
}

export const useRegistryContract = () => {
  const ctx = React.useContext(RegistryContractContext)
  if (!ctx) throw new Error('useRegistryContract must be used within RegistryContractProvider')
  return ctx
}