'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { isOnline, syncOfflineActions, getOfflineQueue } from '@/lib/offline';

interface UseOnlineStatusReturn {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook that tracks online/offline status.
 * - Listens to 'online'/'offline' browser events
 * - When coming back online, auto-syncs the offline queue
 * - Shows toast notifications for connectivity changes
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  // Always initialize to true to match SSR and prevent hydration mismatch
  const [online, setOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const syncingRef = useRef(false);

  const handleOnline = useCallback(async () => {
    setOnline(true);

    if (wasOffline) {
      toast.success('Back Online', {
        description: 'Your connection has been restored.',
        duration: 4000,
      });

      // Auto-sync offline queue when coming back online
      const queue = getOfflineQueue();
      if (queue.length > 0 && !syncingRef.current) {
        syncingRef.current = true;
        try {
          const result = await syncOfflineActions();
          if (result.succeeded > 0) {
            toast.success('Sync Complete', {
              description: `${result.succeeded} offline action${result.succeeded > 1 ? 's' : ''} synced successfully.`,
              duration: 5000,
            });
          }
          if (result.failed > 0) {
            toast.error('Sync Partially Failed', {
              description: `${result.failed} action${result.failed > 1 ? 's' : ''} could not be synced and will retry later.`,
              duration: 5000,
            });
          }
        } catch {
          toast.error('Sync Failed', {
            description: 'Failed to sync offline actions. They will retry later.',
            duration: 5000,
          });
        } finally {
          syncingRef.current = false;
        }
      }
    }

    setWasOffline(false);
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setOnline(false);
    setWasOffline(true);

    toast.warning('You Are Offline', {
      description: 'Changes will be saved locally and synced when you reconnect.',
      duration: 5000,
    });
  }, []);

  useEffect(() => {
    // Set initial state
    setOnline(isOnline());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline: online,
    wasOffline,
  };
}
