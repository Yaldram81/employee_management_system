'use client';

import { useRealtime } from '@/hooks/use-realtime';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Provider component that connects to the real-time service
 * and displays connection status in the footer.
 * Dynamically imported to avoid socket.io-client blocking page compilation.
 */
export function RealtimeProvider() {
  const realtimeStatus = useRealtime();

  return (
    <span className="flex items-center gap-1.5">
      {realtimeStatus.connected ? (
        <>
          <span className="flex items-center gap-1">
            <Wifi className="h-2.5 w-2.5 text-emerald-500" />
            <span className="text-emerald-500">Live</span>
          </span>
          {realtimeStatus.latency !== null && (
            <span className="text-muted-foreground/40 ml-1">{realtimeStatus.latency}ms</span>
          )}
        </>
      ) : realtimeStatus.reconnecting ? (
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-500">Reconnecting</span>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <WifiOff className="h-2.5 w-2.5 text-muted-foreground/30" />
          <span className="text-muted-foreground/30">Offline</span>
        </span>
      )}
    </span>
  );
}
