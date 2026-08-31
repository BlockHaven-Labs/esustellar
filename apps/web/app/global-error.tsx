"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import "./globals.css";

// Deliberately self-contained: this replaces the ENTIRE root layout when
// the layout itself throws, so it cannot depend on WalletProvider,
// ThemeProvider, or the Toaster — none of those are guaranteed to have
// mounted. No shared components from components/ui either, to keep this
// resilient even if a design-system import is what caused the crash.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("root layout crashed", {
      error: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center space-y-4">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error and couldn&apos;t load. This has been logged.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
