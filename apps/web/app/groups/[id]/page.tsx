'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { GroupHeader } from '@/components/group-header'
import { GroupMembers } from '@/components/group-members'
import { GroupTransactions } from '@/components/group-transactions'
import { GroupPayoutSchedule } from '@/components/group-payout-schedule'
import { GroupInviteLink } from '@/components/group-invite-link'
import { ErrorBoundary } from '@/components/error-boundary/error-boundary'
import { RpcErrorFallback } from '@/components/error-boundary/rpc-error-fallback'
import { useSavingsContract, type Group, type Member } from '@/context/savingsContract'
import { useWallet } from '@/hooks/use-wallet'
import { logger } from '@/lib/logger'

interface DisplayGroup {
  groupId: string
  name: string
  description: string
  contributionAmount: number
  frequency: string
  totalMembers: number
  currentMembers: number
  currentRound: number
  status: string
  totalPool: number
  nextPayoutDate: string
  nextPayoutRecipient: string
  isMember: boolean
  hasPaidThisRound: boolean
  myPosition: number
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function formatDeadline(seconds: bigint): string {
  const n = Number(seconds)
  if (!Number.isFinite(n) || n <= 0) return ''
  const date = new Date(n * 1000)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PAID_STATUSES = new Set(['PaidCurrentRound', 'ReceivedPayout'])

/**
 * Builds the page's display model from live on-chain reads. Every field
 * here comes from the current group/members/contributions/deadline
 * simulate calls made on this render — nothing is cached from a previous
 * load or derived from stale local state.
 */
async function buildDisplayGroup(
  g: Group,
  members: Member[],
  publicKey: string | null,
  getRoundContributionsByGroup: (groupId: string, round: number) => Promise<{ amount: bigint }[]>,
  getRoundDeadlineByGroup: (groupId: string, round: number) => Promise<bigint>,
): Promise<DisplayGroup> {
  const me = publicKey ? members.find((m) => m.address === publicKey) ?? null : null
  // ROSCA rotation: the member whose join order matches the current round
  // is next in line for payout, whether or not they've been paid yet.
  const nextRecipient = members.find((m) => m.joinOrder === g.currentRound) ?? null

  let totalPool = 0
  let nextPayoutDate = ''

  if (g.currentRound > 0) {
    const [contributions, deadline] = await Promise.all([
      getRoundContributionsByGroup(g.groupId, g.currentRound),
      getRoundDeadlineByGroup(g.groupId, g.currentRound),
    ])
    totalPool = contributions.reduce((sum, c) => sum + Number(c.amount), 0) / 10_000_000
    nextPayoutDate = formatDeadline(deadline)
  }

  return {
    groupId: g.groupId,
    name: g.name,
    description: '',
    contributionAmount: Number(g.contributionAmount) / 10_000_000,
    frequency: g.frequency,
    totalMembers: g.totalMembers,
    currentMembers: members.length,
    currentRound: g.currentRound,
    status: g.status,
    totalPool,
    nextPayoutDate,
    nextPayoutRecipient: nextRecipient ? shortAddress(nextRecipient.address) : '',
    isMember: me !== null,
    hasPaidThisRound: me !== null && PAID_STATUSES.has(me.status),
    myPosition: me?.joinOrder ?? 0,
  }
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getGroupById, getMembersByGroup, getRoundContributionsByGroup, getRoundDeadlineByGroup } =
    useSavingsContract()
  const { publicKey } = useWallet()
  const [group, setGroup] = useState<DisplayGroup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Bumped to force GroupMembers/GroupTransactions/GroupPayoutSchedule/
  // GroupInviteLink to remount (and re-fetch) when a section-level error
  // boundary's retry button is pressed.
  const [sectionRetryKey, setSectionRetryKey] = useState(0)

  const fetchGroup = useCallback(async () => {
    const [g, members] = await Promise.all([getGroupById(id), getMembersByGroup(id)])
    const display = await buildDisplayGroup(
      g,
      members,
      publicKey,
      getRoundContributionsByGroup,
      getRoundDeadlineByGroup,
    )
    setGroup(display)
  }, [getGroupById, getMembersByGroup, getRoundContributionsByGroup, getRoundDeadlineByGroup, id, publicKey])

  const refreshGroup = useCallback(() => {
    void fetchGroup().catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to refresh group.')
    })
  }, [fetchGroup])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        await fetchGroup()
        if (cancelled) return
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load group.')
      } finally {
        logger.debug('fetching group id', { id })
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // fetchGroup intentionally omitted: it already depends on id/publicKey,
    // and including it here would re-run this effect (and flip loading back
    // to true) on every publicKey identity change from the wallet context,
    // not just on navigation to a different group.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const retrySection = useCallback(() => setSectionRetryKey((k) => k + 1), [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          {loading && (
            <div className="text-muted-foreground py-12 text-center">Loading group…</div>
          )}
          {!loading && error && (
            <div className="py-12 flex flex-col items-center gap-4">
              <p className="text-destructive text-center">Could not load group: {error}</p>
              <RpcErrorFallback error={new Error(error)} reset={refreshGroup} compact />
            </div>
          )}
          {!loading && !error && group && (
            <>
              <ErrorBoundary label="group-header" fallback={(err, reset) => <RpcErrorFallback error={err} reset={reset} />}>
                <GroupHeader groupId={id} group={group} onActionSuccess={refreshGroup} />
              </ErrorBoundary>
              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <ErrorBoundary
                    key={`members-${sectionRetryKey}`}
                    label="group-members"
                    fallback={(err, reset) => (
                      <RpcErrorFallback
                        error={err}
                        reset={() => {
                          reset()
                          retrySection()
                        }}
                        compact
                      />
                    )}
                  >
                    <GroupMembers groupId={id} />
                  </ErrorBoundary>
                  <ErrorBoundary
                    key={`transactions-${sectionRetryKey}`}
                    label="group-transactions"
                    fallback={(err, reset) => (
                      <RpcErrorFallback
                        error={err}
                        reset={() => {
                          reset()
                          retrySection()
                        }}
                        compact
                      />
                    )}
                  >
                    <GroupTransactions groupId={id} />
                  </ErrorBoundary>
                </div>
                <div className="space-y-6">
                  <ErrorBoundary label="group-payout-schedule" fallback={(err, reset) => <RpcErrorFallback error={err} reset={reset} compact />}>
                    <GroupPayoutSchedule group={group} />
                  </ErrorBoundary>
                  <ErrorBoundary label="group-invite-link" fallback={(err, reset) => <RpcErrorFallback error={err} reset={reset} compact />}>
                    <GroupInviteLink groupId={id} />
                  </ErrorBoundary>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
