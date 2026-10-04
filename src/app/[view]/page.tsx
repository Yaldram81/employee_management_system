'use client';

import { use, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { useEMSStore } from '@/lib/store';
import { DashboardLayout } from '@/components/ems/dashboard-layout';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { ActiveView } from '@/lib/types';

const VALID_VIEWS = new Set<string>([
  'dashboard',
  'attendance',
  'leaves',
  'tasks',
  'requests',
  'complaints',
  'analytics',
  'settings',
  'payroll',
  'employees',
  'rules',
  'team',
  'departments',
  'create-team',
  'shifts',
  'hrm',
  'onboarding',
  'jobs',
  'candidates',
  'training-mgmt',
  'job-detail',
  'candidate-detail',
  'onboarding-detail',
  'training-detail',
  'task-detail',
  'complaint-detail',
  'request-detail',
  'submit-complaint',
  'submit-request',
  'apply-leave',
  'gamification',
]);

interface ViewPageProps {
  params: Promise<{ view: string }>;
}

export default function ViewPage({ params }: ViewPageProps) {
  const resolvedParams = use(params);
  const viewParam = resolvedParams.view;

  // Validate the route parameter
  if (!VALID_VIEWS.has(viewParam)) {
    notFound();
  }

  const activeView = viewParam as ActiveView;
  const { isAuthenticated, user, setActiveView, activeView: currentStoreView } = useEMSStore();
  const router = useRouter();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      router.replace('/login');
    } else {
      if (currentStoreView !== activeView) {
        setActiveView(activeView);
      }
      queryClient.invalidateQueries();
    }
  }, [isAuthenticated, user?.id, activeView, currentStoreView, setActiveView, router, queryClient]);

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
