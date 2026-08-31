"use client";

import { useState } from "react";
import { Wallet, AlertCircle, Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";

import { useWallet } from "@/hooks/use-wallet";
import { useSavingsContract, type Frequency } from "@/context/savingsContract";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRegistryContract } from "@/context/registryContract";
import { logger } from "@/lib/logger";

const STEPS = ["Basic Info", "Parameters", "Review & Confirm"];

function validateStep1(groupName: string, isPrivate: boolean): string | null {
  if (!groupName.trim()) return "Group name is required";
  if (groupName.length > 64) return "Group name must be 64 characters or less";
  return null;
}

function validateStep2(
  contributionAmount: string,
  totalMembers: string,
  startDate: string
): string | null {
  const amount = parseFloat(contributionAmount);
  if (isNaN(amount) || amount < 10) return "Contribution amount must be at least 10 XLM";
  if (amount > 100000) return "Contribution amount exceeds maximum";

  const members = parseInt(totalMembers);
  if (isNaN(members) || members < 3 || members > 20)
    return "Number of members must be between 3 and 20";

  if (!startDate) return "Please select a start date";

  const startTimestamp = new Date(startDate).getTime() / 1000;
  const currentTime = Math.floor(Date.now() / 1000);
  if (startTimestamp <= currentTime) return "Start date must be in the future";

  const maxOffset = 365 * 24 * 60 * 60;
  if (startTimestamp > currentTime + maxOffset)
    return "Start date must be within one year";

  return null;
}

export default function CreateGroupForm() {
  const { isConnected, connect, publicKey } = useWallet();
  const contract = useSavingsContract();
  const registryContract = useRegistryContract();

  const [step, setStep] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [totalMembers, setTotalMembers] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [startDate, setStartDate] = useState("");

  const handleNext = () => {
    setError(null);
    if (step === 0) {
      const err = validateStep1(groupName, isPrivate);
      if (err) { setError(err); return; }
    }
    if (step === 1) {
      const err = validateStep2(contributionAmount, totalMembers, startDate);
      if (err) { setError(err); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!isConnected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    const finalErr = validateStep2(contributionAmount, totalMembers, startDate);
    if (finalErr) { setError(finalErr); return; }

    setIsLoading(true);

    try {
      const amount = parseFloat(contributionAmount);
      const contributionStroops = BigInt(Math.floor(amount * 10_000_000));
      const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const startTimestamp = new Date(startDate).getTime() / 1000;

      logger.info("Creating group with params", {
        groupId, name: groupName, contributionAmount: contributionStroops.toString(),
        totalMembers: parseInt(totalMembers), frequency, startTimestamp, isPublic: !isPrivate,
      });

      const result = await contract.createGroup({
        groupId, name: groupName, contributionAmount: contributionStroops,
        totalMembers: parseInt(totalMembers), frequency,
        startTimestamp: BigInt(Math.floor(startTimestamp)), isPublic: !isPrivate,
      });

      logger.info("Group created successfully", { result });

      try {
        await registryContract.registerGroup({
          contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ID!,
          groupId, name: groupName, admin: publicKey, isPublic: !isPrivate,
          totalMembers: parseInt(totalMembers),
        });
        logger.info("Group registered in Registry contract");
      } catch (registryErr) {
        logger.error("Failed to register in Registry", { error: registryErr instanceof Error ? registryErr.message : String(registryErr) });
        setError("Group created but failed to register. Please contact support.");
        return;
      }

      setSuccess(true);
      setGroupName(""); setDescription(""); setContributionAmount("");
      setTotalMembers(""); setStartDate(""); setIsPrivate(false);

      setTimeout(() => { window.location.href = "/dashboard"; }, 5000);
    } catch (err: unknown) {
      logger.error("Error creating group", { error: err instanceof Error ? err.message : String(err) });
      setError(err instanceof Error ? err.message : "Failed to create group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-2xl">
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
                  <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer"
                     className="text-primary hover:underline">Download Freighter</a>
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-2xl">
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Create Savings Group</CardTitle>
        <CardDescription>
          Connected: <span className="font-mono text-sm">{publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i < step ? "bg-primary text-primary-foreground"
                : i === step ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-border sm:w-12" />}
            </div>
          ))}
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Group created successfully! Redirecting to dashboard...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Basic Info */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input id="name" placeholder="e.g., Lagos Professionals" maxLength={64}
                value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <p className="text-xs text-muted-foreground">Max 64 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input id="description" placeholder="Describe your savings group..."
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isPrivate">Private Group</Label>
                <p className="text-sm text-muted-foreground">Only invited members can join</p>
              </div>
              <Switch id="isPrivate" checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
          </div>
        )}

        {/* Step 2: Parameters */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Contribution Amount (XLM) *</Label>
              <Input id="amount" type="number" min={10} step="0.01" placeholder="50"
                value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">Minimum 10 XLM, Maximum 100,000 XLM</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="members">Number of Members *</Label>
              <Input id="members" type="number" min={3} max={20} placeholder="10"
                value={totalMembers} onChange={(e) => setTotalMembers(e.target.value)} />
              <p className="text-xs text-muted-foreground">Between 3 and 20 members</p>
            </div>
            <div className="space-y-2">
              <Label>Contribution Frequency *</Label>
              <Select value={frequency} onValueChange={(val) => setFrequency(val as Frequency)}>
                <SelectTrigger aria-label="Contribution frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="BiWeekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input id="startDate" type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]} />
              <p className="text-xs text-muted-foreground">Must be a future date within one year</p>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review Your Group</h3>
            <div className="rounded-lg border divide-y">
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Name</span><span className="font-medium">{groupName}</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Visibility</span><span className="font-medium">{isPrivate ? "Private" : "Public"}</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Contribution</span><span className="font-medium">{contributionAmount} XLM</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Members</span><span className="font-medium">{totalMembers}</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Frequency</span><span className="font-medium">{frequency}</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Start Date</span><span className="font-medium">{startDate}</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Platform Fee</span><span className="font-medium">2%</span></div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A 2% platform fee and Stellar network fees will apply. You will be
                prompted to sign the transaction in Freighter.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {step > 0 ? (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : <div />}
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={isLoading}>
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading || !contract.isReady} size="lg">
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Group...</>
              ) : (
                "Create Group"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
