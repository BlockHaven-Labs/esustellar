import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, ArrowRight } from "lucide-react"

const myGroups = [
  {
    id: "1",
    name: "Lagos Professionals",
    contribution: 50,
    totalMembers: 10,
    currentRound: 3,
    myPosition: 5,
    status: "paid",
    progress: 30,
  },
  {
    id: "2",
    name: "Tech Workers Circle",
    contribution: 100,
    totalMembers: 12,
    currentRound: 5,
    myPosition: 8,
    status: "pending",
    progress: 42,
  },
  {
    id: "4",
    name: "Small Business Fund",
    contribution: 75,
    totalMembers: 15,
    currentRound: 8,
    myPosition: 2,
    status: "received",
    progress: 53,
  },
]

export function MyGroups() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">My Groups</CardTitle>
        <Button variant="outline" size="sm" className="border-border bg-transparent" asChild>
          <Link href="/create">
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {myGroups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{group.name}</h4>
                  <StatusBadge status={group.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {group.contribution} XLM • Round {group.currentRound}/{group.totalMembers} • Position #
                  {group.myPosition}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Progress value={group.progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{group.progress}%</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark" asChild>
                <Link href={`/groups/${group.id}`}>
                  View
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    paid: "bg-primary/10 text-primary border-primary/20",
    pending: "bg-warning/10 text-warning-dark border-warning/20",
    received: "bg-stellar/10 text-stellar border-stellar/20",
  }

  const labels = {
    paid: "✅ Paid",
    pending: "⏳ Payment Due",
    received: "🎉 Received",
  }

  return (
    <Badge variant="outline" className={variants[status as keyof typeof variants]}>
      {labels[status as keyof typeof labels]}
    </Badge>
  )
}
