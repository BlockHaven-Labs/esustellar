import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Gift } from "lucide-react"

interface GroupPayoutScheduleProps {
  group: {
    totalMembers: number
    currentRound: number
    frequency: string
    contributionAmount: number
    nextPayoutDate: string
    nextPayoutRecipient: string
    myPosition: number
  }
}

export function GroupPayoutSchedule({ group }: GroupPayoutScheduleProps) {
  const payoutAmount = group.totalMembers * group.contributionAmount

  // Generate payout schedule
  const schedule = Array.from({ length: group.totalMembers }, (_, i) => ({
    round: i + 1,
    status: i + 1 < group.currentRound ? "completed" : i + 1 === group.currentRound ? "current" : "upcoming",
    isYou: i + 1 === group.myPosition,
  }))

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Payout Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Payout Info */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            Next Payout
          </div>
          <p className="text-xl font-bold text-foreground">{payoutAmount} XLM</p>
          <p className="text-sm text-muted-foreground mt-1">
            {group.nextPayoutDate} → <span className="font-mono">{group.nextPayoutRecipient}</span>
          </p>
        </div>

        {/* Schedule List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Rotation Order</h4>
          <div className="space-y-2">
            {schedule.map((item) => (
              <div
                key={item.round}
                className={`flex items-center justify-between rounded-lg border p-2 ${
                  item.status === "current"
                    ? "border-primary/30 bg-primary/5"
                    : item.isYou
                      ? "border-stellar/30 bg-stellar/5"
                      : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      item.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : item.status === "current"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {item.round}
                  </span>
                  <span className="text-sm text-foreground">Round {item.round}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.isYou && (
                    <Badge variant="outline" className="text-xs bg-stellar/10 text-stellar border-stellar/20">
                      Your Turn
                    </Badge>
                  )}
                  <ScheduleStatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleStatusBadge({ status }: { status: string }) {
  const config = {
    completed: { label: "Done", className: "bg-muted text-muted-foreground border-border" },
    current: { label: "Active", className: "bg-primary/10 text-primary border-primary/20" },
    upcoming: { label: "Pending", className: "bg-secondary text-secondary-foreground border-border" },
  }

  const { label, className } = config[status as keyof typeof config]

  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      {label}
    </Badge>
  )
}
