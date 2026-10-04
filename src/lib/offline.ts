/**
 * Offline utility module for EMS PWA support.
 * Handles offline action queuing, service worker registration, and notification permissions.
 */

export interface OfflineAction {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'ems_offline_queue';

/**
 * Check if the browser is currently online.
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Queue an API action for later execution when offline.
 * Stores in localStorage as `ems_offline_queue`.
 */
export function queueOfflineAction(action: Omit<OfflineAction, 'timestamp'>): void {
  const queue = getOfflineQueue();
  const fullAction: OfflineAction = {
    ...action,
    timestamp: Date.now(),
  };
  queue.push(fullAction);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[Offline] Failed to queue action:', error);
    }
  }
}

/**
 * Replay all queued offline actions when back online.
 * Returns the number of successfully replayed actions.
 */
export async function syncOfflineActions(): Promise<{
  succeeded: number;
  failed: number;
}> {
  const queue = getOfflineQueue();

  if (queue.length === 0) {
    return { succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers || { 'Content-Type': 'application/json' },
        body: action.body || undefined,
      });

      if (response.ok) {
        succeeded++;
      } else {
        failed++;
        remaining.push(action);
      }
    } catch (error) {
      console.warn('[Offline] Failed to replay action:', action.url, error);
      failed++;
      remaining.push(action);
    }
  }

  // Update queue with only the failed actions that remain
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    } catch (error) {
      console.error('[Offline] Failed to update offline queue:', error);
    }
  }

  return { succeeded, failed };
}

/**
 * Get the current queue of pending offline actions.
 */
export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Clear the entire offline action queue.
 */
export function clearOfflineQueue(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('[Offline] Failed to clear offline queue:', error);
    }
  }
}

/**
 * Register the service worker from /sw.js.
 * Returns the service worker registration or null if not supported.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service worker registered successfully');

    // Check for updates periodically
    setInterval(() => {
      registration.update().catch(() => {
        // Silently fail - update checks are non-critical
      });
    }, 60 * 60 * 1000); // Every hour

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Request push notification permission from the user.
 * Returns the current permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied';

  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications are not supported in this browser.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    console.warn('[PWA] Notification permission has been denied.');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}
