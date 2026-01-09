import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const members = [
  { address: "GDQP...X7KL", position: 1, status: "received", joinedAt: "Nov 2025" },
  { address: "GAKM...F9KL", position: 2, status: "received", joinedAt: "Nov 2025" },
  { address: "GBXC...H2MN", position: 3, status: "paid", joinedAt: "Nov 2025" },
  { address: "GDEF...J4PQ", position: 4, status: "paid", joinedAt: "Nov 2025" },
  { address: "GHIJ...L6RS", position: 5, status: "paid", joinedAt: "Dec 2025", isYou: true },
  { address: "GKLM...N8TU", position: 6, status: "pending", joinedAt: "Dec 2025" },
  { address: "GNOP...P0VW", position: 7, status: "paid", joinedAt: "Dec 2025" },
  { address: "GQRS...R2XY", position: 8, status: "overdue", joinedAt: "Jan 2026" },
]

interface GroupMembersProps {
  groupId: string
}

export function GroupMembers({ groupId }: GroupMembersProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.address}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                member.isYou ? "border-primary/30 bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">#{member.position}</AvatarFallback>
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
      </CardContent>
    </Card>
  )
}

function MemberStatusBadge({ status }: { status: string }) {
  const config = {
    received: { label: "🎉 Received", className: "bg-stellar/10 text-stellar border-stellar/20" },
    paid: { label: "✅ Paid", className: "bg-primary/10 text-primary border-primary/20" },
    pending: { label: "⏳ Pending", className: "bg-warning/10 text-warning-dark border-warning/20" },
    overdue: { label: "⚠️ Overdue", className: "bg-error/10 text-error border-error/20" },
  }

  const { label, className } = config[status as keyof typeof config]

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
