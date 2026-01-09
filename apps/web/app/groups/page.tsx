import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GroupsFilter } from "@/components/groups-filter"
import { GroupCard } from "@/components/group-card"

// Mock data for groups
const groups = [
  {
    id: "1",
    name: "Lagos Professionals",
    contributionAmount: 50,
    frequency: "Monthly",
    totalMembers: 10,
    currentMembers: 8,
    status: "Open",
    currentRound: 3,
    nextPayout: "2026-02-01",
  },
  {
    id: "2",
    name: "Tech Workers Circle",
    contributionAmount: 100,
    frequency: "Monthly",
    totalMembers: 12,
    currentMembers: 12,
    status: "Active",
    currentRound: 5,
    nextPayout: "2026-01-15",
  },
  {
    id: "3",
    name: "Diaspora Savers",
    contributionAmount: 200,
    frequency: "Monthly",
    totalMembers: 8,
    currentMembers: 6,
    status: "Open",
    currentRound: 1,
    nextPayout: "2026-02-10",
  },
  {
    id: "4",
    name: "Small Business Fund",
    contributionAmount: 75,
    frequency: "Bi-weekly",
    totalMembers: 15,
    currentMembers: 15,
    status: "Active",
    currentRound: 8,
    nextPayout: "2026-01-20",
  },
  {
    id: "5",
    name: "Community Growth",
    contributionAmount: 25,
    frequency: "Weekly",
    totalMembers: 6,
    currentMembers: 4,
    status: "Open",
    currentRound: 0,
    nextPayout: "TBD",
  },
  {
    id: "6",
    name: "Women Entrepreneurs",
    contributionAmount: 150,
    frequency: "Monthly",
    totalMembers: 10,
    currentMembers: 10,
    status: "Completed",
    currentRound: 10,
    nextPayout: "-",
  },
]

export default function GroupsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Browse Savings Groups</h1>
            <p className="mt-2 text-muted-foreground">
              Find a group that matches your savings goals and join the community
            </p>
          </div>

          <GroupsFilter />

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
