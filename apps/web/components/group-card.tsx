import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Coins } from "lucide-react"

interface GroupCardProps {
  group: {
    id: string
    name: string
    contributionAmount: number
    frequency: string
    totalMembers: number
    currentMembers: number
    status: string
    currentRound: number
    nextPayout: string
  }
}

export function GroupCard({ group }: GroupCardProps) {
  const spotsLeft = group.totalMembers - group.currentMembers

  const statusColors = {
    Open: "bg-primary/10 text-primary border-primary/20",
    Active: "bg-stellar/10 text-stellar border-stellar/20",
    Completed: "bg-muted text-muted-foreground border-border",
    Full: "bg-warning/10 text-warning-dark border-warning/20",
  }

  return (
    <Card className="border-border bg-card hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-foreground">{group.name}</CardTitle>
          <Badge variant="outline" className={statusColors[group.status as keyof typeof statusColors]}>
            {group.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">{group.contributionAmount} XLM</span>
          <span>/ {group.frequency}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-stellar" />
          <span>
            {group.currentMembers}/{group.totalMembers} members
          </span>
          {spotsLeft > 0 && group.status === "Open" && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground text-xs">
              {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-warning" />
          <span>Round {group.currentRound}</span>
          {group.nextPayout !== "-" && group.nextPayout !== "TBD" && (
            <span className="text-xs">• Next payout: {group.nextPayout}</span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
          asChild
          disabled={group.status === "Completed" || group.status === "Full"}
        >
          <Link href={`/groups/${group.id}`}>{group.status === "Open" ? "Join Group" : "View Details"}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
