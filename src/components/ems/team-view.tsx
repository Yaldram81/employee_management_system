'use client';

import { useMemo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, Clock, AlertCircle, Zap, TrendingUp, Activity, Coffee } from 'lucide-react';
import { AdminTeamCenter } from './admin-team-center';
import { ManagerTeamCenter } from './manager-team-center';

export function TeamView() {
  const { user } = useEMSStore();

  // Admin gets the full enterprise team management center
  if (user?.role === 'admin') {
    return <AdminTeamCenter />;
  }

  // Manager gets the enterprise team center
  if (user?.role === 'manager') {
    return <ManagerTeamCenter />;
  }

  // Employee gets the original team overview
  return <TeamOverview />;
}

// ─── Original Team Overview (Manager/Employee) ─────────────────
function TeamOverview() {
  const { user, users, tasks, attendance, leaves, departments } = useEMSStore();

  const teamMembers = useMemo(
    () => users.filter((u) => u.departmentId === user?.departmentId),
    [users, user?.departmentId]
  );

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter((a) => a.date === today);
  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const attendanceRate = teamMembers.length > 0 ? Math.round(((presentCount + lateCount) / teamMembers.length) * 100) : 0;

  const teamTasks = useMemo(
    () => tasks.filter((t) => t.departmentId === user?.departmentId),
    [tasks, user?.departmentId]
  );

  const teamLeaves = useMemo(
    () => leaves.filter((l) => teamMembers.some(m => m.id === l.userId)),
    [leaves, teamMembers]
  );

  const deptName = departments.find((d) => d.id === user?.departmentId)?.name || 'Team';

  const productivityScore = useMemo(() => {
    const done = teamTasks.filter(t => t.status === 'done').length;
    const total = teamTasks.length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [teamTasks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{deptName} Team</h2>
          <p className="text-sm text-muted-foreground mt-1">Team overview and performance metrics</p>
        </div>
        <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
          <Activity className="h-3 w-3 mr-1" /> Live
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard title="Team Members" value={teamMembers.length} icon={Users} color="cyan" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard title="Present Today" value={presentCount} icon={CheckCircle2} color="emerald" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard title="Late Today" value={lateCount} icon={Clock} color="amber" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard title="Active Tasks" value={teamTasks.filter((t) => t.status !== 'done').length} icon={AlertCircle} color="rose" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5" glow="emerald">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg p-2 bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-sm">Attendance Rate</h3>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-emerald-400">{attendanceRate}%</span>
              <span className="text-xs text-muted-foreground mb-1">today</span>
            </div>
            <Progress value={attendanceRate} className="h-2 mt-3" />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>{presentCount} present</span>
              <span>{lateCount} late</span>
              <span>{teamMembers.length - presentCount - lateCount} absent</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard className="p-5" glow="cyan">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg p-2 bg-cyan-500/10">
                <Zap className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-sm">Productivity</h3>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-cyan-400">{productivityScore}%</span>
              <span className="text-xs text-muted-foreground mb-1">task completion</span>
            </div>
            <Progress value={productivityScore} className="h-2 mt-3" />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>{teamTasks.filter(t => t.status === 'done').length} done</span>
              <span>{teamTasks.filter(t => t.status === 'in-progress').length} in progress</span>
              <span>{teamTasks.filter(t => t.status === 'todo').length} todo</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5" glow="amber">
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-lg p-2 bg-amber-500/10">
                <Coffee className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="font-semibold text-sm">On Leave Today</h3>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-amber-400">
                {teamLeaves.filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today).length}
              </span>
              <span className="text-xs text-muted-foreground mb-1">team members</span>
            </div>
            <div className="space-y-2 mt-3">
              {teamLeaves
                .filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today)
                .slice(0, 3)
                .map(leave => (
                  <div key={leave.id} className="flex items-center gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="text-muted-foreground">{leave.userName || 'Unknown'}</span>
                  </div>
                ))
              }
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Team Members</h3>
          <Badge variant="outline" className="text-xs border-white/10">{teamMembers.length} members</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member, i) => {
            const memberAttendance = todayAttendance.find((a) => a.userId === member.id);
            const memberTasks = teamTasks.filter((t) => t.assigneeId === member.id);
            const status = memberAttendance?.status || 'absent';
            const doneTasks = memberTasks.filter(t => t.status === 'done').length;

            return (
              <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="p-4" hover>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10 ring-2 ring-white/10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-cyan-600 text-white text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.position || member.role}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{memberTasks.length} tasks</span>
                    <span className="text-emerald-400">{doneTasks} done</span>
                  </div>
                  {memberTasks.length > 0 && (
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(doneTasks / memberTasks.length) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
          {teamMembers.length === 0 && (
            <p className="text-center text-muted-foreground py-8 col-span-3">No team members found</p>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Task Distribution</h3>
          <Badge variant="outline" className="text-xs border-white/10">{teamTasks.length} total tasks</Badge>
        </div>
        <div className="space-y-3">
          {teamMembers.map((member, i) => {
            const memberTasks = teamTasks.filter((t) => t.assigneeId === member.id);
            const done = memberTasks.filter((t) => t.status === 'done').length;
            const inProgress = memberTasks.filter((t) => t.status === 'in-progress').length;
            const total = memberTasks.length;
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] bg-gradient-to-br from-emerald-600 to-cyan-600 text-white">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{done}/{total} done</span>
                  {inProgress > 0 && <span className="text-cyan-400">{inProgress} active</span>}
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
