'use client'

import type React from 'react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Calendar, Coins, Clock, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSavingsContract } from '@/context/savingsContract'
import { useWallet } from '@/hooks/use-wallet'
import { useJoinGroup } from '@/hooks/use-join'

interface GroupHeaderProps {
  group: {
    groupId: string           // required — used for contract calls
    name: string
    description: string
    contributionAmount: number // in XLM (already converted from stroops)
    frequency: string
    totalMembers: number
    currentMembers: number
    currentRound: number
    status: string
    totalPool: number
    nextPayoutDate: string
    nextPayoutRecipient: string
    isMember: boolean
    hasPaidThisRound: boolean
  }
  onActionSuccess?: () => void  // optional callback to trigger data refetch in parent
}

export function GroupHeader({ group, onActionSuccess }: GroupHeaderProps) {
  const { publicKey } = useWallet()
  const savings = useSavingsContract()
  const { join, isLoading: isJoining, step: joinStep, error: joinError, reset: resetJoin } = useJoinGroup()

  const [isContributing, setIsContributing] = useState(false)
  const [contributeError, setContributeError] = useState<string | null>(null)
  const [contributeSuccess, setContributeSuccess] = useState(false)

  const progress = (group.currentRound / group.totalMembers) * 100

  const handleJoin = async () => {
    await join(group.groupId)
    if (joinStep !== 'error') {
      onActionSuccess?.()
    }
  }

  const handleContribute = async () => {
    if (!publicKey) return
    setContributeError(null)
    setContributeSuccess(false)
    setIsContributing(true)

    try {
      await savings.contribute(group.groupId)
      setContributeSuccess(true)
      onActionSuccess?.()
    } catch (err: any) {
      console.error('Contribution failed:', err)
      setContributeError(err.message || 'Contribution failed. Please try again.')
    } finally {
      setIsContributing(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
              <Badge variant="outline" className="bg-stellar/10 text-stellar border-stellar/20">
                {group.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{group.description}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatItem
                icon={Coins}
                label="Contribution"
                value={`${group.contributionAmount} XLM`}
                subtext={group.frequency}
              />
              <StatItem
                icon={Users}
                label="Members"
                value={`${group.currentMembers}/${group.totalMembers}`}
                subtext={`${group.totalMembers - group.currentMembers} spots left`}
              />
              <StatItem
                icon={Calendar}
                label="Current Round"
                value={`${group.currentRound}/${group.totalMembers}`}
                subtext={`${progress.toFixed(0)}% complete`}
              />
              <StatItem
                icon={Clock}
                label="Pool Balance"
                value={`${group.totalPool} XLM`}
                subtext="Next payout soon"
              />
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Group Progress</span>
                <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 lg:w-64">

            {/* Feedback alerts */}
            {joinError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{joinError}</AlertDescription>
              </Alert>
            )}
            {joinStep === 'done' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-800">
                  You have joined the group!
                </AlertDescription>
              </Alert>
            )}
            {contributeError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{contributeError}</AlertDescription>
              </Alert>
            )}
            {contributeSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-800">
                  Contribution recorded!
                </AlertDescription>
              </Alert>
            )}

            {group.isMember ? (
              <>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary-dark"
                  disabled={group.hasPaidThisRound || isContributing || group.status !== 'Active'}
                  onClick={handleContribute}
                >
                  {isContributing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : group.hasPaidThisRound ? (
                    '✅ Paid This Round'
                  ) : (
                    'Make Contribution'
                  )}
                </Button>
                <Button variant="outline" className="border-border bg-transparent" asChild>
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${process.env.NEXT_PUBLIC_SAVINGS_CONTRACT_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Explorer
                  </a>
                </Button>
              </>
            ) : (
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary-dark"
                disabled={isJoining || group.status !== 'Open' || joinStep === 'done'}
                onClick={handleJoin}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {joinStep === 'joining' ? 'Joining...' : 'Registering...'}
                  </>
                ) : (
                  'Join This Group'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatItem({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ElementType
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}