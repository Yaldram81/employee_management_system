/**
 * Optimistic Update Helper Utilities
 *
 * Provides reusable patterns for optimistic updates in the Zustand store.
 * Each optimistic update follows this flow:
 *   1. Save current state snapshot
 *   2. Apply optimistic change immediately (UI updates instantly)
 *   3. Make the real API call
 *   4. On success: confirm (replace optimistic data with real server data)
 *   5. On error: rollback to saved state, re-throw error for toast handling
 *
 * The `pendingActions` map in the store tracks in-flight actions so
 * components can show subtle "confirming..." indicators.
 */

import { useEMSStore } from './store';

/**
 * Generate a temporary ID for optimistic creates.
 * Uses timestamp + random suffix to avoid collisions.
 */
export function generateTempId(prefix = 'temp'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Execute an optimistic update with automatic rollback on error.
 *
 * @example
 * ```ts
 * await optimisticAction({
 *   pendingKey: `task-${id}`,
 *   apply: () => set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t) })),
 *   execute: () => apiFetch('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) }),
 *   rollback: () => set({ tasks: prevTasks }),
 * });
 * ```
 */
export async function optimisticAction<T>(options: {
  /** Key for tracking pending state in store.pendingActions */
  pendingKey: string;
  /** Apply the optimistic change to the store immediately */
  apply: () => void;
  /** The actual API call to make */
  execute: () => Promise<T>;
  /** Optional: callback on success with the API result (e.g., replace temp ID with real data) */
  onSuccess?: (result: T) => void;
  /** Rollback function to restore previous state on error */
  rollback: () => void;
}): Promise<T> {
  const { pendingKey, apply, execute, onSuccess, rollback } = options;
  const store = useEMSStore.getState();

  // Mark action as pending
  store.setPendingAction(pendingKey, true);

  // Apply optimistic update immediately
  apply();

  try {
    // Execute the real API call
    const result = await execute();

    // On success, optionally process the result
    if (onSuccess) {
      onSuccess(result);
    }

    // Clear pending state
    useEMSStore.getState().setPendingAction(pendingKey, false);

    return result;
  } catch (error) {
    // Rollback to previous state
    rollback();

    // Clear pending state
    useEMSStore.getState().setPendingAction(pendingKey, false);

    // Re-throw so callers can show error toast
    throw error;
  }
}

/**
 * Check if a specific action is currently pending (being confirmed by server).
 * Useful for showing subtle "syncing..." indicators in the UI.
 */
export function isActionPending(key: string): boolean {
  return useEMSStore.getState().pendingActions[key] === true;
}

/**
 * Hook-friendly helper: get all currently pending action keys.
 */
export function getPendingActionKeys(): string[] {
  const pending = useEMSStore.getState().pendingActions;
  return Object.entries(pending)
    .filter(([, isPending]) => isPending)
    .map(([key]) => key);
}
