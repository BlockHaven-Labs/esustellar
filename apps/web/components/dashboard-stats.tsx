"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet, TrendingUp, Users, Calendar } from "lucide-react"
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk"
import { getAddress, getNetworkDetails, isConnected } from "@stellar/freighter-api"
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

const DEFAULT_RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org"
const DEFAULT_NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET
const REGISTRY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID ?? process.env.NEXT_PUBLIC_CONTRACT_ID ?? ""

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string" && value.length > 0) return Number(value)
  return 0
}

const normalizeEnum = (value: unknown): string | null => {
  if (typeof value === "string") return value
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") return value[0]
  if (isRecord(value)) {
    if (typeof value.tag === "string") return value.tag
    const keys = Object.keys(value)
    if (keys.length === 1) return keys[0]
  }
  return null
}

const normalizeAddress = (value: unknown): string | null => (typeof value === "string" ? value : null)

const formatXLM = (amount: number): string =>
  `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`

const formatDate = (deadlineTs: number): string =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    timestampToDate(deadlineTs)
  )

const resolveNetworkConfig = async (): Promise<{ rpcUrl: string; networkPassphrase: string }> => {
  try {
    const details = await getNetworkDetails()
    if (!details?.error && details?.networkPassphrase) {
      return {
        rpcUrl: details.sorobanRpcUrl ?? DEFAULT_RPC_URL,
        networkPassphrase: details.networkPassphrase,
      }
    }
  } catch (err) {
    logDebug("Failed to get network details from Freighter", err)
  }

  return {
    rpcUrl: DEFAULT_RPC_URL,
    networkPassphrase: DEFAULT_NETWORK_PASSPHRASE,
  }
}

export function DashboardStats() {
  const [status, setStatus] = useState<FetchStatus>("loading")
  const [stats, setStats] = useState<DashboardStatsState>(DEFAULT_STATS)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const checkWallet = async () => {
      try {
        const connection = await isConnected()
        if (!active) return
        if (!connection?.isConnected || connection?.error) {
          setStatus("no-wallet")
          return
        }

        const addressResult = await getAddress()
        if (!active) return
        if (!addressResult?.address || addressResult?.error) {
          setStatus("no-wallet")
          return
        }

        setWalletAddress(addressResult.address)
      } catch (err) {
        logDebug("Failed to check wallet connection", err)
        if (active) setStatus("no-wallet")
      }
    }

    checkWallet()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!walletAddress) return

    let active = true

    const fetchStats = async () => {
      setStatus("loading")
      setErrorMessage(null)

      try {
        if (!REGISTRY_CONTRACT_ID) {
          logDebug("Missing registry contract ID - check NEXT_PUBLIC_REGISTRY_CONTRACT_ID or NEXT_PUBLIC_CONTRACT_ID env var")
          throw new Error("Missing registry contract ID")
        }

        logDebug("Using registry contract", REGISTRY_CONTRACT_ID)

        const { rpcUrl, networkPassphrase } = await resolveNetworkConfig()
        logDebug("Network config", { rpcUrl, networkPassphrase })

        const server = new SorobanRpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") })
        const baseAccount = await server.getAccount(walletAddress)
        const addressVal = Address.fromString(walletAddress).toScVal()

        const readContractValue = async (contractId: string, method: string, args: xdr.ScVal[] = []) => {
          const account = new Account(baseAccount.accountId(), baseAccount.sequenceNumber())
          const contract = new Contract(contractId)
          const tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase,
          })
            .addOperation(contract.call(method, ...args))
            .setTimeout(30)
            .build()

          const simulation = await server.simulateTransaction(tx)
          if (SorobanRpc.Api.isSimulationError(simulation)) {
            logDebug(`Contract call failed: ${contractId}.${method}`, simulation.error)
            throw new Error(simulation.error)
          }

          return simulation.result?.retval ? scValToNative(simulation.result.retval) : null
        }

        logDebug("Calling get_user_groups on registry", { walletAddress })
        const groupsRaw = await readContractValue(REGISTRY_CONTRACT_ID, "get_user_groups", [addressVal])
        logDebug("get_user_groups result", groupsRaw)

        const groupIds = Array.isArray(groupsRaw)
          ? groupsRaw.filter((groupId): groupId is string => typeof groupId === "string")
          : []

        if (groupIds.length === 0) {
          logDebug("No groups found for user")
          if (!active) return
          setStats({ ...DEFAULT_STATS })
          setStatus("no-groups")
          return
        }

        logDebug(`Found ${groupIds.length} groups`, groupIds)

        const groupResults = await Promise.all(
          groupIds.map(async (groupId) => {
            try {
              logDebug(`Fetching data for group ${groupId}`)

              const [memberRaw, groupRaw] = await Promise.all([
                readContractValue(groupId, "get_member", [addressVal]),
                readContractValue(groupId, "get_group"),
              ])

              const memberRecord = isRecord(memberRaw) ? memberRaw : {}
              const groupRecord = isRecord(groupRaw) ? groupRaw : {}

              const memberStatus = normalizeEnum(memberRecord.status)
              const groupStatus = normalizeEnum(groupRecord.status)

              const member = {
                totalContributed: toNumber(memberRecord.total_contributed),
                hasReceivedPayout: memberRecord.has_received_payout === true,
                payoutRound: toNumber(memberRecord.payout_round),
                status: memberStatus,
              }

              const group = {
                contributionAmount: toNumber(groupRecord.contribution_amount),
                currentRound: toNumber(groupRecord.current_round),
                status: groupStatus,
              }

              logDebug(`Group ${groupId} member data`, member)
              logDebug(`Group ${groupId} group data`, group)

              let receivedAmount = 0
              let payoutsReceived = 0

              if (member.hasReceivedPayout && member.payoutRound > 0) {
                try {
                  const payoutsRaw = await readContractValue(groupId, "get_round_payouts", [
                    nativeToScVal(member.payoutRound, { type: "u32" }),
                  ])
                  const payouts = Array.isArray(payoutsRaw) ? payoutsRaw : []

                  for (const payout of payouts) {
                    if (!isRecord(payout)) continue
                    const recipient = normalizeAddress(payout.recipient)
                    if (recipient && recipient.toUpperCase() === walletAddress.toUpperCase()) {
                      receivedAmount += toNumber(payout.amount)
                      payoutsReceived += 1
                    }
                  }
                  logDebug(`Group ${groupId} payouts`, { receivedAmount, payoutsReceived })
                } catch (err) {
                  logDebug(`Failed to fetch payouts for group ${groupId}`, err)
                }
              }

              let deadlineTs: number | null = null
              if (group.status === "Active" && member.status !== "PaidCurrentRound") {
                try {
                  const deadlineRaw = await readContractValue(groupId, "get_round_deadline", [
                    nativeToScVal(group.currentRound, { type: "u32" }),
                  ])
                  if (deadlineRaw !== null && deadlineRaw !== undefined) {
                    deadlineTs = toNumber(deadlineRaw)
                    logDebug(`Group ${groupId} deadline`, deadlineTs)
                  }
                } catch (err) {
                  logDebug(`Failed to fetch deadline for group ${groupId}`, err)
                }
              }

              return { member, group, receivedAmount, payoutsReceived, deadlineTs }
            } catch (err) {
              logDebug(`Error processing group ${groupId}`, err)
              return {
                member: { totalContributed: 0, hasReceivedPayout: false, payoutRound: 0, status: null },
                group: { contributionAmount: 0, currentRound: 0, status: "Completed" },
                receivedAmount: 0,
                payoutsReceived: 0,
                deadlineTs: null,
              }
            }
          })
        )

        let totalContributedStroops = 0
        let totalReceivedStroops = 0
        let activeGroups = 0
        let payoutsReceivedCount = 0
        let nextDeadline: number | null = null
        let nextAmountStroops = 0

        for (const result of groupResults) {
          totalContributedStroops += result.member.totalContributed
          totalReceivedStroops += result.receivedAmount
          payoutsReceivedCount += result.payoutsReceived

          if (result.group.status !== "Completed") {
            activeGroups += 1
          }

          if (result.deadlineTs !== null) {
            if (nextDeadline === null || result.deadlineTs < nextDeadline) {
              nextDeadline = result.deadlineTs
              nextAmountStroops = result.group.contributionAmount
            }
          }
        }

        if (!active) return

        const finalStats = {
          totalContributed: troopsToXLM(totalContributedStroops),
          totalReceived: troopsToXLM(totalReceivedStroops),
          activeGroups,
          groupCount: groupIds.length,
          payoutsReceived: payoutsReceivedCount,
          nextPaymentDeadline: nextDeadline,
          nextPaymentAmount: troopsToXLM(nextAmountStroops),
        }

        logDebug("Final stats", finalStats)

        setStats(finalStats)
        setStatus("ready")
      } catch (err) {
        logDebug("fetchStats failed", err)
        if (!active) return
        setErrorMessage(err instanceof Error ? err.message : "Unknown error")
        // Keep stats as-is or reset to defaults
        setStats({ ...DEFAULT_STATS })
        setStatus("error")
      }
    }

    fetchStats()

    return () => {
      active = false
    }
  }, [walletAddress])

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
