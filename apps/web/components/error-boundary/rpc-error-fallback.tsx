"use client";

import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { classifyTxError } from "@/lib/tx-error";

export interface RpcErrorFallbackProps {
  error: Error;
  reset: () => void;
  /** Compact mode for section-level boundaries (e.g. a single card in a page), vs a full-page fallback. */
  compact?: boolean;
}

/**
 * Presentational fallback for RPC/contract failures and unexpected render
 * errors. Distinguishes "can't reach the network" from "something in the
 * app broke" so the retry action reads as meaningful rather than generic.
 */
export function RpcErrorFallback({ error, reset, compact = false }: RpcErrorFallbackProps) {
  const classified = classifyTxError(error);
  const isNetworkIssue = classified.kind === "network" || classified.kind === "contract";
  const Icon = isNetworkIssue ? WifiOff : AlertTriangle;

  const title = isNetworkIssue ? "Couldn't load Stellar network data" : "Something went wrong";
  const description = isNetworkIssue
    ? classified.message
    : "This section hit an unexpected error. Retrying usually fixes it.";

  return (
    <Card className={compact ? "border-border bg-card" : "border-border bg-card mx-auto max-w-md"}>
      <CardHeader className={compact ? "py-4" : undefined}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-destructive" />
          <CardTitle className={compact ? "text-base" : undefined}>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={compact ? "py-0 pb-4" : undefined}>
        <Button onClick={reset} variant="outline" size={compact ? "sm" : "default"}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
