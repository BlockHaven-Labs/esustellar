'use client'

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GroupsFilter } from "@/components/groups-filter"
import { GroupCard } from "@/components/group-card"
import { useRegistryContract, type GroupInfo } from "@/context/registryContract"

type DisplayGroup = {
  id: string
  name: string
  contributionAmount: number
  frequency: string
  totalMembers: number
  currentMembers: number
  status: string
  currentRound: number
  nextPayout: string
}

function toDisplayGroup(info: GroupInfo): DisplayGroup {
  return {
    id: info.group_id,
    name: info.name,
    // contributionAmount / frequency / currentRound / nextPayout are not
    // yet in GroupInfo. Issue #45 explicitly accepts placeholders here;
    // a follow-up will surface them once the registry exposes them.
    contributionAmount: 0,
    frequency: "—",
    totalMembers: info.total_members,
    currentMembers: info.total_members,
    status: info.is_public ? "Open" : "Closed",
    currentRound: 0,
    nextPayout: "—",
  }
}

export default function GroupsPage() {
  const { getAllPublicGroups } = useRegistryContract()
  const [groups, setGroups] = useState<DisplayGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const infos = await getAllPublicGroups()
        if (cancelled) return
        setGroups(infos.map(toDisplayGroup))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load groups.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getAllPublicGroups])

  const isLoading = groups === null && error === null

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

          {isLoading ? (
            <div className="mt-8 text-sm text-muted-foreground">Loading groups…</div>
          ) : error ? (
            <div
              className="mt-8 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              role="alert"
            >
              Could not load groups: {error}
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <div className="mt-8 text-sm text-muted-foreground">
              No public savings groups yet. Check back soon.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
