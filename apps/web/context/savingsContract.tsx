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
  groupId: string
  admin: string
  name: string
  contributionAmount: bigint
  totalMembers: number
  frequency: Frequency
  startTimestamp: bigint
  status: GroupStatus
  isPublic: boolean
  currentRound: number
  platformFeePercent: number
}

export interface Member {
  address: string
  joinTimestamp: bigint
  joinOrder: number
  status: MemberStatus
  totalContributed: bigint
  hasReceivedPayout: boolean
  payoutRound: number
}

export interface Contribution { member: string; amount: bigint; round: number; timestamp: bigint }
export interface Payout { recipient: string; amount: bigint; round: number; timestamp: bigint }

export interface CreateGroupParams {
  groupId: string
  name: string
  contributionAmount: bigint
  totalMembers: number
  frequency: Frequency
  startTimestamp: bigint
  isPublic: boolean
}


interface SavingsContractContextValue {
  getGroup(groupId: string): Promise<Group>
  getMember(groupId: string, address: string): Promise<Member>
  getMembers(groupId: string): Promise<Member[]>
  getRoundContributions(groupId: string, round: number): Promise<Contribution[]>
  getRoundPayouts(groupId: string, round: number): Promise<Payout[]>
  getRoundDeadline(groupId: string, round: number): Promise<bigint>
  getUserGroups(address: string): Promise<string[]>
  getAllGroups(): Promise<string[]>

  createGroup(p: CreateGroupParams): Promise<rpc.Api.GetSuccessfulTransactionResponse>
  joinGroup(groupId: string): Promise<rpc.Api.GetSuccessfulTransactionResponse>
  contribute(groupId: string): Promise<rpc.Api.GetSuccessfulTransactionResponse>

  contractId: string
  isReady: boolean
}

const SavingsContractContext = React.createContext<SavingsContractContextValue | undefined>(undefined)


export function SavingsContractProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet()

  const contractId = process.env.NEXT_PUBLIC_SAVINGS_CONTRACT_ID || ''
  const server = React.useMemo(() => new rpc.Server(SOROBAN_RPC_URL, { allowHttp: true }), [])

  const isReady = !!contractId && !!wallet.publicKey


  const simulate = React.useCallback(async (method: string, ...args: xdr.ScVal[]) => {
    const contract = new Contract(contractId)
    const source = wallet.publicKey || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
    const account = new Account(source, '0')

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build()

    const sim = await server.simulateTransaction(tx)
    if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error)
    return sim.result!.retval
  }, [wallet.publicKey, contractId, server])

  const sendTx = React.useCallback(async (method: string, ...args: xdr.ScVal[]) => {
    if (!wallet.publicKey) throw new Error('Wallet not connected')
    const contract = new Contract(contractId)
    const account = await server.getAccount(wallet.publicKey)

    let tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build()

    tx = await server.prepareTransaction(tx)
    const signed = await wallet.signTransaction(tx.toXDR())
    const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signed, SOROBAN_NETWORK_PASSPHRASE))

    if (sent.status !== 'PENDING') {
      const err = sent.errorResult
        ? sent.errorResult.result().switch().name   
        : sent.status
    
      throw new Error(`Transaction submission failed: ${err}`)
    }
    

    let res = await server.getTransaction(sent.hash)
    while (res.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      await new Promise(r => setTimeout(r, 1000))
      res = await server.getTransaction(sent.hash)
    }
    if (res.status !== rpc.Api.GetTransactionStatus.SUCCESS) throw new Error('Tx failed')
    return res
  }, [wallet, contractId, server])


  const getGroup = async (groupId: string): Promise<Group> => {
    const r = scValToNative(await simulate('get_group', nativeToScVal(groupId, { type: 'string' })))
    return {
      groupId: r.group_id,
      admin: r.admin,
      name: r.name,
      contributionAmount: BigInt(r.contribution_amount),
      totalMembers: r.total_members,
      frequency: r.frequency,
      startTimestamp: BigInt(r.start_timestamp),
      status: r.status,
      isPublic: r.is_public,
      currentRound: r.current_round,
      platformFeePercent: r.platform_fee_percent,
    }
  }

  const getMember = async (groupId: string, address: string): Promise<Member> => {
    const r = scValToNative(await simulate(
      'get_member',
      nativeToScVal(address, { type: 'address' }),
      nativeToScVal(groupId, { type: 'string' })
    ))
    return {
      address: r.address,
      joinTimestamp: BigInt(r.join_timestamp),
      joinOrder: r.join_order,
      status: r.status,
      totalContributed: BigInt(r.total_contributed),
      hasReceivedPayout: r.has_received_payout,
      payoutRound: r.payout_round,
    }
  }

  const getMembers = async (groupId: string) => {
    const addrs = scValToNative(await simulate('get_members', nativeToScVal(groupId, { type: 'string' }))) as string[]
    return Promise.all(addrs.map(a => getMember(groupId, a)))
  }

  const mapBig = (arr: any[]) => arr.map(v => ({ ...v, amount: BigInt(v.amount), timestamp: BigInt(v.timestamp) }))

  const getRoundContributions = async (groupId: string, round: number) =>
    mapBig(scValToNative(await simulate('get_round_contributions',
      nativeToScVal(groupId, { type: 'string' }),
      nativeToScVal(round, { type: 'u32' })
    )))

  const getRoundPayouts = async (groupId: string, round: number) =>
    mapBig(scValToNative(await simulate('get_round_payouts',
      nativeToScVal(groupId, { type: 'string' }),
      nativeToScVal(round, { type: 'u32' })
    )))

  const getRoundDeadline = async (groupId: string, round: number) =>
    BigInt(scValToNative(await simulate('get_round_deadline',
      nativeToScVal(groupId, { type: 'string' }),
      nativeToScVal(round, { type: 'u32' })
    )))

  const getUserGroups = async (addr: string) =>
    scValToNative(await simulate('get_user_groups', nativeToScVal(addr, { type: 'address' })))

  const getAllGroups = async () =>
    scValToNative(await simulate('get_all_groups'))


  const createGroup = async (p: CreateGroupParams) =>
    sendTx('create_group',
      nativeToScVal(wallet.publicKey!, { type: 'address' }),
      nativeToScVal(p.groupId, { type: 'string' }),
      nativeToScVal(p.name, { type: 'string' }),
      nativeToScVal(p.contributionAmount, { type: 'i128' }),
      nativeToScVal(p.totalMembers, { type: 'u32' }),
      nativeToScVal(p.frequency, { type: 'symbol' }),
      nativeToScVal(p.startTimestamp, { type: 'u64' }),
      nativeToScVal(p.isPublic, { type: 'bool' })
    )

  const joinGroup = async (groupId: string) =>
    sendTx('join_group',
      nativeToScVal(wallet.publicKey!, { type: 'address' }),
      nativeToScVal(groupId, { type: 'string' })
    )

  const contribute = async (groupId: string) =>
    sendTx('contribute',
      nativeToScVal(wallet.publicKey!, { type: 'address' }),
      nativeToScVal(groupId, { type: 'string' })
    )

  return (
    <SavingsContractContext.Provider value={{
      getGroup, getMember, getMembers,
      getRoundContributions, getRoundPayouts, getRoundDeadline,
      getUserGroups, getAllGroups,
      createGroup, joinGroup, contribute,
      contractId, isReady
    }}>
      {children}
    </SavingsContractContext.Provider>
  )
}


export const useSavingsContract = () => {
  const ctx = React.useContext(SavingsContractContext)
  if (!ctx) throw new Error('useSavingsContract must be used within SavingsContractProvider')
  return ctx
}

