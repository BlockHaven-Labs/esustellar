"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownLeft, ArrowUpRight, Users, CheckCircle, Plus, Loader2 } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { fetchRecentActivity, Activity } from "@/lib/activityFeed"
import { useSavingsContract } from "@/context/savingsContract"
import Link from "next/link"

export function RecentActivity() {
  const { publicKey } = useWallet()
  const { getGroupName } = useSavingsContract()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadActivities() {
      if (publicKey) {
        setLoading(true)
        try {
          const data = await fetchRecentActivity(publicKey, getGroupName)
          setActivities(data)
        } catch (error) {
          console.error('Error loading activities:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setActivities([])
      }
    }

    loadActivities()
  }, [publicKey, getGroupName])

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {publicKey ? "No recent activity found" : "Connect wallet to view activity"}
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <ActivityIcon type={activity.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {activity.description}
                    {activity.roundNumber !== undefined && (
                      <span className="text-muted-foreground ml-1">(Round {activity.roundNumber})</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                    {activity.groupId && (
                      <Link
                        href={`/groups/${activity.groupId}`}
                        className="text-xs text-stellar hover:underline"
                      >
                        View Group
                      </Link>
                    )}
                    {activity.txHash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${activity.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stellar hover:underline font-mono"
                      >
                        {activity.txHash.slice(0, 4)}...{activity.txHash.slice(-4)}
                      </a>
                    )}
                  </div>
                </div>
                {activity.amount && (
                  <span
                    className={`text-sm font-medium whitespace-nowrap ${
                      activity.type === 'payout'
                        ? 'text-green-500'
                        : activity.type === 'contribution'
                        ? 'text-red-500'
                        : 'text-foreground'
                    }`}
                  >
                    {activity.amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const icons = {
    contribution: {
      icon: ArrowUpRight,
      bg: "bg-red-500/10",
      color: "text-red-500",
    },
    payout: {
      icon: ArrowDownLeft,
      bg: "bg-green-500/10",
      color: "text-green-500",
    },
    joined: {
      icon: Plus,
      bg: "bg-blue-500/10",
      color: "text-blue-500",
    },
    round_end: {
      icon: CheckCircle,
      bg: "bg-muted",
      color: "text-muted-foreground",
    },
  }

  // Fallback to contribution icon if type is unknown
  const config = icons[type as keyof typeof icons] || icons.contribution
  const Icon = config.icon

  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.bg}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
    </div>
  )
}
