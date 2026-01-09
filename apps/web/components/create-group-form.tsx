"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Wallet, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CreateGroupForm() {
  const [isPrivate, setIsPrivate] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const handleConnect = () => {
    // Mock wallet connection
    setIsConnected(true)
  }

  if (!isConnected) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-foreground">Connect Your Wallet</CardTitle>
          <CardDescription className="text-muted-foreground">
            Connect your Stellar wallet to create a savings group
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary-dark"
            onClick={handleConnect}
          >
            <Wallet className="mr-2 h-5 w-5" />
            Connect Freighter Wallet
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            {"Don't have a wallet? "}
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stellar hover:underline"
            >
              Download Freighter
            </a>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">Group Details</CardTitle>
        <CardDescription className="text-muted-foreground">Configure your savings group parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Group Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., Lagos Professionals"
              maxLength={50}
              className="bg-background border-input"
            />
            <p className="text-xs text-muted-foreground">Max 50 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your savings group..."
              className="bg-background border-input resize-none"
              rows={3}
            />
          </div>

          {/* Contribution Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Contribution Amount (XLM)
            </Label>
            <Input id="amount" type="number" min={10} placeholder="50" className="bg-background border-input" />
            <p className="text-xs text-muted-foreground">Minimum 10 XLM per contribution</p>
          </div>

          {/* Number of Members */}
          <div className="space-y-2">
            <Label htmlFor="members" className="text-foreground">
              Number of Members
            </Label>
            <Input
              id="members"
              type="number"
              min={3}
              max={20}
              placeholder="10"
              className="bg-background border-input"
            />
            <p className="text-xs text-muted-foreground">Between 3 and 20 members</p>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-foreground">
              Contribution Frequency
            </Label>
            <Select defaultValue="monthly">
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Select frequency" />
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
            <Label htmlFor="startDate" className="text-foreground">
              Start Date
            </Label>
            <Input id="startDate" type="date" className="bg-background border-input" />
            <p className="text-xs text-muted-foreground">Must be a future date</p>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="private" className="text-foreground">
                Private Group
              </Label>
              <p className="text-sm text-muted-foreground">Only invited members can join</p>
            </div>
            <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {/* Fee Notice */}
          <Alert className="border-stellar/30 bg-stellar/5">
            <AlertCircle className="h-4 w-4 text-stellar" />
            <AlertDescription className="text-stellar-dark">
              A small Stellar network fee ({"<"} 0.01 XLM) will be charged to deploy the smart contract.
            </AlertDescription>
          </Alert>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary-dark">
            Create Group
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
