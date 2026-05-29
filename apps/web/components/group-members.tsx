"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useSavingsContract, type Member, type MemberStatus } from "@/context/savingsContract"
import { useWallet } from "@/hooks/use-wallet"

interface GroupMembersProps {
  groupId: string
}

type BadgeVariant = "received" | "paid" | "pending" | "overdue"

interface DisplayMember {
  address: string
  position: number
  status: BadgeVariant
  joinedAt: string
  isYou: boolean
}

const STATUS_TO_VARIANT: Record<MemberStatus, BadgeVariant> = {
  Active: "pending",
  PaidCurrentRound: "paid",
  Overdue: "overdue",
  Defaulted: "overdue",
  ReceivedPayout: "received",
}

function formatJoinedAt(joinTimestamp: bigint): string {
  const seconds = Number(joinTimestamp)
  if (!Number.isFinite(seconds) || seconds <= 0) return "Unknown"
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function GroupMembers({ groupId }: GroupMembersProps) {
  const { getMembersByGroup, isReady } = useSavingsContract()
  const { publicKey } = useWallet()
  const canFetch = Boolean(groupId) && isReady
  const [members, setMembers] = useState<DisplayMember[]>([])
  const [loading, setLoading] = useState(canFetch)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canFetch) return
    let cancelled = false

    const run = async () => {
      try {
        const raw = await getMembersByGroup(groupId)
        if (cancelled) return
        const mapped: DisplayMember[] = raw.map((m: Member) => ({
          address: shortAddress(m.address),
          position: m.joinOrder,
          status: STATUS_TO_VARIANT[m.status] ?? "pending",
          joinedAt: formatJoinedAt(m.joinTimestamp),
          isYou: publicKey != null && m.address === publicKey,
        }))
        setMembers(mapped)
        setError(null)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load members")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [canFetch, groupId, getMembersByGroup, publicKey])

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">
          Members{loading ? "" : ` (${members.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-error">{error}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members in this group yet.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.address}
                className={`flex items-center justify-between rounded-lg border p-3 ${member.isYou ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      #{member.position}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">{member.address}</span>
                      {member.isYou && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Position #{member.position} • Joined {member.joinedAt}
                    </p>
                  </div>

                </div>
                <MemberStatusBadge status={member.status} />
              </div>

            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MemberStatusBadge({ status }: { status: BadgeVariant }) {
  const config = {
    received: { label: "🎉 Received", className: "bg-stellar/10 text-stellar border-stellar/20" },
    paid: { label: "✅ Paid", className: "bg-primary/10 text-primary border-primary/20" },
    pending: { label: "⏳ Pending", className: "bg-warning/10 text-warning-dark border-warning/20" },
    overdue: { label: "⚠️ Overdue", className: "bg-error/10 text-error border-error/20" },
  }


  const { label, className } = config[status]

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
