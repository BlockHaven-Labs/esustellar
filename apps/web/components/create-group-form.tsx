'use client'

import { useState } from 'react'
import { Wallet, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

import { useWallet } from '@/hooks/use-wallet'
import { useSavingsContract, type Frequency } from '@/context/savingsContract'
import { useRegistryContract } from '@/context/registryContract'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Tracks which step of the two-step process we're on
// so the user always knows what's happening
type CreationStep =
  | 'idle'
  | 'creating'   // Step 1: savings contract
  | 'registering' // Step 2: registry contract
  | 'done'
  | 'error'

export function CreateGroupForm() {
  const { isConnected, connect, publicKey } = useWallet()
  const contract = useSavingsContract()
  const registryContract = useRegistryContract()

  const [step, setStep] = useState<CreationStep>('idle')
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [groupName, setGroupName] = useState('')
  const [contributionAmount, setContributionAmount] = useState('')
  const [totalMembers, setTotalMembers] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('Monthly')
  const [startDate, setStartDate] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  const isLoading = step === 'creating' || step === 'registering'

  const resetForm = () => {
    setGroupName('')
    setContributionAmount('')
    setTotalMembers('')
    setStartDate('')
    setIsPrivate(false)
    setFrequency('Monthly')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep('idle')

    if (!isConnected || !publicKey) {
      setError('Please connect your wallet first')
      return
    }

    // ── Validation ──────────────────────────────────────────
    const amount = parseFloat(contributionAmount)
    if (isNaN(amount) || amount < 10) {
      setError('Contribution amount must be at least 10 XLM')
      return
    }

    const members = parseInt(totalMembers)
    if (isNaN(members) || members < 3 || members > 20) {
      setError('Number of members must be between 3 and 20')
      return
    }

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const currentTime = Math.floor(Date.now() / 1000)

    if (startTimestamp <= currentTime) {
      setError('Start date must be in the future')
      return
    }

    // ── Step 1: Create group on savings contract ─────────────
    const contributionStroops = BigInt(Math.floor(amount * 10_000_000))
    const groupId = `grp${Date.now()}${Math.random().toString(36).substring(2, 8)}`

    try {
      setStep('creating')

      await contract.createGroup({
        groupId,
        name: groupName,
        contributionAmount: contributionStroops,
        totalMembers: members,
        frequency,
        startTimestamp: BigInt(startTimestamp),
        isPublic: !isPrivate,
      })
    } catch (err: any) {
      console.error('Group creation failed:', err)
      setError(err.message || 'Failed to create group on-chain. Please try again.')
      setStep('error')
      return
    }

    // ── Step 2: Register group in registry contract ──────────
    // This step is critical — if it fails, the group exists on-chain
    // but won't appear in discovery. We retry once before giving up.
    try {
      setStep('registering')

      await registryContract.registerGroup({
        contractAddress: process.env.NEXT_PUBLIC_SAVINGS_CONTRACT_ID!,
        groupId,
        name: groupName,
        admin: publicKey,
        isPublic: !isPrivate,
        totalMembers: members,
      })
    } catch (firstErr) {
      console.warn('Registry registration failed on first attempt, retrying...', firstErr)

      // One automatic retry after 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))

      try {
        await registryContract.registerGroup({
          contractAddress: process.env.NEXT_PUBLIC_SAVINGS_CONTRACT_ID!,
          groupId,
          name: groupName,
          admin: publicKey,
          isPublic: !isPrivate,
          totalMembers: members,
        })
      } catch (retryErr: any) {
        console.error('Registry registration failed after retry:', retryErr)
        // Group IS created on-chain — don't hide that from the user.
        // Show a partial success message so they know what happened.
        setError(
          `Your group was created on-chain (ID: ${groupId}) but could not be registered for discovery. ` +
          `Please contact support with this group ID so we can manually register it.`
        )
        setStep('error')
        return
      }
    }

    // ── Done ─────────────────────────────────────────────────
    setStep('done')
    resetForm()

    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 3000)
  }

  // ── Wallet not connected ──────────────────────────────────
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
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have a wallet?{' '}
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

  // ── Connected ─────────────────────────────────────────────
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Group Details</CardTitle>
        <CardDescription>
          Connected wallet:{' '}
          <span className="font-mono text-sm">
            {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Success */}
          {step === 'done' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Group created and registered successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step indicator while loading */}
          {isLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                {step === 'creating'
                  ? 'Step 1 of 2: Creating your group on-chain...'
                  : 'Step 2 of 2: Registering group for discovery...'}
              </AlertDescription>
            </Alert>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g., Lagos Professionals"
              maxLength={50}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Max 50 characters</p>
          </div>

          {/* Contribution Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Contribution Amount (XLM)</Label>
            <Input
              id="amount"
              type="number"
              min={10}
              step="0.01"
              placeholder="50"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Minimum 10 XLM</p>
          </div>

          {/* Number of Members */}
          <div className="space-y-2">
            <Label htmlFor="members">Number of Members</Label>
            <Input
              id="members"
              type="number"
              min={3}
              max={20}
              placeholder="10"
              value={totalMembers}
              onChange={(e) => setTotalMembers(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Between 3 and 20 members</p>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Contribution Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(val) => setFrequency(val as Frequency)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="BiWeekly">Bi-Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Must be a future date</p>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Private Group</Label>
              <p className="text-sm text-muted-foreground">Only invited members can join</p>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={isLoading}
            />
          </div>

          {/* Fee Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A 2% platform fee and Stellar network fees will apply. You will be prompted
              to sign the transaction in Freighter.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading || !contract.isReady || step === 'done'}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {step === 'creating' ? 'Creating Group...' : 'Registering...'}
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}