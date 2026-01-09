"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

export function GroupsFilter() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search groups..." className="pl-9 bg-card border-border" />
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select defaultValue="all">
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-[140px] bg-card border-border">
            <SelectValue placeholder="Frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="border-border bg-transparent">
          Clear Filters
        </Button>
      </div>
    </div>
  )
}
