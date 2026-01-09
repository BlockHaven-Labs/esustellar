import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Users, Calendar, Coins, Clock, ExternalLink } from "lucide-react"

interface GroupHeaderProps {
  group: {
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
  }
}

export function GroupHeader({ group }: GroupHeaderProps) {
  const progress = (group.currentRound / group.totalMembers) * 100

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Info */}
          <div className="space-y-4 flex-1">
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
              <Badge variant="outline" className="bg-stellar/10 text-stellar border-stellar/20">
                {group.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{group.description}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatItem
                icon={Coins}
                label="Contribution"
                value={`${group.contributionAmount} XLM`}
                subtext={group.frequency}
              />
              <StatItem
                icon={Users}
                label="Members"
                value={`${group.currentMembers}/${group.totalMembers}`}
                subtext={`${group.totalMembers - group.currentMembers} spots left`}
              />
              <StatItem
                icon={Calendar}
                label="Current Round"
                value={`${group.currentRound}/${group.totalMembers}`}
                subtext={`${progress.toFixed(0)}% complete`}
              />
              <StatItem icon={Clock} label="Pool Balance" value={`${group.totalPool} XLM`} subtext="Next payout soon" />
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Group Progress</span>
                <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 lg:w-64">
            {group.isMember ? (
              <>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary-dark"
                  disabled={group.hasPaidThisRound}
                >
                  {group.hasPaidThisRound ? "✅ Paid This Round" : "Make Contribution"}
                </Button>
                <Button variant="outline" className="border-border bg-transparent">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Explorer
                </Button>
              </>
            ) : (
              <Button className="bg-primary text-primary-foreground hover:bg-primary-dark">Join This Group</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}
