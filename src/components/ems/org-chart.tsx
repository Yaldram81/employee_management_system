'use client';

import { useState, useMemo, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, ChevronRight, Mail, Phone, Briefcase, Users } from 'lucide-react';
import type { User, Department } from '@/lib/types';
import { getInitials } from './shared';

const DEPT_COLORS: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  engineering: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', ring: 'ring-cyan-500/40' },
  design: { bg: 'bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-400', ring: 'ring-rose-500/40' },
  marketing: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', ring: 'ring-amber-500/40' },
  sales: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', ring: 'ring-emerald-500/40' },
  hr: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', ring: 'ring-purple-500/40' },
  finance: { bg: 'bg-sky-500/20', border: 'border-sky-500/30', text: 'text-sky-400', ring: 'ring-sky-500/40' },
};
const DEFAULT_DEPT_COLOR = { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-400', ring: 'ring-slate-500/40' };

function getDeptColor(deptName: string) {
  const key = deptName.toLowerCase().replace(/[^a-z]/g, '');
  return DEPT_COLORS[key] || DEFAULT_DEPT_COLOR;
}


interface OrgNodeProps {
  user: User;
  dept?: Department;
  isExpanded: boolean;
  onToggle: () => void;
  delay: number;
}

function OrgNode({ user, dept, isExpanded, onToggle, delay }: OrgNodeProps) {
  const dc = getDeptColor(dept?.name || '');
  const isActive = user.isActive !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center"
    >
      <button
        onClick={onToggle}
        className={`relative group rounded-xl border p-3 transition-all duration-200 hover:scale-105 ${dc.border} ${dc.bg} min-w-[140px]`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className={`h-10 w-10 rounded-full ${dc.bg} ring-2 ${dc.ring} flex items-center justify-center text-sm font-bold ${dc.text}`}>
            {getInitials(user.name)}
          </div>
          <span className="text-xs font-semibold text-center leading-tight max-w-[120px] truncate">{user.name}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{user.role}</span>
          {dept && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${dc.bg} ${dc.text} font-medium`}>{dept.name}</span>
          )}
          <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        </div>
        <div className="absolute bottom-1 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full"
          >
            <div className="mt-2 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.1] dark:border-white/[0.1] text-xs space-y-1.5">
              {user.email && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3 w-3" /><span className="truncate">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3 w-3" /><span>{user.phone}</span>
                </div>
              )}
              {user.position && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Briefcase className="h-3 w-3" /><span>{user.position}</span>
                </div>
              )}
              {user.workMode && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3 w-3" /><span className="capitalize">{user.workMode.replace('-', ' ')}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span className={isActive ? 'text-emerald-400' : 'text-slate-500'}>{isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── SVG Curved Connectors ──────────────────────────────────── */
function Connectors({ parentX, childXs, y1, y2 }: { parentX: number; childXs: number[]; y1: number; y2: number }) {
  if (childXs.length === 0) return null;
  const midY = y1 + (y2 - y1) * 0.5;
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      {childXs.map((cx, i) => {
        const d = `M ${parentX} ${y1} C ${parentX} ${midY}, ${cx} ${midY}, ${cx} ${y2}`;
        return <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

interface OrgChartProps {
  className?: string;
}

export function OrgChart({ className }: OrgChartProps) {
  const { users, departments } = useEMSStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getDept = (u: User) => departments.find(d => d.id === u.departmentId);

  // Build hierarchy
  const admins = users.filter(u => u.role === 'admin');
  const managers = users.filter(u => u.role === 'manager');
  const employees = users.filter(u => u.role === 'employee');

  // Group employees under managers by department
  const managerGroups = useMemo(() => {
    return managers.map(m => {
      const dept = departments.find(d => d.id === m.departmentId);
      const teamMembers = employees.filter(e => e.departmentId === m.departmentId);
      return { manager: m, dept, teamMembers };
    });
  }, [managers, employees, departments]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // ─── Mobile: List View ──────────────────────────────────────
  if (isMobile) {
    return (
      <GlassCard className={className}>
        <div className="p-4 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />Organization
          </h3>

          {/* Admins */}
          {admins.map(admin => (
            <div key={admin.id} className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-xs font-bold text-rose-400">
                  {getInitials(admin.name)}
                </div>
                <div><p className="text-xs font-medium">{admin.name}</p><p className="text-[10px] text-muted-foreground">Admin</p></div>
              </div>
            </div>
          ))}

          {/* Managers + Teams */}
          {managerGroups.map(({ manager, dept, teamMembers }) => {
            const dc = getDeptColor(dept?.name || '');
            return (
              <div key={manager.id} className="space-y-1.5">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className={`h-8 w-8 rounded-full ${dc.bg} flex items-center justify-center text-xs font-bold ${dc.text}`}>
                    {getInitials(manager.name)}
                  </div>
                  <div><p className="text-xs font-medium">{manager.name}</p><p className="text-[10px] text-muted-foreground">Manager · {dept?.name || '—'}</p></div>
                </div>
                {teamMembers.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 p-2 ml-6 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]">
                    <div className={`h-6 w-6 rounded-full ${dc.bg} flex items-center justify-center text-[9px] font-bold ${dc.text}`}>
                      {getInitials(emp.name)}
                    </div>
                    <div><p className="text-[11px] font-medium">{emp.name}</p><p className="text-[10px] text-muted-foreground">{emp.position || emp.role}</p></div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </GlassCard>
    );
  }

  // ─── Desktop: SVG Tree Layout ───────────────────────────────
  return (
    <GlassCard className={className}>
      <div className="p-4 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-400" />Organization Chart
        </h3>

        <div className="overflow-x-auto">
          {/* Admin Row */}
          <div className="flex justify-center gap-6 mb-2">
            {admins.map((admin, i) => (
              <OrgNode
                key={admin.id}
                user={admin}
                dept={getDept(admin)}
                isExpanded={expandedId === admin.id}
                onToggle={() => toggleExpand(admin.id)}
                delay={i * 0.1}
              />
            ))}
          </div>

          {/* Manager Row */}
          <div className="flex justify-center gap-4 flex-wrap mt-6 mb-2">
            {managerGroups.map(({ manager, dept }, i) => (
              <OrgNode
                key={manager.id}
                user={manager}
                dept={dept}
                isExpanded={expandedId === manager.id}
                onToggle={() => toggleExpand(manager.id)}
                delay={0.2 + i * 0.08}
              />
            ))}
          </div>

          {/* Employee Rows per Manager */}
          {managerGroups.map(({ manager, dept, teamMembers }) => {
            if (teamMembers.length === 0) return null;
            const dc = getDeptColor(dept?.name || '');
            return (
              <div key={`team-${manager.id}`} className="mt-4">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${dc.text.replace('text-', 'bg-')}`} />
                  <span className="text-[10px] text-muted-foreground font-medium">{dept?.name || manager.name}&apos;s Team</span>
                  <span className="text-[10px] text-muted-foreground">({teamMembers.length})</span>
                </div>
                <div className="flex justify-start gap-3 flex-wrap pl-4">
                  {teamMembers.map((emp, i) => (
                    <OrgNode
                      key={emp.id}
                      user={emp}
                      dept={dept}
                      isExpanded={expandedId === emp.id}
                      onToggle={() => toggleExpand(emp.id)}
                      delay={0.4 + i * 0.05}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No users to display</p>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
