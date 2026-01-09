import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GroupHeader } from "@/components/group-header"
import { GroupMembers } from "@/components/group-members"
import { GroupTransactions } from "@/components/group-transactions"
import { GroupPayoutSchedule } from "@/components/group-payout-schedule"

// Mock group data
const groupData = {
  id: "1",
  name: "Lagos Professionals",
  description: "A savings group for professionals in Lagos looking to achieve their financial goals together.",
  contributionAmount: 50,
  frequency: "Monthly",
  totalMembers: 10,
  currentMembers: 8,
  currentRound: 3,
  status: "Active",
  startDate: "2025-11-01",
  totalPool: 400,
  nextPayoutDate: "2026-02-01",
  nextPayoutRecipient: "GAKM...F9KL",
  isAdmin: false,
  isMember: true,
  myPosition: 5,
  hasPaidThisRound: true,
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          <GroupHeader group={groupData} />

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <GroupMembers groupId={id} />
              <GroupTransactions groupId={id} />
            </div>
            <div>
              <GroupPayoutSchedule group={groupData} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
