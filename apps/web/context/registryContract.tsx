'use client'

import * as React from 'react'
import {
  Contract,
  Account,
  xdr,
  scValToNative,
  nativeToScVal,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  Keypair,
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

type Ctx = {
  getUserGroups(user: string): Promise<string[]>
  getGroupInfo(addr: string): Promise<GroupInfo>
  getAllPublicGroups(): Promise<GroupInfo[]>
  getGroupCount(): Promise<number>
  registerGroup(...args: any[]): Promise<void>
  addMember(contractAddress: string, member: string): Promise<void>
  contractId: string
  isReady: boolean
  error: string | null
  loading: boolean
}

const RegistryContractContext = React.createContext<Ctx | undefined>(undefined)

export function RegistryContractProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet()
  
  const contractId = process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID || ''
  const server = React.useMemo(() => new rpc.Server(SOROBAN_RPC_URL), [])
  const contract = React.useMemo(() => new Contract(contractId), [contractId])

  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const isReady = !!contractId

  const simulate = React.useCallback(async (method: string, args: xdr.ScVal[] = []) => {
    try {
      setLoading(true)
      setError(null)

      const sourceKey = wallet.publicKey ?? Keypair.random().publicKey()
      const account = new Account(sourceKey, '0')

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build()

      const sim = await server.simulateTransaction(tx)
      if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error)
      if (!sim.result) throw new Error('No simulation result')

      return sim.result.retval
    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [wallet.publicKey, server, contract])

  const invoke = React.useCallback(async (method: string, args: xdr.ScVal[]) => {
    if (!wallet.publicKey) throw new Error('Wallet not connected')

    try {
      setLoading(true)
      setError(null)

      const account = await server.getAccount(wallet.publicKey)

      let tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build()

      const sim = await server.simulateTransaction(tx)
      if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error)

      tx = rpc.assembleTransaction(tx, sim).build()

      const signed = await wallet.signTransaction(tx.toXDR())
      const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signed, SOROBAN_NETWORK_PASSPHRASE))

      if (sent.status !== 'PENDING') throw new Error('Transaction rejected')

      let res
      do {
        await new Promise(r => setTimeout(r, 1200))
        res = await server.getTransaction(sent.hash)
      } while (res.status === rpc.Api.GetTransactionStatus.NOT_FOUND)

      if (res.status !== rpc.Api.GetTransactionStatus.SUCCESS) throw new Error('Transaction failed')

    } catch (e: any) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [wallet, server, contract])

  const getUserGroups = (u: string) =>
    simulate('get_user_groups', [nativeToScVal(u, { type: 'address' })]).then(scValToNative)

  const getGroupInfo = (a: string) =>
    simulate('get_group_info', [nativeToScVal(a, { type: 'address' })]).then(scValToNative)

  const getAllPublicGroups = () =>
    simulate('get_all_public_groups').then(scValToNative)

  const getGroupCount = () =>
    simulate('get_group_count').then(scValToNative)

  const registerGroup = (
    contractAddress: string,
    groupId: string,
    name: string,
    admin: string,
    isPublic: boolean,
    totalMembers: number
  ) =>
    invoke('register_group', [
      nativeToScVal(contractAddress, { type: 'address' }),
      nativeToScVal(groupId, { type: 'string' }),
      nativeToScVal(name, { type: 'string' }),
      nativeToScVal(admin, { type: 'address' }),
      nativeToScVal(isPublic, { type: 'bool' }),
      nativeToScVal(totalMembers, { type: 'u32' }),
    ])

  const addMember = (contractAddress: string, member: string) =>
    invoke('add_member', [
      nativeToScVal(contractAddress, { type: 'address' }),
      nativeToScVal(member, { type: 'address' }),
    ])

  return (
    <RegistryContractContext.Provider value={{
      getUserGroups,
      getGroupInfo,
      getAllPublicGroups,
      getGroupCount,
      registerGroup,
      addMember,
      contractId,
      isReady,
      error,
      loading,
    }}>
      {children}
    </RegistryContractContext.Provider>
  )
}

export const useRegistryContract = () => {
  const ctx = React.useContext(RegistryContractContext)
  if (!ctx) throw new Error('useRegistryContract must be used within provider')
  return ctx
}
