"use client";

import { useState } from "react";
import { Wallet, AlertCircle, Loader2 } from "lucide-react";

import { useWallet } from "@/hooks/use-wallet";
import { useSavingsContract, type Frequency } from "@/context/savingsContract";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRegistryContract } from "@/context/registryContract";

export default function CreateGroupForm() {
  const { isConnected, connect, publicKey } = useWallet();
  const contract = useSavingsContract();
  const registryContract = useRegistryContract();

  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [totalMembers, setTotalMembers] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [startDate, setStartDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isConnected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    // Validation
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount < 10) {
      setError("Contribution amount must be at least 10 XLM");
      return;
    }

    const members = parseInt(totalMembers);
    if (isNaN(members) || members < 3 || members > 20) {
      setError("Number of members must be between 3 and 20");
      return;
    }

    if (!startDate) {
      setError("Please select a start date");
      return;
    }

    const startTimestamp = new Date(startDate).getTime() / 1000;
    const currentTime = Math.floor(Date.now() / 1000);

    if (startTimestamp <= currentTime) {
      setError("Start date must be in the future");
      return;
    }

    const bufferedTimestamp = startTimestamp + 3600;

    setIsLoading(true);

    try {
      // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
      const contributionStroops = BigInt(Math.floor(amount * 10_000_000));

       const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // const groupId = generateGroupId();
      // Example: "grp1739721234567abc12345"

      console.log("Creating group with params:", {
        groupId,
        name: groupName,
        contributionAmount: contributionStroops.toString(),
        totalMembers: members,
        frequency,
        startTimestamp: BigInt(Math.floor(bufferedTimestamp)),
        isPublic: !isPrivate,
      });

      const result = await contract.createGroup({
        groupId,
        name: groupName,
        contributionAmount: contributionStroops,
        totalMembers: members,
        frequency,
        startTimestamp: BigInt(Math.floor(startTimestamp)),
        isPublic: !isPrivate,
      });

      console.log("Group created successfully:", result);

      // Step 2: Register group in Registry contract
      try {
        await registryContract.registerGroup({
          contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ID!, // Savings contract address
          groupId,
          name: groupName,
          admin: publicKey,
          isPublic: !isPrivate,
          totalMembers: members,
        });

        console.log("Group registered in Registry contract");
      } catch (registryErr) {
        console.error("Failed to register in Registry:", registryErr);

        setError("Group created but failed to register. Please contact support.");
        return;
      }

      setSuccess(true);

      // Reset form
      setGroupName("");
      setDescription("");
      setContributionAmount("");
      setTotalMembers("");
      setStartDate("");
      setIsPrivate(false);

      // Optional: Redirect to groups page after a delay
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 5000);
    } catch (err: any) {
      console.error("Error creating group:", err);
      setError(err.message || "Failed to create group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
    );
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
          <span className="font-mono text-sm">
            {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Group created successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe your savings group..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Contribution */}
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

          {/* Members */}
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
            <p className="text-xs text-muted-foreground">
              Between 3 and 20 members
            </p>
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
              min={new Date().toISOString().split("T")[0]}
              required
              disabled={isLoading}
            />
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
              A 2% platform fee and Stellar network fees will apply. You will be
              prompted to sign the transaction in Freighter.
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading || !contract.isReady}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Group...
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


