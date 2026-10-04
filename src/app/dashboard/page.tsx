'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEMSStore } from '@/lib/store';
import { DashboardLayout } from '@/components/ems/dashboard-layout';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { isAuthenticated, user, activeView, setActiveView } = useEMSStore();
  const router = useRouter();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      router.replace('/login');
    } else {
      if (activeView !== 'dashboard') {
        setActiveView('dashboard');
      }
      queryClient.invalidateQueries();
    }
  }, [isAuthenticated, user?.id, activeView, setActiveView, router, queryClient]);

  if (!isAuthenticated || !user?.id) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-center text-xs font-medium py-1 px-4"
          role="alert"
        >
          You are offline. Some features may be limited. Actions will sync when you reconnect.
        </div>
      )}
      <DashboardLayout />
    </>
  );
}
