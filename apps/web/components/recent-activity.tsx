"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownLeft, ArrowUpRight, Users, CheckCircle, Plus, Loader2 } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { fetchRecentActivity, Activity } from "@/lib/activityFeed"

export function RecentActivity() {
  const { publicKey } = useWallet()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadActivities() {
      if (publicKey) {
        setLoading(true)
        const data = await fetchRecentActivity(publicKey)
        setActivities(data)
        setLoading(false)
      } else {
        setActivities([])
      }
    }

    loadActivities()
  }, [publicKey])

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
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
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
                    className={`text-sm font-medium ${activity.type === "payout" ? "text-primary" : "text-foreground"}`}
                  >
                    {activity.type === "payout" ? "+" : ""}
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
      bg: "bg-warning/10",
      color: "text-warning",
    },
    payout: {
      icon: ArrowDownLeft,
      bg: "bg-primary/10",
      color: "text-primary",
    },
    joined: {
      icon: Users,
      bg: "bg-stellar/10",
      color: "text-stellar",
    },
    created: {
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
