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
  // Single group methods (existing signature - for backward compatibility)
  getGroup: () => Promise<Group>
  getMember: (address: string) => Promise<Member>
  getMembers: () => Promise<Member[]>
  getRoundContributions: (round: number) => Promise<Contribution[]>
  getRoundPayouts: (round: number) => Promise<Payout[]>
  getRoundDeadline: (round: number) => Promise<bigint>
  
  // Multi-group methods (new - for MyGroups integration)
  getGroupById: (groupId: string) => Promise<Group>
  getMemberByGroup: (address: string, groupId: string) => Promise<Member>
  getMembersByGroup: (groupId: string) => Promise<Member[]>
  getRoundContributionsByGroup: (groupId: string, round: number) => Promise<Contribution[]>
  getRoundPayoutsByGroup: (groupId: string, round: number) => Promise<Payout[]>
  getRoundDeadlineByGroup: (groupId: string, round: number) => Promise<bigint>
  
  // User and discovery methods
  getUserGroups: (address: string) => Promise<string[]>
  getAllGroups: () => Promise<string[]>
  
  // Transaction methods
  createGroup: (params: CreateGroupParams) => Promise<rpc.Api.GetSuccessfulTransactionResponse>
  joinGroup: (groupId?: string) => Promise<rpc.Api.GetSuccessfulTransactionResponse>
  contribute: (amount: bigint, groupId?: string) => Promise<rpc.Api.GetSuccessfulTransactionResponse>
  
  // Contract info
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

    console.error('Transaction failed with response:', getResponse);
    
    // Try to extract detailed error from the response
    let errorMessage = `Transaction failed: ${getResponse.status}`;
    
    if ('resultXdr' in getResponse) {
      try {
        console.error('Transaction result:', getResponse.resultXdr);
        errorMessage += `\nResult: ${JSON.stringify(getResponse.resultXdr, null, 2)}`;
      } catch (e) {
        console.error('Could not parse result XDR:', e);
      }
    }

    throw new Error(errorMessage);
  }, [wallet, contractId, server])

  // ===== EXISTING SINGLE-GROUP METHODS (for backward compatibility) =====
  
  const getGroup = React.useCallback(async (): Promise<Group> => {
    try {
      const res = await simulateCall('get_group')
      const n = scValToNative(res)
      return { 
        ...n, 
        contributionAmount: BigInt(n.contribution_amount || n.contributionAmount || 0), 
        startTimestamp: BigInt(n.start_timestamp || n.startTimestamp || 0) 
      }
    } catch (err: any) {
      // Try with empty args if the contract expects no parameters
      if (err.message?.includes('missing argument')) {
        // Contract might expect a groupId parameter - this indicates we need to use multi-group version
        throw new Error('Contract requires groupId parameter. Use getGroupById instead.')
      }
      throw err
    }
  }, [simulateCall])

  const getMember = React.useCallback(async (address: string): Promise<Member> => {
    try {
      const res = await simulateCall('get_member', nativeToScVal(address, { type: 'address' }))
      const n = scValToNative(res)
      return { 
        ...n, 
        joinTimestamp: BigInt(n.join_timestamp || n.joinTimestamp || 0), 
        totalContributed: BigInt(n.total_contributed || n.totalContributed || 0) 
      }
    } catch (err: any) {
      if (err.message?.includes('missing argument')) {
        throw new Error('Contract requires groupId parameter. Use getMemberByGroup instead.')
      }
      throw err
    }
  }, [simulateCall])

  const getMembers = React.useCallback(async () => {
    try {
      const res = await simulateCall('get_members')
      const addrs = scValToNative(res) as string[]
      return Promise.all(addrs.map(a => getMember(a)))
    } catch (err: any) {
      if (err.message?.includes('missing argument')) {
        throw new Error('Contract requires groupId parameter. Use getMembersByGroup instead.')
      }
      throw err
    }
  }, [simulateCall, getMember])

  const getRoundContributions = React.useCallback(async (round: number) => {
    try {
      const res = await simulateCall('get_round_contributions', nativeToScVal(round, { type: 'u32' }))
      return (scValToNative(res) as any[]).map(c => ({ 
        ...c, 
        amount: BigInt(c.amount || 0), 
        timestamp: BigInt(c.timestamp || 0) 
      }))
    } catch (err: any) {
      if (err.message?.includes('missing argument')) {
        throw new Error('Contract requires groupId parameter. Use getRoundContributionsByGroup instead.')
      }
      throw err
    }
  }, [simulateCall])

  const getRoundPayouts = React.useCallback(async (round: number) => {
    try {
      const res = await simulateCall('get_round_payouts', nativeToScVal(round, { type: 'u32' }))
      return (scValToNative(res) as any[]).map(p => ({ 
        ...p, 
        amount: BigInt(p.amount || 0), 
        timestamp: BigInt(p.timestamp || 0) 
      }))
    } catch (err: any) {
      if (err.message?.includes('missing argument')) {
        throw new Error('Contract requires groupId parameter. Use getRoundPayoutsByGroup instead.')
      }
      throw err
    }
  }, [simulateCall])

  const getRoundDeadline = React.useCallback(async (round: number) => {
    try {
      const res = await simulateCall('get_round_deadline', nativeToScVal(round, { type: 'u32' }))
      return BigInt(scValToNative(res))
    } catch (err: any) {
      if (err.message?.includes('missing argument')) {
        throw new Error('Contract requires groupId parameter. Use getRoundDeadlineByGroup instead.')
      }
      throw err
    }
  }, [simulateCall])

  // ===== NEW MULTI-GROUP METHODS (for MyGroups integration) =====
  
  const getGroupById = React.useCallback(async (groupId: string): Promise<Group> => {
    try {
      // Try with groupId parameter first
      const res = await simulateCall('get_group', nativeToScVal(groupId, { type: 'string' }))
      const n = scValToNative(res)
      return { 
        ...n, 
        contributionAmount: BigInt(n.contribution_amount || n.contributionAmount || 0), 
        startTimestamp: BigInt(n.start_timestamp || n.startTimestamp || 0) 
      }
    } catch (err: any) {
      // If that fails, try without parameters (fallback to single-group mode)
      if (err.message?.includes('wrong number of arguments')) {
        console.warn('Contract does not accept groupId parameter, using single-group mode')
        return await getGroup()
      }
      throw err
    }
  }, [simulateCall, getGroup])

  const getMemberByGroup = React.useCallback(async (address: string, groupId: string): Promise<Member> => {
    try {
      // Try with both parameters
      const res = await simulateCall('get_member', 
        nativeToScVal(address, { type: 'address' }),
        nativeToScVal(groupId, { type: 'string' })
      )
      const n = scValToNative(res)
      return { 
        ...n, 
        joinTimestamp: BigInt(n.join_timestamp || n.joinTimestamp || 0), 
        totalContributed: BigInt(n.total_contributed || n.totalContributed || 0) 
      }
    } catch (err: any) {
      // Fallback to single-parameter version
      if (err.message?.includes('wrong number of arguments')) {
        console.warn('Contract does not accept groupId parameter, using single-group mode')
        return await getMember(address)
      }
      throw err
    }
  }, [simulateCall, getMember])

  const getMembersByGroup = React.useCallback(async (groupId: string) => {
    try {
      const res = await simulateCall('get_members', nativeToScVal(groupId, { type: 'string' }))
      const addrs = scValToNative(res) as string[]
      return Promise.all(addrs.map(a => getMemberByGroup(a, groupId)))
    } catch (err: any) {
      // Fallback to parameterless version
      if (err.message?.includes('wrong number of arguments')) {
        console.warn('Contract does not accept groupId parameter, using single-group mode')
        return await getMembers()
      }
      throw err
    }
  }, [simulateCall, getMemberByGroup])

  const getRoundContributionsByGroup = React.useCallback(async (groupId: string, round: number) => {
    try {
      const res = await simulateCall('get_round_contributions', 
        nativeToScVal(groupId, { type: 'string' }),
        nativeToScVal(round, { type: 'u32' })
      )
      return (scValToNative(res) as any[]).map(c => ({ 
        ...c, 
        amount: BigInt(c.amount || 0), 
        timestamp: BigInt(c.timestamp || 0) 
      }))
    } catch (err: any) {
      if (err.message?.includes('wrong number of arguments')) {
        console.warn('Contract does not accept groupId parameter, using single-group mode')
        return await getRoundContributions(round)
      }
      throw err
    }
  }, [simulateCall, getRoundContributions])

  const getRoundPayoutsByGroup = React.useCallback(async (groupId: string, round: number) => {
    try {
      const res = await simulateCall('get_round_payouts', 
        nativeToScVal(groupId, { type: 'string' }),
        nativeToScVal(round, { type: 'u32' })
      )
      return (scValToNative(res) as any[]).map(p => ({ 
        ...p, 
        amount: BigInt(p.amount || 0), 
        timestamp: BigInt(p.timestamp || 0) 
      }))
    } catch (err: any) {
      if (err.message?.includes('wrong number of arguments')) {
        console.warn('Contract does not accept groupId parameter, using single-group mode')
        return await getRoundPayouts(round)
      }
      throw err
    }
  }, [simulateCall, getRoundPayouts])

  const getRoundDeadlineByGroup = React.useCallback(async (groupId: string, round: number) => {
    try {
      const res = await simulateCall('get_round_deadline', 
        nativeToScVal(groupId, { type: 'string' }),
        nativeToScVal(round, { type: 'u32' })
      )
      return BigInt(scValToNative(res))
    } catch (err: any) {
      if (err.message?.includes('wrong number of arguments')) {
        console.warn('Contract does not accept groupId parameter, using single-group mode')
        return await getRoundDeadline(round)
      }
      throw err
    }
  }, [simulateCall, getRoundDeadline])

  // ===== USER AND DISCOVERY METHODS =====
  
  const getUserGroups = React.useCallback(async (address: string) => {
    try {
      const res = await simulateCall('get_user_groups', nativeToScVal(address, { type: 'address' }))
      return scValToNative(res) as string[]
    } catch (err: any) {
      // If function doesn't exist in deployed contract, return empty array
      if (err.message?.includes('non-existent contract function')) {
        console.warn('get_user_groups not available in deployed contract')
        return []
      }
      throw err
    }
  }, [simulateCall])

  const getAllGroups = React.useCallback(async () => {
    try {
      const res = await simulateCall('get_all_groups')
      return scValToNative(res) as string[]
    } catch (err: any) {
      // If function doesn't exist in deployed contract, return empty array
      if (err.message?.includes('non-existent contract function')) {
        console.warn('get_all_groups not available in deployed contract')
        return []
      }
      throw err
    }
  }, [simulateCall])

  // ===== TRANSACTION METHODS =====
  
  const createGroup = React.useCallback(async (p: CreateGroupParams) => {
    if (!wallet.publicKey) throw new Error('Wallet not connected')
    
    // Double-check timestamp is in the future
    const currentTime = Math.floor(Date.now() / 1000)
    if (Number(p.startTimestamp) <= currentTime) {
      throw new Error(`Start timestamp must be in the future. Current: ${currentTime}, Provided: ${p.startTimestamp}`)
    }
    
    const frequencyScVal = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol(p.frequency) // The variant name
    ])
    
    console.log('Creating group with params:', {
      admin: wallet.publicKey,
      groupId: p.groupId,
      name: p.name,
      contributionAmount: p.contributionAmount.toString(),
      totalMembers: p.totalMembers,
      frequency: p.frequency,
      startTimestamp: p.startTimestamp.toString(),
      isPublic: p.isPublic,
      currentTime
    })
    
    return await sendTransaction('create_group', 
      nativeToScVal(wallet.publicKey, { type: 'address' }),
      nativeToScVal(p.groupId, { type: 'string' }),
      nativeToScVal(p.name, { type: 'string' }),
      nativeToScVal(p.contributionAmount, { type: 'i128' }),
      nativeToScVal(p.totalMembers, { type: 'u32' }),
      frequencyScVal,
      nativeToScVal(p.startTimestamp, { type: 'u64' }),
      nativeToScVal(p.isPublic, { type: 'bool' })
    )
  }, [wallet.publicKey, sendTransaction])

  const joinGroup = React.useCallback(async (groupId?: string) => {
    if (!wallet.publicKey) throw new Error('Wallet not connected')
    
    if (groupId) {
      // Try with groupId parameter
      return await sendTransaction('join_group', 
        nativeToScVal(wallet.publicKey, { type: 'address' }),
        nativeToScVal(groupId, { type: 'string' })
      )
    } else {
      // Try without groupId (single-group mode)
      return await sendTransaction('join_group', nativeToScVal(wallet.publicKey, { type: 'address' }))
    }
  }, [wallet.publicKey, sendTransaction])

  const contribute = React.useCallback(async (amount: bigint, groupId?: string) => {
    if (!wallet.publicKey) throw new Error('Wallet not connected')
    
    if (groupId) {
      // Try with groupId parameter
      return await sendTransaction('contribute', 
        nativeToScVal(wallet.publicKey, { type: 'address' }),
        nativeToScVal(groupId, { type: 'string' }),
        nativeToScVal(amount, { type: 'i128' })
      )
    } else {
      // Try without groupId (single-group mode)
      return await sendTransaction('contribute', 
        nativeToScVal(wallet.publicKey, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' })
      )
    }
  }, [wallet.publicKey, sendTransaction])

  const value = React.useMemo(() => ({
    // Existing single-group methods
    getGroup, getMember, getMembers, getRoundContributions, getRoundPayouts,
    getRoundDeadline,
    
    // New multi-group methods
    getGroupById, getMemberByGroup, getMembersByGroup, 
    getRoundContributionsByGroup, getRoundPayoutsByGroup, getRoundDeadlineByGroup,
    
    // User and discovery methods
    getUserGroups, getAllGroups,
    
    // Transaction methods
    createGroup, joinGroup, contribute,
    
    // Contract info
    contractId, isReady, error
  }), [
    // Existing single-group methods
    getGroup, getMember, getMembers, getRoundContributions, getRoundPayouts,
    getRoundDeadline,
    
    // New multi-group methods
    getGroupById, getMemberByGroup, getMembersByGroup, 
    getRoundContributionsByGroup, getRoundPayoutsByGroup, getRoundDeadlineByGroup,
    
    // User and discovery methods
    getUserGroups, getAllGroups,
    
    // Transaction methods
    createGroup, joinGroup, contribute,
    
    // Contract info
    contractId, isReady, error
  ])

  return <SavingsContractContext.Provider value={value}>{children}</SavingsContractContext.Provider>
}

export const useSavingsContract = () => {
  const ctx = React.useContext(SavingsContractContext)
  if (!ctx) throw new Error('useSavingsContract must be used within SavingsContractProvider')
  return ctx
}
