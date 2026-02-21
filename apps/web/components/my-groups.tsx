"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, ArrowRight, RefreshCw } from "lucide-react";
import { useUserGroups } from "@/hooks/useUserGroups";
import { useWallet } from "@/hooks/use-wallet";

export function MyGroups() {
  const { groups, loading, error, refetch } = useUserGroups();
  const { isConnected, connect } = useWallet();

  if (!isConnected) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">My Groups</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your groups
          </p>
          <Button onClick={connect}>Connect Wallet</Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">My Groups</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-transparent"
            disabled
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 rounded-lg border border-border bg-muted/50" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">My Groups</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-transparent"
              asChild
            >
              <Link href="/create">
                <Plus className="mr-2 h-4 w-4" />
                Create New
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">My Groups</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-transparent"
            asChild
          >
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create New
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            You haven't joined any groups yet
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Join a savings group to start saving with your community
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">My Groups</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-transparent"
            asChild
          >
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create New
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{group.name}</h4>
                  <StatusBadge status={group.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {typeof group.contribution === "number" &&
                  !isNaN(group.contribution)
                    ? group.contribution.toFixed(2)
                    : "0.00"}{" "}
                  XLM • Round{" "}
                  {typeof group.currentRound === "number" &&
                  !isNaN(group.currentRound)
                    ? group.currentRound
                    : "-"}
                  /
                  {typeof group.totalMembers === "number" &&
                  !isNaN(group.totalMembers)
                    ? group.totalMembers
                    : "-"}{" "}
                  • Position #{group.myPosition >= 1 ? group.myPosition : "-"}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Progress value={group.progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {group.progress}%
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary-dark"
                asChild
              >
                <Link href={`/groups/${group.id}`}>
                  View
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    paid: "bg-primary/10 text-primary border-primary/20",
    pending: "bg-warning/10 text-warning-dark border-warning/20",
    received: "bg-stellar/10 text-stellar border-stellar/20",
    defaulted: "bg-destructive/10 text-destructive border-destructive/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
    completed: "bg-muted/10 text-muted-foreground border-muted/20",
  };

  const labels = {
    paid: "✅ Paid",
    pending: "⏳ Payment Due",
    received: "🎉 Received",
    defaulted: "❌ Defaulted",
    overdue: "⚠️ Overdue",
    completed: "✓ Completed",
  };

  return (
    <Badge
      variant="outline"
      className={variants[status as keyof typeof variants]}
    >
      {labels[status as keyof typeof labels]}
    </Badge>
  );
}
