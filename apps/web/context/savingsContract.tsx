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


export type GroupStatus = 'Open' | 'Active' | 'Completed' | 'Paused'
export type MemberStatus = 'Active' | 'PaidCurrentRound' | 'Overdue' | 'Defaulted' | 'ReceivedPayout'
export type Frequency = 'Weekly' | 'BiWeekly' | 'Monthly'

export interface Group {
  groupId: string; admin: string; name: string; contributionAmount: bigint;
  totalMembers: number; frequency: Frequency; startTimestamp: bigint;
  status: GroupStatus; isPublic: boolean; currentRound: number; platformFeePercent: number;
}

export interface Member {
  address: string; joinTimestamp: bigint; joinOrder: number; status: MemberStatus;
  totalContributed: bigint; hasReceivedPayout: boolean; payoutRound: number;
}

export interface Contribution { member: string; amount: bigint; round: number; timestamp: bigint; }
export interface Payout { recipient: string; amount: bigint; round: number; timestamp: bigint; }

export interface CreateGroupParams {
  groupId: string; name: string; contributionAmount: bigint;
  totalMembers: number; frequency: Frequency; startTimestamp: bigint; isPublic: boolean;
}

export interface SavingsContractContextValue {
  getGroup: () => Promise<Group>
  getMember: (address: string) => Promise<Member>
  getMembers: () => Promise<Member[]>
  getRoundContributions: (round: number) => Promise<Contribution[]>
  getRoundPayouts: (round: number) => Promise<Payout[]>
  getRoundDeadline: (round: number) => Promise<bigint>
  getUserGroups: (address: string) => Promise<string[]>
  getAllGroups: () => Promise<string[]>
  createGroup: (params: CreateGroupParams) => Promise<rpc.Api.GetSuccessfulTransactionResponse>
  joinGroup: () => Promise<rpc.Api.GetSuccessfulTransactionResponse>
  contribute: (amount: bigint) => Promise<rpc.Api.GetSuccessfulTransactionResponse>
  contractId: string
  isReady: boolean
  error: string | null
}

const SavingsContractContext = React.createContext<SavingsContractContextValue | undefined>(undefined)



export function SavingsContractProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet()
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || ''
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

const sendTransaction = React.useCallback(async (method: string, ...args: xdr.ScVal[]) => {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  
  const contract = new Contract(contractId);
  const account = await server.getAccount(wallet.publicKey);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  tx = await server.prepareTransaction(tx);
  const signedXdr = await wallet.signTransaction(tx.toXDR());
  
  const transactionToSubmit = TransactionBuilder.fromXDR(signedXdr, SOROBAN_NETWORK_PASSPHRASE);
  const response = await server.sendTransaction(transactionToSubmit);

  if (response.status !== 'PENDING') {
    throw new Error(`Transaction failed: ${response.status}`);
  }

  // Wait for confirmation
  let getResponse = await server.getTransaction(response.hash);
  
  while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    getResponse = await server.getTransaction(response.hash);
  }

  if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return getResponse;
  }

  throw new Error(`Transaction failed: ${getResponse.status}`);
}, [wallet, contractId, server]);

  const getGroup = async (): Promise<Group> => {
    const res = await simulateCall('get_group')
    const n = scValToNative(res)
    return { ...n, contributionAmount: BigInt(n.contribution_amount), startTimestamp: BigInt(n.start_timestamp) }
  }

  const getMember = async (address: string): Promise<Member> => {
    const res = await simulateCall('get_member', nativeToScVal(address, { type: 'address' }))
    const n = scValToNative(res)
    return { ...n, joinTimestamp: BigInt(n.join_timestamp), totalContributed: BigInt(n.total_contributed) }
  }

  const getMembers = async () => {
    const res = await simulateCall('get_members')
    const addrs = scValToNative(res) as string[]
    return Promise.all(addrs.map(a => getMember(a)))
  }

  const getRoundContributions = async (round: number) => {
    const res = await simulateCall('get_round_contributions', nativeToScVal(round, { type: 'u32' }))
    return (scValToNative(res) as any[]).map(c => ({ ...c, amount: BigInt(c.amount), timestamp: BigInt(c.timestamp) }))
  }

  const getRoundPayouts = async (round: number) => {
    const res = await simulateCall('get_round_payouts', nativeToScVal(round, { type: 'u32' }))
    return (scValToNative(res) as any[]).map(p => ({ ...p, amount: BigInt(p.amount), timestamp: BigInt(p.timestamp) }))
  }

  const getRoundDeadline = async (round: number) => 
    BigInt(scValToNative(await simulateCall('get_round_deadline', nativeToScVal(round, { type: 'u32' }))))

  const getUserGroups = async (address: string) => 
    scValToNative(await simulateCall('get_user_groups', nativeToScVal(address, { type: 'address' }))) as string[]

  const getAllGroups = async () => {
    try {
      return scValToNative(await simulateCall('get_all_groups')) as string[]
    } catch (err: any) {
      // If function doesn't exist in deployed contract, return empty array
      if (err.message?.includes('non-existent contract function')) {
        console.warn('get_all_groups not available in deployed contract')
        return []
      }
      throw err
    }
  }

  const createGroup = async (p: CreateGroupParams) => {
  if (!wallet.publicKey) throw new Error('Wallet not connected')
  
  // Create frequency enum as a map instead of number
  // Encode frequency as Soroban enum - use symbol for variant name
  const freqSymbol = xdr.ScVal.scvSymbol(p.frequency)
  
  return await sendTransaction('create_group', 
    nativeToScVal(wallet.publicKey, { type: 'address' }),
    nativeToScVal(p.groupId, { type: 'string' }),
    nativeToScVal(p.name, { type: 'string' }),
    nativeToScVal(p.contributionAmount, { type: 'i128' }),
    nativeToScVal(p.totalMembers, { type: 'u32' }),
    freqSymbol,
    nativeToScVal(p.startTimestamp, { type: 'u64' }),
    nativeToScVal(p.isPublic, { type: 'bool' })
  )
}

  const joinGroup = async () => sendTransaction('join_group', nativeToScVal(wallet.publicKey, { type: 'address' }))

  const contribute = async (amount: bigint) => 
    sendTransaction('contribute', nativeToScVal(wallet.publicKey, { type: 'address' }), nativeToScVal(amount, { type: 'i128' }))

  const value = React.useMemo(() => ({
    getGroup, getMember, getMembers, getRoundContributions, getRoundPayouts,
    getRoundDeadline, getUserGroups, getAllGroups, createGroup, joinGroup, contribute,
    contractId, isReady, error
  }), [contractId, isReady, error, wallet.publicKey, simulateCall, sendTransaction])

  return <SavingsContractContext.Provider value={value}>{children}</SavingsContractContext.Provider>
}

export const useSavingsContract = () => {
  const ctx = React.useContext(SavingsContractContext)
  if (!ctx) throw new Error('useSavingsContract must be used within SavingsContractProvider')
  return ctx
}