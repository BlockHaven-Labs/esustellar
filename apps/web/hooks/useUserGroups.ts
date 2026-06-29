import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/hooks/use-wallet'
import { useRegistryContract, GroupInfo } from '@/context/registryContract'
import { useSavingsContract, MemberStatus} from '@/context/savingsContract'
import { logger } from '@/lib/logger'


export interface GroupDisplayData {
  id: string
  name: string
  contribution: number
  totalMembers: number
  currentRound: number
  myPosition: number
  status: 'paid' | 'active' | 'dueSoon' | 'waiting' | 'received' | 'defaulted' | 'overdue' | 'completed' | 'paused'
  statusLabel: string
  roundDeadlineTimestamp?: number
  daysUntilDeadline?: number
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

  const getRoundDeadlineSeconds = async (groupId: string, currentRound: number): Promise<number | null> => {
    if (typeof currentRound !== 'number' || isNaN(currentRound) || currentRound < 0) return null
    try {
      const deadline = await savings.getRoundDeadlineByGroup(groupId, currentRound)
      const deadlineNum = Number(deadline)
      if (Number.isFinite(deadlineNum) && deadlineNum > 0) return deadlineNum
      return null
    } catch (e) {
      logger.warn('Failed to fetch round deadline', { groupId, currentRound, error: e instanceof Error ? e.message : String(e) })
      return null
    }
  }

  const deriveStatus = async (p: {
    memberStatus: MemberStatus
    groupStatus: string
    groupId: string
    currentRound: number
  }): Promise<Pick<GroupDisplayData, 'status' | 'statusLabel' | 'roundDeadlineTimestamp' | 'daysUntilDeadline'>> => {
    const { memberStatus, groupStatus, groupId, currentRound } = p

    if (memberStatus === 'PaidCurrentRound') {
      return { status: 'paid', statusLabel: '✅ Paid' }
    }
    if (memberStatus === 'ReceivedPayout') {
      return { status: 'received', statusLabel: '🎉 Received Payout' }
    }
    if (memberStatus === 'Defaulted') {
      return { status: 'defaulted', statusLabel: '❌ Defaulted' }
    }

    if (groupStatus === 'Completed') {
      return { status: 'completed', statusLabel: '✓ Completed' }
    }
    if (groupStatus === 'Paused') {
      return { status: 'paused', statusLabel: '⏸ Paused' }
    }
    if (groupStatus === 'Open') {
      return { status: 'waiting', statusLabel: '⏳ Waiting to Start' }
    }

    if (memberStatus === 'Overdue') {
      return { status: 'overdue', statusLabel: '⚠️ Overdue' }
    }

    if (groupStatus === 'Active' && memberStatus === 'Active') {
      const deadlineSec = await getRoundDeadlineSeconds(groupId, currentRound)
      if (!deadlineSec) {
        return { status: 'active', statusLabel: 'Active' }
      }

      const nowSec = Math.floor(Date.now() / 1000)
      const diffSec = deadlineSec - nowSec
      const daysUntilDeadline = Math.ceil(diffSec / (24 * 60 * 60))

      if (daysUntilDeadline < 0) {
        return {
          status: 'overdue',
          statusLabel: '⚠️ Overdue',
          roundDeadlineTimestamp: deadlineSec,
          daysUntilDeadline,
        }
      }

      if (daysUntilDeadline <= 3) {
        return {
          status: 'dueSoon',
          statusLabel: daysUntilDeadline === 0 ? '⏳ Due today' : '⏳ Payment Due Soon',
          roundDeadlineTimestamp: deadlineSec,
          daysUntilDeadline,
        }
      }

      return {
        status: 'active',
        statusLabel: `⏳ Due in ${daysUntilDeadline} days`,
        roundDeadlineTimestamp: deadlineSec,
        daysUntilDeadline,
      }
    }

    return { status: 'active', statusLabel: 'Active' }
  }

  const calculateProgress = (currentRound: number, totalMembers: number): number => {
    const round = typeof currentRound === 'number' && !isNaN(currentRound) ? currentRound : 0
    const total = typeof totalMembers === 'number' && !isNaN(totalMembers) ? totalMembers : 0
    if (total === 0) return 0
    return Math.round((round / total) * 100)
  }

  const safePosition = (val: number): number | null => {
    if (typeof val === 'number' && !isNaN(val) && val >= 0) return val
    return null
  }

  const safeProgress = (val: number): number => {
    if (typeof val === 'number' && !isNaN(val) && val >= 0 && val <= 100) return val
    return 0
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

          const derived = await deriveStatus({
            memberStatus: member.status,
            groupStatus: savingsGroup.status,
            groupId: groupInfo.group_id,
            currentRound: savingsGroup.currentRound,
          })

          const rawPosition = member.joinOrder + 1
          const rawProgress = calculateProgress(savingsGroup.currentRound, savingsGroup.totalMembers)

          return {
            id: groupInfo.group_id,
            name: groupInfo.name,
            contribution: convertStroopsToXLM(savingsGroup.contributionAmount),
            totalMembers: savingsGroup.totalMembers,
            currentRound: savingsGroup.currentRound,
            myPosition: safePosition(rawPosition) ?? 0,
            status: derived.status,
            statusLabel: derived.statusLabel,
            roundDeadlineTimestamp: derived.roundDeadlineTimestamp,
            daysUntilDeadline: derived.daysUntilDeadline,
            progress: safeProgress(rawProgress),
            groupId: groupInfo.group_id,
            contractAddress: contractAddress
          } as GroupDisplayData
        } catch (err) {
          logger.error(`Error fetching group ${contractAddress}`, { error: err instanceof Error ? err.message : String(err) })
          return null
        }
      })

      const results = await Promise.all(groupPromises)
      const validGroups = results.filter((group): group is GroupDisplayData => group !== null)

      const sortedGroups = validGroups.sort((a, b) => {
        const statusPriority = {
          'dueSoon': 1,
          'overdue': 1,
          'defaulted': 1,
          'waiting': 2,
          'active': 3,
          'paid': 4,
          'received': 5,
          'paused': 6,
          'completed': 7
        }
        return (statusPriority[a.status] || 6) - (statusPriority[b.status] || 6)
      })

      setGroups(sortedGroups)
    } catch (err) {
      logger.error('Error fetching user groups', { error: err instanceof Error ? err.message : String(err) })
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