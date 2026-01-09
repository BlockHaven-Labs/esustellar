import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownLeft, ArrowUpRight, Users, CheckCircle } from "lucide-react"

const activities = [
  {
    type: "contribution",
    description: "Contributed to Lagos Professionals",
    amount: "50 XLM",
    time: "2 hours ago",
    txHash: "abc123...",
  },
  {
    type: "payout",
    description: "Received payout from Small Business Fund",
    amount: "1,125 XLM",
    time: "3 days ago",
    txHash: "def456...",
  },
  {
    type: "joined",
    description: "Joined Tech Workers Circle",
    amount: null,
    time: "1 week ago",
    txHash: "ghi789...",
  },
  {
    type: "round",
    description: "Round 8 completed in Small Business Fund",
    amount: null,
    time: "1 week ago",
    txHash: null,
  },
]

export function RecentActivity() {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3">
              <ActivityIcon type={activity.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                  {activity.txHash && (
                    <a href="#" className="text-xs text-stellar hover:underline font-mono">
                      {activity.txHash}
                    </a>
                  )}
                </div>
              </div>
              {activity.amount && (
                <span
                  className={`text-sm font-medium ${activity.type === "payout" ? "text-primary" : "text-foreground"}`}
                >
                  {activity.type === "payout" ? "+" : "-"}
                  {activity.amount}
                </span>
              )}
            </div>
          ))}
        </div>
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
    round: {
      icon: CheckCircle,
      bg: "bg-muted",
      color: "text-muted-foreground",
    },
  }

  const config = icons[type as keyof typeof icons]
  const Icon = config.icon

  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.bg}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
    </div>
  )
}
