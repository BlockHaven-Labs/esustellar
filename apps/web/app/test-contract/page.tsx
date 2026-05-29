'use client'

import { useSavingsContract } from '@/context/savingsContract'
import { useWallet } from '@/hooks/use-wallet'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function TestContractPage() {
  const contract = useSavingsContract()
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [testGroupId, setTestGroupId] = useState('test-group-1')

  // Test Read Methods (No wallet needed)
  const testGetGroup = async () => {
    setLoading(true)
    setError(null)
    try {
      const group = await contract.getGroupById(testGroupId)
      setResult(group)
      console.log('Group:', group)
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testGetAllGroups = async () => {
    setLoading(true)
    setError(null)
    try {
      const groups = await contract.getAllGroups()
      setResult(groups)
      console.log('All Groups:', groups)
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testGetMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      const members = await contract.getMembersByGroup(testGroupId)
      setResult(members)
      console.log('Members:', members)
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testGetMember = async () => {
    if (!wallet.publicKey) {
      setError('Wallet not connected')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const member = await contract.getMemberByGroup(wallet.publicKey, testGroupId)
      setResult(member)
      console.log('Member:', member)
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testGetRoundContributions = async () => {
    setLoading(true)
    setError(null)
    try {
      const contributions = await contract.getRoundContributionsByGroup(testGroupId, 1)
      setResult(contributions)
      console.log('Contributions:', contributions)
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testGetUserGroups = async () => {
    if (!wallet.publicKey) {
      setError('Wallet not connected')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const groups = await contract.getUserGroups(wallet.publicKey)
      setResult(groups)
      console.log('User Groups:', groups)
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Test Write Methods (Wallet required)
  const testCreateGroup = async () => {
    if (!wallet.isConnected) {
      setError('Please connect wallet first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const now = Math.floor(Date.now() / 1000)
    const startTime = now + 86400 * 30 // Tomorrow
    
    console.log('Current time:', now)
    console.log('Start time:', startTime)
    console.log('Difference:', startTime - now, 'seconds')

      const params = {
        groupId: `test-group-${Date.now()}`,
        name: 'Test Savings Group',
        contributionAmount: BigInt(100_000_000), // 10 XLM in stroops
        totalMembers: 5,
        frequency: 'Monthly' as const,
        startTimestamp: BigInt(startTime), // Tomorrow
        isPublic: true,
      }
      
      await contract.createGroup(params)
      setTestGroupId(params.groupId)
      setResult(`Group created successfully! Active Group ID updated to: ${params.groupId}`)
      console.log('Group created:', params.groupId)
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testJoinGroup = async () => {
    if (!wallet.isConnected) {
      setError('Please connect wallet first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await contract.joinGroup(testGroupId)
      setResult('Joined group successfully!')
      console.log('Joined group')
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const testContribute = async () => {
    if (!wallet.isConnected) {
      setError('Please connect wallet first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await contract.contribute(testGroupId)
      setResult('Contribution successful!')
      console.log('Contributed')
    } catch (err: any) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Contract Testing</h1>
        
        {/* Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Contract ID:</strong> {contract.contractId || 'Not set'}</p>
              <p><strong>Ready:</strong> {contract.isReady ? '✅' : '❌'}</p>
              <p><strong>Wallet Connected:</strong> {wallet.isConnected ? '✅' : '❌'}</p>
              <p><strong>Wallet Address:</strong> {wallet.publicKey || 'Not connected'}</p>
              {contract.error && <p className="text-red-500"><strong>Error:</strong> {contract.error}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Test Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <label htmlFor="testGroupIdInput" className="text-sm font-semibold text-foreground">Active Group ID for testing:</label>
              <Input
                id="testGroupIdInput"
                type="text"
                value={testGroupId}
                onChange={(e) => setTestGroupId(e.target.value)}
                placeholder="Enter Group ID"
                className="max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Read Methods */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Read Methods (No Wallet Needed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button onClick={testGetGroup} disabled={loading || !contract.isReady}>
                Get Group
              </Button>
              <Button onClick={testGetAllGroups} disabled={loading || !contract.isReady}>
                Get All Groups
              </Button>
              <Button onClick={testGetMembers} disabled={loading || !contract.isReady}>
                Get Members
              </Button>
              <Button onClick={testGetMember} disabled={loading || !contract.isReady || !wallet.publicKey}>
                Get My Member
              </Button>
              <Button onClick={testGetRoundContributions} disabled={loading || !contract.isReady}>
                Get Contributions (Round 1)
              </Button>
              <Button onClick={testGetUserGroups} disabled={loading || !contract.isReady || !wallet.publicKey}>
                Get My Groups
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Write Methods */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Write Methods (Wallet Required)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={testCreateGroup} 
                disabled={loading || !contract.isReady || !wallet.isConnected}
              >
                Create Group
              </Button>
              <Button 
                onClick={testJoinGroup} 
                disabled={loading || !contract.isReady || !wallet.isConnected}
              >
                Join Group
              </Button>
              <Button 
                onClick={testContribute} 
                disabled={loading || !contract.isReady || !wallet.isConnected}
              >
                Contribute
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded overflow-auto text-sm">
                {JSON.stringify(result, (key, value) =>
                  typeof value === 'bigint' ? value.toString() : value,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mt-4 border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-500 font-bold">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
              <p>Processing transaction...</p>
              <p className="text-sm text-muted-foreground mt-2">Please check Freighter wallet</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}