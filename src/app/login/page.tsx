'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEMSStore } from '@/lib/store';
import { LoginScreen } from '@/components/ems/login-screen';
import { useOnlineStatus } from '@/hooks/use-online-status';

export default function LoginPage() {
  const { isAuthenticated, user } = useEMSStore();
  const router = useRouter();
  const { isOnline } = useOnlineStatus();

  // If already authenticated, redirect directly to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user?.id, router]);

  return (
    <>
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-center text-xs font-medium py-1 px-4"
          role="alert"
        >
          You are offline. Some features may be limited.
        </div>
      )}
      <LoginScreen />
    </>
  );
}
