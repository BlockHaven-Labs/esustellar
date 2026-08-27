"use client";

import * as React from "react";
import { logger } from "@/lib/logger";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Render the fallback UI for a caught error. Receives the error and a
   * reset() callback that clears the boundary's error state and re-renders
   * children, so the fallback can offer a real retry rather than requiring
   * a full page reload.
   */
  fallback: (error: Error, reset: () => void) => React.ReactNode;
  /** Optional label included in the logged error, e.g. "group-detail-page". */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * React only supports error boundaries as class components — there is no
 * hook equivalent. Catches errors thrown during rendering, in lifecycle
 * methods, and in constructors of the component tree below it (NOT errors
 * in event handlers or async code outside render — those are handled by
 * useTxToast / try-catch at the call site instead).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(`${this.props.label ?? "component"} crashed`, {
      error: error.message,
      componentStack: info.componentStack,
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}
