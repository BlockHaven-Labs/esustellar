"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, TrendingUp, Users, Calendar } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { useRegistryContract } from "@/context/registryContract"
import { useSavingsContract } from "@/context/savingsContract"
import { getDaysRemaining, timestampToDate, troopsToXLM, logDebug } from "@/lib/dashboardStats"

type DashboardStatsState = {
  totalContributed: number
  totalReceived: number
  activeGroups: number
  groupCount: number
  payoutsReceived: number
  nextPaymentDeadline: number | null
  nextPaymentAmount: number
}

type FetchStatus = "loading" | "ready" | "no-wallet" | "no-groups" | "error"

const DEFAULT_STATS: DashboardStatsState = {
  totalContributed: 0,
  totalReceived: 0,
  activeGroups: 0,
  groupCount: 0,
  payoutsReceived: 0,
  nextPaymentDeadline: null,
  nextPaymentAmount: 0,
}

const formatXLM = (amount: number): string =>
  `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`

const formatDate = (deadlineTs: number): string =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    timestampToDate(deadlineTs)
  )

export function DashboardStats() {
  const { publicKey, isConnected } = useWallet()
  const registry = useRegistryContract()
  const savings = useSavingsContract()

  const [status, setStatus] = useState<FetchStatus>("loading")
  const [stats, setStats] = useState<DashboardStatsState>(DEFAULT_STATS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isConnected || !publicKey) {
      queueMicrotask(() => setStatus("no-wallet"))
      return
    }
  }, [isConnected, publicKey])

  useEffect(() => {
    if (!publicKey || !registry.isReady || !savings.isReady) return

    if (registry.error || savings.error) {
      const message = registry.error || savings.error
      queueMicrotask(() => {
        setErrorMessage(message)
        setStats({ ...DEFAULT_STATS })
        setStatus("error")
      })
      return
    }

    let active = true

    const fetchStats = async () => {
      setStatus("loading")
      setErrorMessage(null)

      try {
        const groupIds = await registry.getUserGroups(publicKey)

        if (!active) return

        if (groupIds.length === 0) {
          setStats({ ...DEFAULT_STATS })
          setStatus("no-groups")
          return
        }

        // Step 2: Fetch detailed stats for each group
        const groupResults = await Promise.all(
          groupIds.map(async (groupId) => {
            const [member, group] = await Promise.all([
              savings.getMemberByGroup(publicKey, groupId),
              savings.getGroupById(groupId),
            ])

            let receivedAmount = 0
            let payoutsReceived = 0

            if (member.hasReceivedPayout && member.payoutRound > 0) {
              const payouts = await savings.getRoundPayoutsByGroup(groupId, member.payoutRound)
              for (const payout of payouts) {
                if (payout.recipient.toUpperCase() === publicKey.toUpperCase()) {
                  receivedAmount += Number(payout.amount)
                  payoutsReceived += 1
                }
              }
            }

            let deadlineTs: number | null = null
            if (group.status === "Active" && member.status !== "PaidCurrentRound") {
              const deadline = await savings.getRoundDeadlineByGroup(groupId, group.currentRound)
              deadlineTs = Number(deadline)
            }

            return {
              totalContributed: Number(member.totalContributed),
              status: group.status,
              receivedAmount,
              payoutsReceived,
              deadlineTs,
              contributionAmount: Number(group.contributionAmount),
            }
          })
        )

        let totalContributedStroops = 0
        let totalReceivedStroops = 0
        let activeGroupsCount = 0
        let payoutsReceivedCount = 0
        let nextDeadline: number | null = null
        let nextAmountStroops = 0

        for (const result of groupResults) {
          totalContributedStroops += result.totalContributed
          totalReceivedStroops += result.receivedAmount
          payoutsReceivedCount += result.payoutsReceived

          if (result.status !== "Completed") {
            activeGroupsCount += 1
          }

          if (result.deadlineTs !== null) {
            if (nextDeadline === null || result.deadlineTs < nextDeadline) {
              nextDeadline = result.deadlineTs
              nextAmountStroops = result.contributionAmount
            }
          }
        }

        const finalStats = {
          totalContributed: troopsToXLM(totalContributedStroops),
          totalReceived: troopsToXLM(totalReceivedStroops),
          activeGroups: activeGroupsCount,
          groupCount: groupIds.length,
          payoutsReceived: payoutsReceivedCount,
          nextPaymentDeadline: nextDeadline,
          nextPaymentAmount: troopsToXLM(nextAmountStroops),
        }

        logDebug("Final stats", finalStats)

        if (!active) return
        setStats(finalStats)
        setStatus("ready")
      } catch (err) {
        logDebug("fetchStats failed", err)
        if (!active) return
        setErrorMessage(err instanceof Error ? err.message : "Unknown error")
        setStats({ ...DEFAULT_STATS })
        setStatus("error")
      }
    }

    fetchStats()

    return () => {
      active = false
    }
  }, [publicKey, registry, savings])

  const statsItems = useMemo(() => {
    const nextPaymentDate =
      stats.nextPaymentDeadline !== null ? formatDate(stats.nextPaymentDeadline) : "No upcoming payment"

    let nextPaymentChange = "No upcoming payment"
    if (stats.nextPaymentDeadline !== null) {
      const daysRemaining = getDaysRemaining(stats.nextPaymentDeadline)
      const dueText = `${formatXLM(stats.nextPaymentAmount)} due`
      nextPaymentChange =
        daysRemaining <= 0
          ? `${dueText} now`
          : `${dueText} in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
    }

    const groupLabel = stats.groupCount === 1 ? "group" : "groups"
    const payoutLabel = stats.payoutsReceived === 1 ? "payout" : "payouts"

    return [
      {
        icon: Wallet,
        label: "Total Contributed",
        value: formatXLM(stats.totalContributed),
        change: `Across ${stats.groupCount} ${groupLabel}`,
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        icon: TrendingUp,
        label: "Total Received",
        value: formatXLM(stats.totalReceived),
        change:
          stats.payoutsReceived > 0
            ? `${stats.payoutsReceived} ${payoutLabel} received`
            : "No payouts yet",
        color: "text-stellar",
        bg: "bg-stellar/10",
      },
      {
        icon: Users,
        label: "Active Groups",
        value: stats.activeGroups.toString(),
        change: `Total groups: ${stats.groupCount}`,
        color: "text-warning",
        bg: "bg-warning/10",
      },
      {
        icon: Calendar,
        label: "Next Payment",
        value: nextPaymentDate,
        change: nextPaymentChange,
        color: "text-error",
        bg: "bg-error/10",
      },
    ]
  }, [stats])

  if (status === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (status === "no-wallet") {
    return (
      <div className="space-y-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Connect wallet to view stats</p>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsItems.map((stat, index) => (
            <Card key={index} className="border-border bg-card opacity-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (status === "no-groups") {
    return (
      <div className="space-y-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Join or create a group to see stats</p>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsItems.map((stat, index) => (
            <Card key={index} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="space-y-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Unable to fetch data. Please try again</p>
            {errorMessage && process.env.NODE_ENV === "development" && (
              <p className="mt-2 text-xs text-muted-foreground">Error: {errorMessage}</p>
            )}
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsItems.map((stat, index) => (
            <Card key={index} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsItems.map((stat, index) => (
        <Card key={index} className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
