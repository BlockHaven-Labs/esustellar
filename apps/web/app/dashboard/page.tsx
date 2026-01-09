import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { DashboardStats } from "@/components/dashboard-stats"
import { MyGroups } from "@/components/my-groups"
import { RecentActivity } from "@/components/recent-activity"
import { UpcomingPayments } from "@/components/upcoming-payments"

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Welcome back! Here&apos;s your savings overview.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-muted-foreground">GDQP...X7KL</span>
            </div>
          </div>

          {/* Stats */}
          <DashboardStats />

          {/* Main Grid */}
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <MyGroups />
              <RecentActivity />
            </div>
            <div>
              <UpcomingPayments />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
