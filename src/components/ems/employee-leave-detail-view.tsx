'use client';

import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { differenceInDays, parseISO, format } from 'date-fns';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  User,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Configuration ---
const typeColors: Record<string, string> = {
  SICK: '#f43f5e',     // rose-500
  CASUAL: '#f59e0b',   // amber-500
  VACATION: '#10b981', // emerald-500
  MATERNITY: '#ec4899',// pink-500
  PATERNITY: '#06b6d4',// cyan-500
  UNPAID: '#64748b',   // slate-500
};

const typeLabels: Record<string, string> = {
  SICK: 'Sick',
  CASUAL: 'Casual',
  VACATION: 'Vacation',
  MATERNITY: 'Maternity',
  PATERNITY: 'Paternity',
  UNPAID: 'Unpaid',
};

export function EmployeeLeaveDetailView() {
  const {
    user,
    leaves,
    adminLeaveData,
    managerLeaveData,
    users,
    departments,
    setSelectedLeaveId,
    selectedLeaveId,
    setActiveView,
    approveLeave,
  } = useEMSStore();

  // Find the requested leave
  const request = useMemo(() => {
    if (!selectedLeaveId) return null;
    let l: Leave | undefined = leaves.find((x: Leave) => x.id === selectedLeaveId);
    if (l) return l;

    if (adminLeaveData?.recentLeaves) {
      l = adminLeaveData.recentLeaves.find((x: { id: string }) => x.id === selectedLeaveId) as Leave | undefined;
      if (l) return l;
    }
    if (adminLeaveData?.allLeaves) {
      l = adminLeaveData.allLeaves.find((x: { id: string }) => x.id === selectedLeaveId) as Leave | undefined;
      if (l) return l;
    }
    if (managerLeaveData?.allTeamLeaves) {
      l = managerLeaveData.allTeamLeaves.find((x: { id: string }) => x.id === selectedLeaveId) as Leave | undefined;
      if (l) return l;
    }
    return null;
  }, [selectedLeaveId, leaves, adminLeaveData, managerLeaveData]);

  // Derived Data
  const leaveUser = useMemo(() => {
    if (!request) return user;
    if (request.userId === user?.id) return user;
    return users.find(u => u.id === request.userId) || null;
  }, [request, user, users]);

  const leaveDept = useMemo(() => {
    if (!leaveUser) return null;
    return departments.find(d => d.id === leaveUser.departmentId) || null;
  }, [leaveUser, departments]);

  const leaveDays = request ? differenceInDays(parseISO(request.endDate), parseISO(request.startDate)) + 1 : 0;
  const isPending = request?.status === 'PENDING';
  const isApproved = request?.status === 'APPROVED';
  const isRejected = request?.status === 'REJECTED';
  const leaveColor = request ? (typeColors[request.type] || '#10b981') : '#10b981';

  // Handlers
  const goBack = useCallback(() => {
    setSelectedLeaveId(null);
    // Logic to route back based on user role - fallback to simple logic
    if (user?.role === 'admin') {
      setActiveView('leaves');
    } else if (user?.role === 'manager') {
      setActiveView('team-leaves');
    } else {
      setActiveView('employee-leaves');
    }
  }, [setSelectedLeaveId, setActiveView, user]);

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!request) return;
    try {
      await approveLeave(request.id, status, `Leave ${status}`);
      toast.success(`Leave ${status}`);
    } catch {
      toast.error(`Failed to ${status} leave`);
    }
  };

  // Not Found State
  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-rose-400/50" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Leave not found</p>
          <p className="text-xs text-muted-foreground mt-1">The leave request may have been deleted.</p>
        </div>
        <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-cyan-500/10">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Leaves
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={goBack} className="w-fit gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${leaveColor}20` }}>
              <CalendarDays className="h-7 w-7" style={{ color: leaveColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{typeLabels[request.type] || request.type} Leave</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {format(parseISO(request.startDate), 'MMM d, yyyy')} → {format(parseISO(request.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn(
              'text-sm font-medium px-4 py-1.5',
              isApproved && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
              isPending && 'bg-amber-500/15 text-amber-400 border-amber-500/20',
              isRejected && 'bg-rose-500/15 text-rose-400 border-rose-500/20',
            )} variant="outline">
              {isPending && <Clock className="h-4 w-4 mr-1.5" />}
              {isApproved && <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              {isRejected && <XCircle className="h-4 w-4 mr-1.5" />}
              {request.status}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* ── Details Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Details) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-400" />
                Duration details
              </h3>
              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Duration</span>
                  <span className="text-sm font-bold" style={{ color: leaveColor }}>{leaveDays} day{leaveDays !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 rounded-full bg-black/[0.03] dark:bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (leaveDays / 30) * 100)}%`, backgroundColor: leaveColor, opacity: 0.7 }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                  <span>{format(parseISO(request.startDate), 'EEEE, MMM d, yyyy')}</span>
                  <span>{format(parseISO(request.endDate), 'EEEE, MMM d, yyyy')}</span>
                </div>
              </div>

              <h3 className="font-semibold mb-2 mt-6 text-sm">Reason</h3>
              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                <p className="text-sm leading-relaxed">{request.reason || 'No reason provided'}</p>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-5">
              <h3 className="font-semibold mb-4 text-sm">Employee Information</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center text-white font-bold">
                  {request.userName?.charAt(0)?.toUpperCase() || leaveUser?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{request.userName || leaveUser?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{leaveDept?.name || request.department || 'Unknown Dept'}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard className="p-5">
              <h3 className="font-semibold mb-4 text-sm">Leave Meta</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Applied On</p>
                  <p className="text-sm font-medium">{request.createdAt ? format(parseISO(request.createdAt), 'MMM d, yyyy') : 'N/A'}</p>
                </div>
                {request.managerName && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Reviewed By</p>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{request.managerName}</span>
                    </div>
                  </div>
                )}
                {request.reviewedAt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Reviewed On</p>
                    <p className="text-sm font-medium">{format(parseISO(request.reviewedAt), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Admin / Manager Actions */}
          {(user?.role === 'admin' || user?.role === 'manager') && isPending && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard className="p-5" glow="emerald">
                <h3 className="font-semibold mb-4 text-sm">Review Action</h3>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction('approved')}>
                    Approve
                  </Button>
                  <Button variant="outline" className="flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10" onClick={() => handleAction('rejected')}>
                    Reject
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
