'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for handling async errors in components.
 * Returns an error state, a clear function, and a wrapper for async operations.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { error, clearError, withErrorHandling } = useAsyncErrorHandler();
 *
 *   if (error) return <ErrorDisplay error={error} onRetry={clearError} />;
 *
 *   const handleClick = () => withErrorHandling(async () => { ... });
 * }
 * ```
 */
export function useAsyncErrorHandler() {
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const withErrorHandling = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      setError(null);
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return undefined;
    }
  }, []);

  return { error, clearError, withErrorHandling };
}
