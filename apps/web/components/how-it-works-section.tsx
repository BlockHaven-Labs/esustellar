import { Wallet, Users, CalendarCheck, Banknote } from "lucide-react"

const steps = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    description: "Link your Stellar wallet (like Freighter) to get started. No email or password needed.",
  },
  {
    icon: Users,
    title: "Join or Create",
    description: "Browse existing groups or create your own with custom contribution amounts and schedules.",
  },
  {
    icon: CalendarCheck,
    title: "Contribute Monthly",
    description: "Make your fixed contribution each round. Smart contracts track everything automatically.",
  },
  {
    icon: Banknote,
    title: "Receive Payout",
    description: "When it's your turn, receive the pooled funds directly to your wallet. Rinse and repeat!",
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">How It Works</h2>
          <p className="mt-4 text-muted-foreground text-pretty">Get started with EsuStellar in four simple steps</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
              )}

              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <step.icon className="h-7 w-7" />
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-stellar text-xs font-bold text-white">
                  {index + 1}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
