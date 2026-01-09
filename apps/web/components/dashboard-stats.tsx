import { Card, CardContent } from "@/components/ui/card"
import { Wallet, TrendingUp, Users, Calendar } from "lucide-react"

const stats = [
  {
    icon: Wallet,
    label: "Total Contributed",
    value: "450 XLM",
    change: "+50 this month",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: TrendingUp,
    label: "Total Received",
    value: "500 XLM",
    change: "1 payout received",
    color: "text-stellar",
    bg: "bg-stellar/10",
  },
  {
    icon: Users,
    label: "Active Groups",
    value: "3",
    change: "2 awaiting payout",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Calendar,
    label: "Next Payment",
    value: "Jan 15",
    change: "50 XLM due",
    color: "text-error",
    bg: "bg-error/10",
  },
]

export function DashboardStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
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
