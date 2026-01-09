export function StatsSection() {
  const stats = [
    { value: "50+", label: "Savings Groups" },
    { value: "500+", label: "Active Members" },
    { value: "₦2M+", label: "Total Saved" },
    { value: "99%", label: "Payout Success" },
  ]

  return (
    <section className="border-b border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
