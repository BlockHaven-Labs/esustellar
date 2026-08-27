"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Coins, ArrowRight, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useSavingsContract } from "@/context/savingsContract";
import { useRegistryContract } from "@/context/registryContract";

interface NextAction {
  type: "contribute" | "payout_received" | "group_full" | "none";
  groupName: string;
  groupId: string;
  amount?: number;
  deadline?: string;
  message: string;
}

export function NextActionCard() {
  const { isConnected, publicKey } = useWallet();
  const savings = useSavingsContract();
  const registry = useRegistryContract();
  const [action, setAction] = useState<NextAction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !publicKey || !savings.isReady) {
      setLoading(false);
      return;
    }

    const fetchNextAction = async () => {
      try {
        const groups = await savings.getUserGroups(publicKey);
        for (const groupId of groups) {
          const [group, member] = await Promise.all([
            savings.getGroupById(groupId),
            savings.getMemberByGroup(publicKey, groupId),
          ]);

          if (group.status === "Active" && member.status !== "PaidCurrentRound") {
            const deadline = await savings.getRoundDeadlineByGroup(groupId, group.currentRound);
            const deadlineDate = new Date(Number(deadline) * 1000);
            const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            setAction({
              type: "contribute",
              groupName: group.name,
              groupId,
              amount: Number(group.contributionAmount) / 10_000_000,
              deadline: `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
              message: daysLeft <= 1 ? "Due now!" : `Due in ${daysLeft} days`,
            });
            setLoading(false);
            return;
          }
        }
        setAction({ type: "none", groupName: "", groupId: "", message: "All caught up!" });
      } catch (err) {
        console.error("Failed to fetch next action:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNextAction();
  }, [isConnected, publicKey, savings]);

  if (!isConnected) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Next Action
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ) : !action || action.type === "none" ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground">No pending actions</p>
            </div>
          </div>
        ) : action.type === "contribute" ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{action.groupName}</p>
                <p className="text-sm text-muted-foreground">
                  {action.amount} XLM contribution
                </p>
              </div>
              <Badge variant={action.deadline === "1 day" ? "destructive" : "secondary"}>
                <Clock className="mr-1 h-3 w-3" />
                {action.message}
              </Badge>
            </div>
            <Button size="sm" className="w-full" asChild>
              <a href={`/group/${action.groupId}`}>
                Contribute Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
