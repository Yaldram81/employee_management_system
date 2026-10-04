'use client';

import { useMemo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MapPin, Clock, AlertTriangle, Wifi, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type RosterStatus = 'in-office' | 'not-arrived' | 'absent' | 'remote' | 'flagged';

interface RosterEntry {
  userId: string;
  userName: string;
  department: string;
  status: RosterStatus;
  firstIn?: string;
  isFlagged: boolean;
}

const statusConfig: Record<RosterStatus, { dot: string; label: string; icon: typeof MapPin }> = {
  'in-office': { dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]', label: 'In Office', icon: MapPin },
  'not-arrived': { dot: 'bg-slate-400', label: 'Not Arrived', icon: Clock },
  absent: { dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]', label: 'Absent/Leave', icon: UserX },
  remote: { dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]', label: 'Remote', icon: Wifi },
  flagged: { dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]', label: 'Flagged', icon: AlertTriangle },
};

export function DailyRoster() {
  const { users, attendance, attendanceLogs, user } = useEMSStore();

  const today = new Date().toISOString().split('T')[0];

  // Filter to department if manager
  const deptUsers = useMemo(() => {
    if (user?.role === 'admin') return users;
    return users.filter((u) => u.departmentId === user?.departmentId);
  }, [users, user]);

  const roster: RosterEntry[] = useMemo(() => {
    const now = new Date();
    const shiftStart = new Date();
    shiftStart.setHours(9, 15, 0, 0); // 9:15 AM (shift start + 15 min grace)
    const isPastGrace = now > shiftStart;

    return deptUsers.map((u) => {
      const todayRecord = attendance.find((a) => a.date === today && a.userId === u.id);
      const todayLogs = attendanceLogs.filter((l) => {
        const logDate = l.punchTime ? new Date(l.punchTime).toISOString().split('T')[0] : '';
        return logDate === today && l.userId === u.id;
      });
      const isFlagged = todayLogs.some((l) => l.isFlagged);
      const hasClockedIn = !!(todayRecord?.clockIn || todayRecord?.firstIn);
      const hasClockedOut = !!(todayRecord?.clockOut || todayRecord?.lastOut);
      const isInOffice = hasClockedIn && !hasClockedOut;

      let status: RosterStatus;
      if (isFlagged) {
        status = 'flagged';
      } else if (isInOffice) {
        status = 'in-office';
      } else if (!hasClockedIn && isPastGrace) {
        // Check if they have approved leave
        status = 'absent';
      } else if (!hasClockedIn && !isPastGrace) {
        status = 'not-arrived';
      } else {
        status = 'not-arrived';
      }

      return {
        userId: u.id,
        userName: u.name,
        department: u.department || 'No Dept',
        status,
        firstIn: todayRecord?.firstIn || todayRecord?.clockIn,
        isFlagged,
      };
    });
  }, [deptUsers, attendance, attendanceLogs, today]);

  const statusCounts = useMemo(() => {
    const counts: Record<RosterStatus, number> = {
      'in-office': 0,
      'not-arrived': 0,
      absent: 0,
      remote: 0,
      flagged: 0,
    };
    roster.forEach((r) => { counts[r.status]++; });
    return counts;
  }, [roster]);

  return (
    <GlassCard className="p-6" glow="emerald">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Daily Roster</h3>
        <span className="text-xs text-muted-foreground">{format(new Date(), 'MMM d, yyyy')}</span>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(Object.keys(statusConfig) as RosterStatus[]).map((status) => {
          const count = statusCounts[status];
          if (count === 0) return null;
          const config = statusConfig[status];
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <div className={cn('h-2.5 w-2.5 rounded-full', config.dot)} />
              <span className="text-muted-foreground">{config.label}</span>
              <span className="font-medium">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Roster list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {roster.map((entry, i) => {
          const config = statusConfig[entry.status];
          const Icon = config.icon;
          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-lg transition-colors',
                'bg-white/5 border border-white/5',
                entry.isFlagged && 'border-amber-500/20 bg-amber-500/5',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('h-3 w-3 rounded-full shrink-0', config.dot)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {entry.firstIn && (
                  <span className="text-xs text-muted-foreground font-mono">{entry.firstIn}</span>
                )}
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                  entry.status === 'in-office' && 'bg-emerald-500/10 text-emerald-400',
                  entry.status === 'not-arrived' && 'bg-slate-500/10 text-slate-400',
                  entry.status === 'absent' && 'bg-rose-500/10 text-rose-400',
                  entry.status === 'remote' && 'bg-cyan-500/10 text-cyan-400',
                  entry.status === 'flagged' && 'bg-amber-500/10 text-amber-400',
                )}>
                  <Icon className="h-3 w-3" />
                  <span>{config.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        {roster.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No team members found</p>
        )}
      </div>
    </GlassCard>
  );
}
