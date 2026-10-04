'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEMSStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user } = useEMSStore();
  const hasUser = !!user?.id;
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && hasUser) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, hasUser, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm text-muted-foreground">Directing to workspace...</p>
      </div>
    </div>
  );
}
