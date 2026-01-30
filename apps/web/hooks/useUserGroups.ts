import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/hooks/use-wallet'
import { useRegistryContract } from '@/context/registryContract'
import { useSavingsContract } from '@/context/savingsContract'
import { GroupInfo } from '@/context/registryContract'
import { Group, Member, MemberStatus } from '@/context/savingsContract'

export interface GroupDisplayData {
  id: string
  name: string
  contribution: number
  totalMembers: number
  currentRound: number
  myPosition: number
  status: 'paid' | 'pending' | 'received' | 'defaulted' | 'overdue' | 'completed'
  progress: number
  groupId: string
  contractAddress: string
}

export function useUserGroups() {
  const { publicKey, isConnected } = useWallet()
  const registry = useRegistryContract()
  const savings = useSavingsContract()
  const [groups, setGroups] = useState<GroupDisplayData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapMemberStatus = (memberStatus: MemberStatus, groupStatus: string): 'paid' | 'pending' | 'received' | 'defaulted' | 'overdue' | 'completed' => {
    if (groupStatus === 'Completed') {
      return 'completed'
    }
    
    switch (memberStatus) {
      case 'PaidCurrentRound':
        return 'paid'
      case 'Active':
        return 'pending'
      case 'ReceivedPayout':
        return 'received'
      case 'Defaulted':
        return 'defaulted'
      case 'Overdue':
        return 'overdue'
      default:
        return 'pending'
    }
  }

  const calculateProgress = (currentRound: number, totalMembers: number): number => {
    if (totalMembers === 0) return 0
    return Math.round((currentRound / totalMembers) * 100)
  }

  const convertStroopsToXLM = (stroops: bigint): number => {
    return Number(stroops) / 10000000
  }

  const fetchUserGroups = useCallback(async () => {
    if (!isConnected || !publicKey || !registry.isReady || !savings.isReady) {
      setGroups([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const contractAddresses: string[] = await registry.getUserGroups(publicKey)

      if (!contractAddresses || contractAddresses.length === 0) {
        setGroups([])
        setLoading(false)
        return
      }

      const groupPromises = contractAddresses.map(async (contractAddress) => {
        try {
          const groupInfo: GroupInfo = await registry.getGroupInfo(contractAddress)

          const savingsGroup = await savings.getGroupById(groupInfo.group_id)

          const member = await savings.getMemberByGroup(publicKey, groupInfo.group_id)

          return {
            id: groupInfo.group_id,
            name: groupInfo.name,
            contribution: convertStroopsToXLM(savingsGroup.contributionAmount),
            totalMembers: savingsGroup.totalMembers,
            currentRound: savingsGroup.currentRound,
            myPosition: member.joinOrder + 1, 
            status: mapMemberStatus(member.status, savingsGroup.status),
            progress: calculateProgress(savingsGroup.currentRound, savingsGroup.totalMembers),
            groupId: groupInfo.group_id,
            contractAddress: contractAddress
          } as GroupDisplayData
        } catch (err) {
          console.error(`Error fetching group ${contractAddress}:`, err)
          return null
        }
      })

      const results = await Promise.all(groupPromises)
      const validGroups = results.filter((group): group is GroupDisplayData => group !== null)

      const sortedGroups = validGroups.sort((a, b) => {
        const statusPriority = {
          'overdue': 1,
          'defaulted': 1,
          'pending': 2,
          'paid': 3,
          'received': 4,
          'completed': 5
        }
        return (statusPriority[a.status] || 6) - (statusPriority[b.status] || 6)
      })

      setGroups(sortedGroups)
    } catch (err) {
      console.error('Error fetching user groups:', err)
      setError('Failed to load groups. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [isConnected, publicKey, registry, savings])

  useEffect(() => {
    fetchUserGroups()
  }, [fetchUserGroups])

  return {
    groups,
    loading,
    error,
    refetch: fetchUserGroups
  }
}