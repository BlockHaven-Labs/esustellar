import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

const transactions = [
  {
    type: "contribution",
    from: "GHIJ...L6RS",
    amount: 50,
    timestamp: "Jan 9, 2026 14:32",
    txHash: "tx123...abc",
  },
  {
    type: "contribution",
    from: "GNOP...P0VW",
    amount: 50,
    timestamp: "Jan 9, 2026 12:15",
    txHash: "tx124...def",
  },
  {
    type: "payout",
    to: "GAKM...F9KL",
    amount: 400,
    timestamp: "Jan 1, 2026 00:00",
    txHash: "tx125...ghi",
  },
  {
    type: "contribution",
    from: "GDQP...X7KL",
    amount: 50,
    timestamp: "Dec 28, 2025 09:45",
    txHash: "tx126...jkl",
  },
]

interface GroupTransactionsProps {
  groupId: string
}

export function GroupTransactions({ groupId }: GroupTransactionsProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <div key={index} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    tx.type === "payout" ? "bg-primary/10" : "bg-warning/10"
                  }`}
                >
                  {tx.type === "payout" ? (
                    <ArrowDownLeft className="h-5 w-5 text-primary" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {tx.type === "payout" ? `Payout to ${tx.to}` : `Contribution from ${tx.from}`}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tx.timestamp}</span>
                    <span>•</span>
                    <a href="#" className="text-stellar hover:underline font-mono">
                      {tx.txHash}
                    </a>
                  </div>
                </div>
              </div>
              <span className={`font-semibold ${tx.type === "payout" ? "text-primary" : "text-foreground"}`}>
                {tx.type === "payout" ? "+" : ""}
                {tx.amount} XLM
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
