"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

import { createGroupOnChain } from "@/lib/create-group"
import { mapContractError } from "@/lib/map-contract-error"

export function CreateGroupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name: "",
    description: "",
    contribution: 10,
    members: 3,
    frequency: "monthly",
    startDate: "",
    isPrivate: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!form.name || form.name.length < 3) {
      return setError("Group name must be at least 3 characters")
    }
    if (form.contribution < 10) {
      return setError("Minimum contribution is 10 XLM")
    }
    if (form.members < 3 || form.members > 20) {
      return setError("Member count must be between 3 and 20")
    }
    if (!form.startDate || new Date(form.startDate) <= new Date()) {
      return setError("Start date must be in the future")
    }

    try {
      setLoading(true)
      await createGroupOnChain(form as any)
      setSuccess(true)
    } catch (err: any) {
      setError(mapContractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Group Details</CardTitle>
        <CardDescription>
          Configure your savings group parameters
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500/30 bg-green-500/5">
              <AlertDescription>
                🎉 Group successfully created on-chain!
              </AlertDescription>
            </Alert>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input
              maxLength={50}
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          {/* Contribution */}
          <div className="space-y-2">
            <Label>Contribution Amount (XLM)</Label>
            <Input
              type="number"
              min={10}
              value={form.contribution}
              onChange={(e) =>
                setForm({ ...form, contribution: Number(e.target.value) })
              }
            />
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label>Number of Members</Label>
            <Input
              type="number"
              min={3}
              max={20}
              value={form.members}
              onChange={(e) =>
                setForm({ ...form, members: Number(e.target.value) })
              }
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Contribution Frequency</Label>
            <Select
              value={form.frequency}
              onValueChange={(v) =>
                setForm({ ...form, frequency: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Private Group</Label>
              <p className="text-sm text-muted-foreground">
                Only invited members can join
              </p>
            </div>
            <Switch
              checked={form.isPrivate}
              onCheckedChange={(v) =>
                setForm({ ...form, isPrivate: v })
              }
            />
          </div>

          {/* Fee Notice */}
          <Alert className="border-stellar/30 bg-stellar/5">
            <AlertCircle className="h-4 w-4 text-stellar" />
            <AlertDescription>
              Stellar network fee (&lt; 0.01 XLM) applies.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Creating group…" : "Create Group"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
