'use client';

import { useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';
import { LoginScreen } from '@/components/ems/login-screen';
import { DashboardLayout } from '@/components/ems/dashboard-layout';
import { Loader2 } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { registerServiceWorker } from '@/lib/offline';

export default function Home() {
  const { isAuthenticated, user } = useEMSStore();
  const hasUser = !!user?.id;
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  // On mount, if session persisted, prefetch core data via TanStack Query
  useEffect(() => {
    if (isAuthenticated && hasUser) {
      // TanStack Query will automatically fetch data when hooks mount
      // Just ensure queries are refetched on page reload
      queryClient.invalidateQueries();
    }
  }, [isAuthenticated, hasUser, queryClient]);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker().catch(() => {
        // Service worker registration failed - non-critical
      });
    }
  }, []);

  if (isAuthenticated && hasUser) {
    return (
      <>
        {/* Offline indicator bar */}
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-center text-xs font-medium py-1 px-4" role="alert">
            You are offline. Some features may be limited. Actions will sync when you reconnect.
          </div>
        )}
        <DashboardLayout />
      </>
    );
  }

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-center text-xs font-medium py-1 px-4" role="alert">
          You are offline. Some features may be limited.
        </div>
      )}
      <LoginScreen />
    </>
  );
}
