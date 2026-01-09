import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Lock, Zap, BarChart3, Users2, Bell } from "lucide-react"

const features = [
  {
    icon: Lock,
    title: "Smart Contract Security",
    description:
      "Funds are locked and managed by audited Soroban smart contracts - no single person controls the money.",
  },
  {
    icon: Globe,
    title: "On-Chain Transparency",
    description: "Every contribution and payout is recorded on the Stellar blockchain for complete transparency.",
  },
  {
    icon: Zap,
    title: "Instant Settlements",
    description: "Lightning-fast transactions on Stellar mean payouts arrive in seconds, not days.",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    description: "Real-time dashboard showing group contributions, upcoming payouts, and your savings history.",
  },
  {
    icon: Users2,
    title: "Flexible Groups",
    description: "Create public or private groups with customizable contribution amounts and frequencies.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Never miss a contribution deadline with automated notifications and payment reminders.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            Why Choose EsuStellar?
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            We combine the trust of traditional savings groups with the power of blockchain technology.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="border-border bg-card hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
