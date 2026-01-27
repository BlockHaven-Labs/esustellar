"use client"

import { useState } from "react"
import { Wallet, AlertCircle } from "lucide-react"

import { useWallet } from "@/hooks/use-wallet"

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

export function CreateGroupForm() {
  const { isConnected, connect } = useWallet()
  const [isPrivate, setIsPrivate] = useState(false)

  /* ----------------------------
   * WALLET NOT CONNECTED STATE
   * ---------------------------- */
  if (!isConnected) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Connect Your Wallet</CardTitle>
          <CardDescription>
            You must connect a Stellar wallet to create a savings group
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          <Button size="lg" onClick={connect}>
            <Wallet className="mr-2 h-5 w-5" />
            Connect Wallet
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have a wallet?{" "}
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Download Freighter
            </a>
          </p>
        </CardContent>
      </Card>
    )
  }

  /* ----------------------------
   * CONNECTED STATE
   * ---------------------------- */
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Group Details</CardTitle>
        <CardDescription>
          Connected wallet:{" "}
          {/* <span className="font-mono text-sm">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span> */}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-6">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g., Lagos Professionals"
              maxLength={50}
              required
            />
            <p className="text-xs text-muted-foreground">
              Max 50 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your savings group..."
              rows={3}
            />
          </div>

          {/* Contribution */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Contribution Amount (XLM)
            </Label>
            <Input
              id="amount"
              type="number"
              min={10}
              placeholder="50"
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 XLM
            </p>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label htmlFor="members">Number of Members</Label>
            <Input
              id="members"
              type="number"
              min={3}
              max={20}
              placeholder="10"
              required
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Contribution Frequency</Label>
            <Select defaultValue="monthly">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" required />
            <p className="text-xs text-muted-foreground">
              Must be a future date
            </p>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Private Group</Label>
              <p className="text-sm text-muted-foreground">
                Only invited members can join
              </p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {/* Fee Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A small Stellar network fee may apply when the group is activated.
            </AlertDescription>
          </Alert>

          <Button type="submit" size="lg" className="w-full">
            Create Group
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
