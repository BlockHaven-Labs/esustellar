"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Coins } from "lucide-react";
import { useSavingsContract } from "@/context/savingsContract";
import { useWallet } from "@/hooks/use-wallet";

interface ContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  amount: number; // in stroops
  currentRound: number;
}

type TxState = "idle" | "signing" | "pending" | "success" | "failed";

export function ContributionDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  amount,
  currentRound,
}: ContributionDialogProps) {
  const { isConnected, publicKey } = useWallet();
  const contract = useSavingsContract();
  const [txState, setTxState] = useState<TxState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amountXLM = (Number(amount) / 10_000_000).toFixed(2);

  const handleContribute = async () => {
    if (!isConnected || !publicKey) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    setTxState("signing");
    setErrorMessage(null);

    try {
      // Optimistic UI: immediately show pending state
      setTxState("pending");

      await contract.contribute({ groupId });

      setTxState("success");

      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        setTxState("idle");
      }, 2000);
    } catch (err: unknown) {
      setTxState("failed");
      const message = err instanceof Error ? err.message : "Transaction failed";
      setErrorMessage(message);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTxState("idle");
    setErrorMessage(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contribute to Group</DialogTitle>
          <DialogDescription>
            Submit your contribution for round {currentRound}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Group</span>
              <span className="font-medium text-foreground">{groupName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Round</span>
              <Badge variant="secondary">{currentRound}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount</span>
              <div className="flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-bold text-lg text-foreground">{amountXLM} XLM</span>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {txState === "pending" && (
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-800">
                Transaction submitted. Waiting for confirmation...
              </AlertDescription>
            </Alert>
          )}

          {txState === "success" && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Contribution recorded successfully!
              </AlertDescription>
            </Alert>
          )}

          {txState === "failed" && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {txState === "idle" || txState === "failed" ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleContribute} disabled={!contract.isReady}>
                <Coins className="mr-2 h-4 w-4" />
                Contribute {amountXLM} XLM
              </Button>
            </>
          ) : txState === "pending" ? (
            <Button disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </Button>
          ) : txState === "success" ? (
            <Button disabled className="w-full bg-green-600 hover:bg-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Done
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
