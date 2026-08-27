"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface PayoutEntry {
  round: number;
  recipient: string;
  amount: number;
  timestamp: number;
  isCompleted: boolean;
}

interface PayoutTimelineProps {
  groupId: string;
  rounds: PayoutEntry[];
  currentRound: number;
}

function truncateAddress(addr: string): string {
  if (!addr) return "???";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatAmount(amount: number): string {
  const xlm = amount / 10_000_000;
  return `${xlm.toFixed(2)} XLM`;
}

function formatTimestamp(ts: number): string {
  if (!ts) return "Pending";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PayoutTimeline({ groupId, rounds, currentRound }: PayoutTimelineProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Payout Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rounds.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payout data available
          </p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-0">
              {rounds.map((entry, index) => (
                <div key={entry.round} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  {/* Timeline node */}
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center">
                    {entry.isCompleted ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    ) : entry.round === currentRound ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground text-sm">
                        Round {entry.round}
                      </p>
                      <Badge
                        variant={entry.isCompleted ? "default" : entry.round === currentRound ? "secondary" : "outline"}
                        className="text-xs shrink-0"
                      >
                        {entry.isCompleted ? "Paid" : entry.round === currentRound ? "Current" : "Pending"}
                      </Badge>
                    </div>
                    {entry.recipient ? (
                      <div className="mt-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-mono">{truncateAddress(entry.recipient)}</span>
                          {" — "}
                          <span className="font-medium text-foreground">{formatAmount(entry.amount)}</span>
                        </p>
                        {entry.isCompleted && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTimestamp(entry.timestamp)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        No payout yet
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
