import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, AlertTriangle } from "lucide-react"

const payments = [
  {
    group: "Tech Workers Circle",
    amount: 100,
    dueDate: "Jan 15, 2026",
    daysLeft: 6,
    urgent: false,
  },
  {
    group: "Lagos Professionals",
    amount: 50,
    dueDate: "Jan 20, 2026",
    daysLeft: 11,
    urgent: false,
  },
  {
    group: "Small Business Fund",
    amount: 75,
    dueDate: "Jan 25, 2026",
    daysLeft: 16,
    urgent: false,
  },
]

export function UpcomingPayments() {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-warning" />
          Upcoming Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${payment.urgent ? "border-error/50 bg-error/5" : "border-border"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-foreground text-sm">{payment.group}</h4>
                {payment.urgent && <AlertTriangle className="h-4 w-4 text-error" />}
              </div>
              <p className="text-lg font-bold text-foreground">{payment.amount} XLM</p>
              <p className="text-xs text-muted-foreground mt-1">
                Due {payment.dueDate} • {payment.daysLeft} days left
              </p>
              <Button size="sm" className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary-dark">
                Pay Now
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
