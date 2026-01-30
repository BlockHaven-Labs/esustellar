import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/hooks/use-wallet'
import { useSavingsContract } from '@/context/savingsContract'
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
}

export function useUserGroups() {
  const { publicKey, isConnected } = useWallet()
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
    if (!isConnected || !publicKey) {
      setGroups([])
      setError('Wallet not connected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Fetching user groups for:', publicKey)
      
      const groupIds: string[] = await savings.getUserGroups(publicKey)
      console.log('Found group IDs:', groupIds)

      if (!groupIds || groupIds.length === 0) {
        setGroups([])
        setLoading(false)
        return
      }

      const groupPromises = groupIds.map(async (groupId) => {
        try {
          console.log(`Fetching group ${groupId}`)
          
          const group: Group = await savings.getGroup(groupId)
          console.log(`Group details for ${groupId}:`, group)
          
          const member: Member = await savings.getMember(groupId, publicKey)
          console.log(`Member details for ${publicKey} in group ${groupId}:`, member)
          
          return {
            id: groupId,
            name: group.name,
            contribution: convertStroopsToXLM(group.contributionAmount),
            totalMembers: group.totalMembers,
            currentRound: group.currentRound,
            myPosition: member.joinOrder + 1,
            status: mapMemberStatus(member.status, group.status),
            progress: calculateProgress(group.currentRound, group.totalMembers),
            groupId: groupId
          } as GroupDisplayData
        } catch (err) {
          console.error(`Error fetching group ${groupId}:`, err)
          return null
        }
      })

      const groupResults = await Promise.all(groupPromises)
      const validGroups = groupResults.filter((group): group is GroupDisplayData => group !== null)

      console.log('Valid groups:', validGroups)

      // Step 3: Sort groups according to requirements
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
    } catch (err: any) {
      console.error('Error in fetchUserGroups:', err)
      
      let errorMessage = 'Failed to load groups. Please try again.'
      
      if (err.message?.includes('contract') || err.message?.includes('not found')) {
        errorMessage = 'Smart contract not deployed. Please deploy the savings contract.'
      } else if (err.message?.includes('network') || err.message?.includes('connection')) {
        errorMessage = 'Network error. Please check your connection.'
      }
      
      setError(errorMessage)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [isConnected, publicKey, savings])

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
