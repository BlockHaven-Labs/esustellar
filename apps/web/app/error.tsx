"use client";

import { useEffect } from "react";
import { RpcErrorFallback } from "@/components/error-boundary/rpc-error-fallback";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("route segment crashed", {
      error: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <RpcErrorFallback error={error} reset={reset} />
    </div>
  );
}
