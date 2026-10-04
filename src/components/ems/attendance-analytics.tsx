'use client';

import { useMemo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Clock, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addDays, format, startOfWeek, subMonths, parseISO, isSameDay,
} from 'date-fns';

const COLORS = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  slate: '#64748b',
};

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg p-2.5 border border-white/10 text-xs shadow-xl">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Employee: Hours Worked This Week ─────────────────────────────────────────
export function WeeklyHoursChart() {
  const { attendance, user } = useEMSStore();

  const data = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map((day, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const record = attendance.find(
        (a) => a.date === dateStr && a.userId === user?.id
      );
      return {
        day,
        hours: record?.totalHours ?? 0,
        overtime: record?.overtimeHours ?? 0,
      };
    });
  }, [attendance, user?.id]);

  return (
    <GlassCard className="p-6" glow="emerald">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Hours Worked This Week</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Total: {data.reduce((sum, d) => sum + d.hours, 0).toFixed(1)}h
        </span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" name="Regular" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
            <Bar dataKey="overtime" name="Overtime" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

// ─── Employee: On-Time vs Late Ring ───────────────────────────────────────────
export function OnTimeVsLateChart() {
  const { attendance, user } = useEMSStore();

  const data = useMemo(() => {
    const monthAgo = subMonths(new Date(), 1);
    const monthRecords = attendance.filter((a) => {
      if (a.userId !== user?.id) return false;
      try {
        const d = parseISO(a.date);
        return d >= monthAgo;
      } catch {
        return false;
      }
    });

    const onTime = monthRecords.filter((a) => a.status === 'present').length;
    const late = monthRecords.filter((a) => a.status === 'late').length;

    if (onTime === 0 && late === 0) {
      return [{ name: 'No Data', value: 1, color: COLORS.slate }];
    }

    return [
      { name: 'On Time', value: onTime, color: COLORS.emerald },
      { name: 'Late', value: late, color: COLORS.amber },
    ];
  }, [attendance, user?.id]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const onTimeRate = data.find((d) => d.name === 'On Time')?.value ?? 0;
  const rate = total > 0 ? Math.round((onTimeRate / total) * 100) : 0;

  return (
    <GlassCard className="p-6" glow="cyan">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-sm">On-Time Rate</h3>
        </div>
        <span className="text-xs text-muted-foreground">This month</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          <div className="text-3xl font-bold">
            <span className={cn(
              rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-rose-400'
            )}>
              {rate}%
            </span>
          </div>
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Manager: Department Attendance Overview ──────────────────────────────────
export function DepartmentAttendanceOverview() {
  const { attendance, users, departments, user } = useEMSStore();

  const data = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    // If manager, show only their department
    const relevantDepts = user?.role === 'admin'
      ? departments
      : departments.filter((d) => d.id === user?.departmentId);

    return relevantDepts.map((dept) => {
      const deptUsers = users.filter((u) => u.departmentId === dept.id);
      const deptAttendance = attendance.filter(
        (a) => a.date === today && deptUsers.some((u) => u.id === a.userId)
      );
      return {
        department: dept.name.length > 10 ? dept.name.substring(0, 10) + '...' : dept.name,
        present: deptAttendance.filter((a) => a.status === 'present').length,
        late: deptAttendance.filter((a) => a.status === 'late').length,
        absent: deptUsers.length - deptAttendance.filter((a) => a.status === 'present' || a.status === 'late').length,
      };
    });
  }, [attendance, users, departments, user]);

  if (data.length === 0) {
    return null;
  }

  return (
    <GlassCard className="p-6" glow="cyan">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-sm">Department Attendance Today</h3>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="department"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value: string) => <span style={{ color: '#94a3b8' }}>{value}</span>}
            />
            <Bar dataKey="present" name="Present" fill={COLORS.emerald} radius={[3, 3, 0, 0]} stackId="a" />
            <Bar dataKey="late" name="Late" fill={COLORS.amber} radius={[3, 3, 0, 0]} stackId="a" />
            <Bar dataKey="absent" name="Absent" fill={COLORS.rose} radius={[3, 3, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
