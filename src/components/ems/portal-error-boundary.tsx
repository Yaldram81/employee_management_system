'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface PortalErrorBoundaryProps {
  children: ReactNode;
  /** Name of the portal/section for error context */
  portalName?: string;
  /** Optional custom fallback */
  fallback?: ReactNode;
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PortalErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class PortalErrorBoundary extends Component<PortalErrorBoundaryProps, PortalErrorBoundaryState> {
  constructor(props: PortalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(
      `[PortalErrorBoundary${this.props.portalName ? `: ${this.props.portalName}` : ''}]`,
      error,
      errorInfo
    );
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    // Import store lazily to avoid circular deps
    import('@/lib/store').then(({ useEMSStore }) => {
      useEMSStore.getState().setActiveView('dashboard');
    });
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          portalName={this.props.portalName}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({
  error,
  errorInfo,
  portalName,
  onRetry,
  onGoHome,
}: {
  error?: Error;
  errorInfo?: ErrorInfo;
  portalName?: string;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center"
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-rose-400" />
        </div>
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Bug className="h-3 w-3 text-amber-400" />
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">
          {portalName ? `${portalName} Error` : 'Something went wrong'}
        </h3>
        <p className="text-sm text-muted-foreground">
          This section encountered an unexpected error. Your data is safe — you can try again or navigate back to the dashboard.
        </p>
        {error?.message && (
          <p className="text-xs text-rose-400/80 font-mono bg-rose-500/5 px-3 py-1.5 rounded-md mt-2">
            {error.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.12] dark:hover:border-white/[0.2]"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </Button>
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white"
          onClick={onGoHome}
        >
          <Home className="h-3.5 w-3.5" /> Go to Dashboard
        </Button>
      </div>

      {/* Collapsible error details for debugging */}
      {errorInfo && (
        <div className="w-full max-w-lg">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showDetails ? 'Hide' : 'Show'} technical details
          </button>
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <pre className="mt-3 text-[10px] text-muted-foreground bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05] rounded-lg p-4 text-left overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
                  <code>
                    {error?.stack || error?.message || 'Unknown error'}{'\n\n'}
                    Component Stack:{'\n'}
                    {errorInfo.componentStack}
                  </code>
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
