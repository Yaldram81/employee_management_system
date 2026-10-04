'use client';

import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Shift, User } from '@/lib/types';
import {
  Timer,
  Star,
  Users,
  UserX,
  Plus,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  ArrowLeft,
  Clock,
  Settings,
  Shield,
  AlertTriangle,
  UserPlus,
  Crown,
  Sun,
  Moon,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  XCircle,
  GripVertical,
  Zap,
  Layers,
} from 'lucide-react';
import { getInitials } from './shared';

// ─── Helpers ───────────────────────────────────────────────────


function getAvatarColor(name: string) {
  const colors = [
    'from-emerald-500 to-cyan-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-teal-500',
    'from-lime-500 to-green-500',
    'from-fuchsia-500 to-pink-500',
    'from-orange-500 to-amber-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Parse "HH:MM" to minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Calculate shift duration in hours, handling overnight shifts */
function calculateDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const diff = end <= start ? (1440 - start + end) : (end - start);
  return Math.round((diff / 60) * 10) / 10;
}

/** Format duration string */
function formatDuration(startTime: string, endTime: string): string {
  const hours = calculateDuration(startTime, endTime);
  return `${hours}h`;
}

/** Get position percentage for a time within 24h (0–100) */
function timeToPercent(time: string): number {
  return (timeToMinutes(time) / 1440) * 100;
}

/** Format 24h time to 12h display */
function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

// ─── Preset Colors ─────────────────────────────────────────────
const SHIFT_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

// ─── Form State Type ───────────────────────────────────────────
interface ShiftForm {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
  halfDayMin: number;
  overtimeThreshold: number;
  isDefault: boolean;
  color: string;
}

const emptyForm: ShiftForm = {
  name: '',
  startTime: '09:00',
  endTime: '17:00',
  gracePeriod: 15,
  halfDayMin: 4,
  overtimeThreshold: 9,
  isDefault: false,
  color: SHIFT_COLORS[0],
};

// ─── Page transition variants ──────────────────────────────────
const pageVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const listVariants = {
  enter: { opacity: 0, x: -40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
};

// ─── Role Badge Config ─────────────────────────────────────────
const ROLE_BADGE: Record<string, { bg: string; text: string; border: string; icon: typeof Crown }> = {
  admin: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/25', icon: Crown },
  manager: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', icon: Shield },
  employee: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25', icon: Users },
};

// ─── Color Picker Component ───────────────────────────────────
const ShiftColorPicker = memo(function ShiftColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SHIFT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'h-7 w-7 rounded-full border-2 transition-all duration-150 hover:scale-110',
            value === c
              ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.3)] scale-110'
              : 'border-transparent hover:border-black/[0.15] dark:hover:border-white/[0.3]'
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
});

// ─── Shift Timeline Bar ──────────────────────────────────────
const ShiftTimelineBar = memo(function ShiftTimelineBar({ shift, className }: { shift: Shift; className?: string }) {
  const startPct = timeToPercent(shift.startTime);
  const endPct = timeToPercent(shift.endTime);
  const isOvernight = endPct <= startPct;
  const accentColor = shift.color || '#10b981';

  return (
    <div className={cn('relative h-6 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden', className)}>
      {/* Hour markers */}
      {[0, 6, 12, 18].map((h) => (
        <div
          key={h}
          className="absolute top-0 bottom-0 w-px bg-black/[0.04] dark:bg-white/[0.06]"
          style={{ left: `${(h / 24) * 100}%` }}
        />
      ))}
      {isOvernight ? (
        <>
          <div
            className="absolute top-1 bottom-1 rounded-full opacity-80"
            style={{
              left: `${startPct}%`,
              width: `${100 - startPct}%`,
              backgroundColor: accentColor,
            }}
          />
          <div
            className="absolute top-1 bottom-1 rounded-full opacity-80"
            style={{
              left: '0%',
              width: `${endPct}%`,
              backgroundColor: accentColor,
            }}
          />
        </>
      ) : (
        <div
          className="absolute top-1 bottom-1 rounded-full opacity-80"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            backgroundColor: accentColor,
          }}
        />
      )}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-black/[0.3] dark:bg-white/[0.6]"
        style={{ left: `${startPct}%` }}
      />
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-black/[0.2] dark:bg-white/[0.4]"
        style={{ left: `${endPct}%` }}
      />
    </div>
  );
});

// ─── Shift Form (shared for create/edit) ─────────────────────
const ShiftFormFields = memo(function ShiftFormFields({
  form,
  setForm,
}: {
  form: ShiftForm;
  setForm: React.Dispatch<React.SetStateAction<ShiftForm>>;
}) {
  const duration = calculateDuration(form.startTime, form.endTime);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Shift Name <span className="text-rose-400">*</span>
        </Label>
        <Input
          placeholder="e.g. Morning Shift"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Start Time</Label>
          <Input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">End Time</Label>
          <Input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>
      </div>

      {/* Visual Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Timeline Preview</Label>
        <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3 space-y-2">
          <ShiftTimelineBar shift={form as Shift} />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>12 AM</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTime12(form.startTime)} — {formatTime12(form.endTime)}</span>
            <span className="text-emerald-400 font-medium">({duration}h)</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Grace Period: <span className="text-cyan-400 font-medium">{form.gracePeriod} min</span>
        </Label>
        <input
          type="range"
          min={0}
          max={60}
          step={5}
          value={form.gracePeriod}
          onChange={(e) => setForm((f) => ({ ...f, gracePeriod: Number(e.target.value) }))}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0 min</span>
          <span>60 min</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Half Day Minimum: <span className="text-amber-400 font-medium">{form.halfDayMin}h</span>
        </Label>
        <input
          type="range"
          min={1}
          max={12}
          step={0.5}
          value={form.halfDayMin}
          onChange={(e) => setForm((f) => ({ ...f, halfDayMin: Number(e.target.value) }))}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1h</span>
          <span>12h</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Overtime Threshold: <span className="text-orange-400 font-medium">{form.overtimeThreshold}h</span>
        </Label>
        <input
          type="range"
          min={6}
          max={14}
          step={0.5}
          value={form.overtimeThreshold}
          onChange={(e) => setForm((f) => ({ ...f, overtimeThreshold: Number(e.target.value) }))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>6h</span>
          <span>14h</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color</Label>
        <ShiftColorPicker
          value={form.color}
          onChange={(c) => setForm((f) => ({ ...f, color: c }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors duration-200',
            form.isDefault ? 'bg-emerald-500' : 'bg-black/[0.06] dark:bg-white/[0.1]'
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
              form.isDefault ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
        <Label className="text-xs text-muted-foreground">Set as Default Shift</Label>
      </div>
    </div>
  );
});

// ─── Weekly Schedule Preview ─────────────────────────────────
function WeeklySchedulePreview({ shift }: { shift: Shift }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const accentColor = shift.color || '#10b981';

  return (
    <GlassCard className="p-5 space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-amber-400" /> Weekly Schedule Preview
      </h4>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isWeekend = i >= 5;
          return (
            <div
              key={day}
              className={cn(
                'rounded-lg border p-3 text-center space-y-2',
                isWeekend
                  ? 'border-black/[0.04] dark:border-white/[0.04] bg-black/[0.01] dark:bg-white/[0.02] opacity-50'
                  : 'border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04]'
              )}
            >
              <p className="text-[10px] text-muted-foreground font-medium">{day}</p>
              {isWeekend ? (
                <Moon className="h-4 w-4 mx-auto text-muted-foreground/40" />
              ) : (
                <>
                  <div
                    className="h-1.5 rounded-full mx-auto w-8"
                    style={{ backgroundColor: accentColor }}
                  />
                  <p className="text-[9px] text-muted-foreground">
                    {formatTime12(shift.startTime).replace(' ', '')}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── 24-Hour Timeline Component ──────────────────────────────
function FullTimeline({ shift, overlappingShifts }: { shift: Shift; overlappingShifts: Shift[] }) {
  const accentColor = shift.color || '#10b981';

  return (
    <GlassCard className="p-5 space-y-4" glow="cyan">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-cyan-400" /> 24-Hour Timeline
      </h4>
      <div className="relative h-16 rounded-lg bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
        {/* Hour labels */}
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-black/[0.02] dark:bg-white/[0.04]"
            style={{ left: `${(i / 24) * 100}%` }}
          />
        ))}
        {/* Hour text labels */}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
          <div
            key={h}
            className="absolute -bottom-5 text-[9px] text-muted-foreground/60"
            style={{ left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)' }}
          >
            {h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`}
          </div>
        ))}
        {/* Main shift bar */}
        {(() => {
          const startPct = timeToPercent(shift.startTime);
          const endPct = timeToPercent(shift.endTime);
          const isOvernight = endPct <= startPct;
          if (isOvernight) {
            return (
              <>
                <div
                  className="absolute top-2 bottom-2 rounded-md opacity-90"
                  style={{ left: `${startPct}%`, width: `${100 - startPct}%`, backgroundColor: accentColor }}
                />
                <div
                  className="absolute top-2 bottom-2 rounded-md opacity-90"
                  style={{ left: '0%', width: `${endPct}%`, backgroundColor: accentColor }}
                />
              </>
            );
          }
          return (
            <div
              className="absolute top-2 bottom-2 rounded-md opacity-90"
              style={{ left: `${startPct}%`, width: `${endPct - startPct}%`, backgroundColor: accentColor }}
            />
          );
        })()}
        {/* Overlapping shifts */}
        {overlappingShifts.map((os) => {
          const osStart = timeToPercent(os.startTime);
          const osEnd = timeToPercent(os.endTime);
          const osOvernight = osEnd <= osStart;
          return (
            <div key={os.id}>
              {osOvernight ? (
                <>
                  <div
                    className="absolute top-9 bottom-2 rounded-sm opacity-40"
                    style={{ left: `${osStart}%`, width: `${100 - osStart}%`, backgroundColor: os.color || '#10b981' }}
                  />
                  <div
                    className="absolute top-9 bottom-2 rounded-sm opacity-40"
                    style={{ left: '0%', width: `${osEnd}%`, backgroundColor: os.color || '#10b981' }}
                  />
                </>
              ) : (
                <div
                  className="absolute top-9 bottom-2 rounded-sm opacity-40"
                  style={{ left: `${osStart}%`, width: `${osEnd - osStart}%`, backgroundColor: os.color || '#10b981' }}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-4">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: accentColor }} />
          <span className="text-muted-foreground">{shift.name}</span>
        </div>
        {overlappingShifts.map((os) => (
          <div key={os.id} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-5 rounded-sm opacity-40" style={{ backgroundColor: os.color || '#10b981' }} />
            <span className="text-muted-foreground">{os.name} (overlap)</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function AdminShiftCenter() {
  const {
    shifts,
    users,
    departments,
    loadShifts,
    loadUsers,
    createShift,
    updateShift,
    deleteShift,
    assignEmployeeToShift,
    bulkAssignShift,
  } = useEMSStore();

  // ─── Load Data on Mount ───────────────────────────────────
  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // ─── View Mode State ─────────────────────────────────────
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('overview');

  // ─── Filter State ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');

  // Employee search in detail view
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ShiftForm>({ ...emptyForm });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ShiftForm>({ ...emptyForm });
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignShiftId, setAssignShiftId] = useState('');
  const [assignSelected, setAssignSelected] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Change shift dialog
  const [changeShiftOpen, setChangeShiftOpen] = useState(false);
  const [changeShiftUser, setChangeShiftUser] = useState<User | null>(null);
  const [changeShiftTargetId, setChangeShiftTargetId] = useState('');
  const [changingShift, setChangingShift] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // ─── Settings form state (detail page) ───────────────────
  const [settingsForm, setSettingsForm] = useState<ShiftForm>({ ...emptyForm });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ─── Selected Shift ──────────────────────────────────────
  const selectedShift = useMemo(() => {
    if (!selectedShiftId) return null;
    return shifts.find((s) => s.id === selectedShiftId) || null;
  }, [selectedShiftId, shifts]);

  // Sync settings form when selected shift changes
  useEffect(() => {
    if (selectedShift) {
      setSettingsForm({
        name: selectedShift.name,
        startTime: selectedShift.startTime,
        endTime: selectedShift.endTime,
        gracePeriod: selectedShift.gracePeriod,
        halfDayMin: selectedShift.halfDayMin,
        overtimeThreshold: selectedShift.overtimeThreshold,
        isDefault: selectedShift.isDefault,
        color: selectedShift.color || SHIFT_COLORS[0],
      });
    }
  }, [selectedShift]);

  // ─── Computed Metrics ────────────────────────────────────
  const metrics = useMemo(() => {
    const totalShifts = shifts.length;
    const defaultShift = shifts.find((s) => s.isDefault);
    const totalAssigned = shifts.reduce((s, sh) => s + (sh.employeeCount || 0), 0);
    const unassigned = users.filter((u) => !u.shiftId && u.isActive !== false).length;
    return { totalShifts, defaultShift, totalAssigned, unassigned };
  }, [shifts, users]);

  // ─── Shift Employees Map ─────────────────────────────────
  const shiftEmployeesMap = useMemo(() => {
    const map: Record<string, User[]> = {};
    for (const u of users) {
      if (u.shiftId) {
        if (!map[u.shiftId]) map[u.shiftId] = [];
        map[u.shiftId].push(u);
      }
    }
    return map;
  }, [users]);

  // ─── Employees for selected shift ────────────────────────
  const selectedShiftEmployees = useMemo(() => {
    if (!selectedShiftId) return [];
    const emps = shiftEmployeesMap[selectedShiftId] || [];
    if (!employeeSearch) return emps;
    const q = employeeSearch.toLowerCase();
    return emps.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.position || '').toLowerCase().includes(q)
    );
  }, [selectedShiftId, shiftEmployeesMap, employeeSearch]);

  // ─── Filtered Shifts ─────────────────────────────────────
  const filteredShifts = useMemo(() => {
    let result = [...shifts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.startTime.includes(q) ||
          s.endTime.includes(q)
      );
    }

    if (filterDept !== 'all') {
      const deptUsers = users.filter((u) => u.departmentId === filterDept);
      const deptShiftIds = new Set(deptUsers.filter((u) => u.shiftId).map((u) => u.shiftId));
      result = result.filter((s) => deptShiftIds.has(s.id));
    }

    result.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [shifts, searchQuery, filterDept, users]);

  // ─── Unassigned Employees (for assign dialog) ────────────
  const unassignedUsers = useMemo(() => {
    return users.filter((u) => u.isActive !== false && (!u.shiftId || u.shiftId !== assignShiftId));
  }, [users, assignShiftId]);

  const filteredAssignUsers = useMemo(() => {
    if (!assignSearch) return unassignedUsers;
    const q = assignSearch.toLowerCase();
    return unassignedUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q)
    );
  }, [unassignedUsers, assignSearch]);

  // ─── Department Breakdown for selected shift ─────────────
  const deptBreakdown = useMemo(() => {
    if (!selectedShiftId) return [];
    const shiftEmps = shiftEmployeesMap[selectedShiftId] || [];
    const map: Record<string, number> = {};
    for (const u of shiftEmps) {
      const deptName = u.department || u.departmentId || 'Unknown';
      map[deptName] = (map[deptName] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [selectedShiftId, shiftEmployeesMap]);

  // ─── Handle Settings Save (detail page) ──────────────────
  const handleSettingsSave = useCallback(async () => {
    if (!selectedShift) return;
    if (!settingsForm.name.trim()) {
      toast.error('Shift name is required');
      return;
    }
    setSettingsSaving(true);
    try {
      await updateShift(selectedShift.id, {
        name: settingsForm.name.trim(),
        startTime: settingsForm.startTime,
        endTime: settingsForm.endTime,
        gracePeriod: settingsForm.gracePeriod,
        halfDayMin: settingsForm.halfDayMin,
        overtimeThreshold: settingsForm.overtimeThreshold,
        isDefault: settingsForm.isDefault,
        color: settingsForm.color,
      });
      toast.success('Shift settings saved');
      await loadShifts();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setTimeout(() => setSettingsSaving(false), 400);
    }
  }, [selectedShift, settingsForm, updateShift, loadShifts]);

  // ─── Shift Overlaps ──────────────────────────────────────
  function getOverlappingShifts(shift: Shift): Shift[] {
    const start = timeToMinutes(shift.startTime);
    const end = timeToMinutes(shift.endTime);
    const isOvernight = end <= start;
    return shifts.filter((s) => {
      if (s.id === shift.id) return false;
      const sStart = timeToMinutes(s.startTime);
      const sEnd = timeToMinutes(s.endTime);
      const sOvernight = sEnd <= sStart;
      if (isOvernight || sOvernight) return true; // overnight shifts always potentially overlap
      return sStart < end && sEnd > start;
    });
  }

  // ─── Handlers ─────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadShifts(), loadUsers()]);
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Shifts refreshed');
    }, 400);
  }, [loadShifts, loadUsers]);

  const handleCreate = useCallback(async () => {
    if (!createForm.name.trim()) {
      toast.error('Shift name is required');
      return;
    }
    setCreating(true);
    try {
      await createShift({
        name: createForm.name.trim(),
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        gracePeriod: createForm.gracePeriod,
        halfDayMin: createForm.halfDayMin,
        overtimeThreshold: createForm.overtimeThreshold,
        isDefault: createForm.isDefault,
        color: createForm.color,
      });
      toast.success('Shift created successfully');
      setCreateOpen(false);
      setCreateForm({ ...emptyForm });
      await loadShifts();
    } catch {
      toast.error('Failed to create shift');
    } finally {
      setTimeout(() => setCreating(false), 400);
    }
  }, [createForm, createShift, loadShifts]);

  const openEdit = useCallback((shift: Shift) => {
    setEditingShift(shift);
    setEditForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriod: shift.gracePeriod,
      halfDayMin: shift.halfDayMin,
      overtimeThreshold: shift.overtimeThreshold,
      isDefault: shift.isDefault,
      color: shift.color || SHIFT_COLORS[0],
    });
    setEditOpen(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingShift) return;
    if (!editForm.name.trim()) {
      toast.error('Shift name is required');
      return;
    }
    setEditSaving(true);
    try {
      await updateShift(editingShift.id, {
        name: editForm.name.trim(),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        gracePeriod: editForm.gracePeriod,
        halfDayMin: editForm.halfDayMin,
        overtimeThreshold: editForm.overtimeThreshold,
        isDefault: editForm.isDefault,
        color: editForm.color,
      });
      toast.success('Shift updated successfully');
      setEditOpen(false);
      await loadShifts();
    } catch {
      toast.error('Failed to update shift');
    } finally {
      setTimeout(() => setEditSaving(false), 400);
    }
  }, [editingShift, editForm, updateShift, loadShifts]);

  const handleSetDefault = useCallback(async (shift: Shift) => {
    try {
      await updateShift(shift.id, { isDefault: true });
      toast.success(`"${shift.name}" set as default shift`);
      await loadShifts();
    } catch {
      toast.error('Failed to set default shift');
    }
  }, [updateShift, loadShifts]);

  const openDeleteConfirm = useCallback((shift: Shift) => {
    if (shift.isDefault) {
      toast.error('Cannot delete the default shift. Set another shift as default first.');
      return;
    }
    setDeleteTarget(shift);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteShift(deleteTarget.id);
      toast.success('Shift deleted');
      setDeleteConfirmOpen(false);
      if (selectedShiftId === deleteTarget.id) {
        setSelectedShiftId(null);
      }
      await Promise.all([loadShifts(), loadUsers()]);
    } catch {
      toast.error('Failed to delete shift');
    } finally {
      setTimeout(() => setDeleting(false), 400);
    }
  }, [deleteTarget, deleteShift, selectedShiftId, loadShifts, loadUsers]);

  const handleAssignEmployee = useCallback(async (userId: string, shiftId: string | null) => {
    try {
      await assignEmployeeToShift(userId, shiftId);
      toast.success(shiftId ? 'Employee assigned to shift' : 'Employee removed from shift');
      await Promise.all([loadShifts(), loadUsers()]);
    } catch {
      toast.error('Failed to assign employee');
    }
  }, [assignEmployeeToShift, loadShifts, loadUsers]);

  const handleBulkAssign = useCallback(async () => {
    if (assignSelected.length === 0 || !assignShiftId) {
      toast.error('Select employees and a shift');
      return;
    }
    setAssigning(true);
    try {
      await bulkAssignShift(assignSelected, assignShiftId);
      toast.success(`${assignSelected.length} employee(s) assigned to shift`);
      setAssignOpen(false);
      setAssignSelected([]);
      await Promise.all([loadShifts(), loadUsers()]);
    } catch {
      toast.error('Failed to bulk assign');
    } finally {
      setTimeout(() => setAssigning(false), 400);
    }
  }, [assignSelected, assignShiftId, bulkAssignShift, loadShifts, loadUsers]);

  const handleChangeShift = useCallback(async () => {
    if (!changeShiftUser || !changeShiftTargetId) return;
    setChangingShift(true);
    try {
      await assignEmployeeToShift(changeShiftUser.id, changeShiftTargetId);
      toast.success('Shift changed successfully');
      setChangeShiftOpen(false);
      setChangeShiftUser(null);
      setChangeShiftTargetId('');
      await Promise.all([loadShifts(), loadUsers()]);
    } catch {
      toast.error('Failed to change shift');
    } finally {
      setTimeout(() => setChangingShift(false), 400);
    }
  }, [changeShiftUser, changeShiftTargetId, assignEmployeeToShift, loadShifts, loadUsers]);



  // ═══════════════════════════════════════════════════════════
  // ─── RENDER: LIST VIEW ───────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  function renderListView() {
    return (
      <motion.div
        key="shift-list"
        variants={listVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="space-y-6"
      >
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Shift Management
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {metrics.totalShifts} shifts &middot; {metrics.totalAssigned} employees assigned
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}{' '}
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateForm({ ...emptyForm });
                setCreateOpen(true);
              }}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              <Plus className="h-3.5 w-3.5" /> Create Shift
            </Button>
          </div>
        </div>

        {/* ═══ HERO STAT CARDS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Total Shifts', value: metrics.totalShifts, icon: Timer, color: 'cyan' as const, subtitle: 'Configured shifts' },
            { title: 'Default Shift', value: metrics.defaultShift?.name || 'None', icon: Star, color: 'emerald' as const, subtitle: metrics.defaultShift ? `${formatTime12(metrics.defaultShift.startTime)} – ${formatTime12(metrics.defaultShift.endTime)}` : 'Not configured' },
            { title: 'Total Assigned', value: metrics.totalAssigned, icon: Users, color: 'amber' as const, subtitle: 'Employees on shifts' },
            { title: 'Unassigned', value: metrics.unassigned, icon: UserX, color: 'rose' as const, subtitle: 'No shift assigned', pulse: metrics.unassigned > 0 },
          ].map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StatCard
                title={m.title}
                value={m.value}
                icon={m.icon}
                color={m.color}
                subtitle={m.subtitle}
                hero
                pulse={m.pulse}
              />
            </motion.div>
          ))}
        </div>

        {/* ═══ STICKY SEARCH & FILTER ═══ */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl -mx-1 px-1 pt-1 pb-2">
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shifts by name, time..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-9 w-44 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => {
                  setCreateForm({ ...emptyForm });
                  setCreateOpen(true);
                }}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 hidden sm:flex"
              >
                <Plus className="h-3.5 w-3.5" /> Create Shift
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* ═══ SHIFT CARDS GRID ═══ */}
        {filteredShifts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-12 text-center">
              <Timer className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterDept !== 'all'
                  ? 'No shifts match your filters'
                  : 'No shifts yet. Create one to get started.'}
              </p>
              {shifts.length === 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCreateForm({ ...emptyForm });
                    setCreateOpen(true);
                  }}
                  className="mt-4 gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Your First Shift
                </Button>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredShifts.map((shift, i) => {
                const accentColor = shift.color || '#10b981';
                const empCount = shift.employeeCount || shiftEmployeesMap[shift.id]?.length || 0;

                return (
                  <motion.div
                    key={shift.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <GlassCard
                      hover
                      onClick={() => {
                        setSelectedShiftId(shift.id);
                        setDetailTab('overview');
                      }}
                      className="overflow-hidden"
                    >
                      {/* Color accent bar */}
                      <div
                        className="h-1.5 w-full"
                        style={{ backgroundColor: accentColor }}
                      />

                      <div className="p-5 space-y-3">
                        {/* Name + Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold truncate">{shift.name}</h3>
                              {shift.isDefault && (
                                <Badge className="shrink-0 text-[10px] border bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1">
                                  <Star className="h-2.5 w-2.5" /> Default
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge
                            className="shrink-0 text-[10px] border gap-1"
                            style={{
                              backgroundColor: `${accentColor}20`,
                              color: accentColor,
                              borderColor: `${accentColor}40`,
                            }}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {formatDuration(shift.startTime, shift.endTime)}
                          </Badge>
                        </div>

                        {/* Visual Timeline */}
                        <ShiftTimelineBar shift={shift} />

                        {/* Time range */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>{formatTime12(shift.startTime)} — {formatTime12(shift.endTime)}</span>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-md bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-2 text-center">
                            <p className="text-[9px] text-muted-foreground uppercase">Grace</p>
                            <p className="text-xs font-bold text-cyan-400">{shift.gracePeriod}m</p>
                          </div>
                          <div className="rounded-md bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-2 text-center">
                            <p className="text-[9px] text-muted-foreground uppercase">Half Day</p>
                            <p className="text-xs font-bold text-amber-400">{shift.halfDayMin}h</p>
                          </div>
                          <div className="rounded-md bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-2 text-center">
                            <p className="text-[9px] text-muted-foreground uppercase">OT Thresh</p>
                            <p className="text-xs font-bold text-orange-400">{shift.overtimeThreshold}h</p>
                          </div>
                        </div>

                        {/* Employee count */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="font-medium">{empCount}</span>
                          <span>employee{empCount !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShiftId(shift.id);
                              setDetailTab('overview');
                            }}
                          >
                            <Eye className="h-3 w-3" /> Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(shift);
                            }}
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                          {!shift.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] gap-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(shift);
                              }}
                            >
                              <Star className="h-3 w-3" /> Default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(shift);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ─── RENDER: DETAIL PAGE ─────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  function renderDetailPage() {
    if (!selectedShift) return null;
    const accentColor = selectedShift.color || '#10b981';
    const duration = calculateDuration(selectedShift.startTime, selectedShift.endTime);
    const shiftEmps = shiftEmployeesMap[selectedShift.id] || [];

    return (
      <motion.div
        key="shift-detail"
        variants={pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="space-y-6"
      >
        {/* ═══ BACK BUTTON ═══ */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedShiftId(null)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shifts
        </Button>

        {/* ═══ SHIFT HEADER ═══ */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold text-white"
                style={{ backgroundColor: `${accentColor}30`, border: `1px solid ${accentColor}50`, color: accentColor }}
              >
                {getInitials(selectedShift.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold truncate">{selectedShift.name}</h2>
                  {selectedShift.isDefault && (
                    <Badge className="shrink-0 text-[10px] border bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1">
                      <Star className="h-2.5 w-2.5" /> Default
                    </Badge>
                  )}
                  <Badge
                    className="shrink-0 text-[10px] border gap-1"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}40` }}
                  >
                    {formatTime12(selectedShift.startTime)} — {formatTime12(selectedShift.endTime)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {duration}h duration &middot; {shiftEmps.length} employee{shiftEmps.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30"
                onClick={() => openEdit(selectedShift)}
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              {!selectedShift.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-emerald-500/10 hover:border-emerald-500/30"
                  onClick={() => handleSetDefault(selectedShift)}
                >
                  <Star className="h-3.5 w-3.5" /> Set Default
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-black/[0.1] dark:border-white/[0.1] hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-400"
                onClick={() => openDeleteConfirm(selectedShift)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* ═══ TABS ═══ */}
        <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-4">
          <TabsList className="bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
            <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
              <Layers className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400">
              <Users className="h-3.5 w-3.5" /> Employees
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400">
              <CalendarDays className="h-3.5 w-3.5" /> Schedule
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-400">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-4">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <Sun className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Start Time</p>
                    <p className="text-sm font-medium text-cyan-400">{formatTime12(selectedShift.startTime)}</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Moon className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">End Time</p>
                    <p className="text-sm font-medium text-orange-400">{formatTime12(selectedShift.endTime)}</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</p>
                    <p className="text-sm font-medium text-emerald-400">{duration} hours</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Grace Period</p>
                    <p className="text-sm font-medium text-amber-400">{selectedShift.gracePeriod} min</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Employee Stats & Shift Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Stats */}
              <GlassCard className="p-5 space-y-4" glow="cyan">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" /> Employee Stats
                </h4>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-cyan-500/15">
                    <Users className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cyan-400">{shiftEmps.length}</p>
                    <p className="text-xs text-muted-foreground">Total Assigned</p>
                  </div>
                </div>
                {deptBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Department Breakdown</p>
                    {deptBreakdown.map(([dept, count]) => {
                      const deptData = departments.find((d) => d.id === dept || d.name === dept);
                      const deptColor = deptData?.color || '#10b981';
                      return (
                        <div key={dept} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
                          <span className="text-xs text-muted-foreground flex-1 truncate">
                            {deptData?.name || dept}
                          </span>
                          <span className="text-xs font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              {/* Shift Rules */}
              <GlassCard className="p-5 space-y-4" glow="amber">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" /> Shift Rules
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Half-Day Threshold</span>
                    <span className="text-sm font-medium text-amber-400">{selectedShift.halfDayMin}h</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-amber-500/60"
                      style={{ width: `${(selectedShift.halfDayMin / 12) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Overtime Threshold</span>
                    <span className="text-sm font-medium text-orange-400">{selectedShift.overtimeThreshold}h</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-orange-500/60"
                      style={{ width: `${(selectedShift.overtimeThreshold / 14) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Grace Period</span>
                    <span className="text-sm font-medium text-cyan-400">{selectedShift.gracePeriod} min</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-cyan-500/60"
                      style={{ width: `${(selectedShift.gracePeriod / 60) * 100}%` }}
                    />
                  </div>
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          {/* ═══ EMPLOYEES TAB ═══ */}
          <TabsContent value="employees" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="h-9 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setAssignShiftId(selectedShift.id);
                  setAssignSearch('');
                  setAssignSelected([]);
                  setAssignOpen(true);
                }}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
              >
                <UserPlus className="h-3.5 w-3.5" /> Assign Employee
              </Button>
            </div>

            {selectedShiftEmployees.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No employees assigned to this shift</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1.5 border-black/[0.1] dark:border-white/[0.1]"
                  onClick={() => {
                    setAssignShiftId(selectedShift.id);
                    setAssignSearch('');
                    setAssignSelected([]);
                    setAssignOpen(true);
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Assign Employees
                </Button>
              </GlassCard>
            ) : (
              <GlassCard className="overflow-hidden">
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-black/[0.06] dark:border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground hidden md:table-cell">Department</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Role</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Position</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">Shift</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedShiftEmployees.map((emp) => {
                        const roleConfig = ROLE_BADGE[emp.role] || ROLE_BADGE.employee;
                        const RoleIcon = roleConfig.icon;
                        const empDept = departments.find((d) => d.id === emp.departmentId);

                        return (
                          <TableRow key={emp.id} className="border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shrink-0',
                                    getAvatarColor(emp.name)
                                  )}
                                >
                                  {getInitials(emp.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{emp.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{emp.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-1.5">
                                {empDept && (
                                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: empDept.color || '#10b981' }} />
                                )}
                                <span className="text-xs text-muted-foreground truncate">
                                  {empDept?.name || emp.department || '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge className={cn('text-[9px] border gap-1', roleConfig.bg, roleConfig.text, roleConfig.border)}>
                                <RoleIcon className="h-2.5 w-2.5" />
                                {emp.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {emp.position || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className="text-[9px] border gap-1"
                                style={{
                                  backgroundColor: `${accentColor}20`,
                                  color: accentColor,
                                  borderColor: `${accentColor}40`,
                                }}
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {selectedShift.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] gap-1 text-amber-400 hover:bg-amber-500/10"
                                  onClick={() => {
                                    setChangeShiftUser(emp);
                                    setChangeShiftTargetId('');
                                    setChangeShiftOpen(true);
                                  }}
                                >
                                  <Edit className="h-3 w-3" /> Change
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] gap-1 text-rose-400 hover:bg-rose-500/10"
                                  onClick={() => handleAssignEmployee(emp.id, null)}
                                >
                                  <XCircle className="h-3 w-3" /> Remove
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </GlassCard>
            )}
          </TabsContent>

          {/* ═══ SCHEDULE TAB ═══ */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FullTimeline shift={selectedShift} overlappingShifts={getOverlappingShifts(selectedShift)} />
              <WeeklySchedulePreview shift={selectedShift} />
            </div>

            {/* Overlap Indicator */}
            {getOverlappingShifts(selectedShift).length > 0 && (
              <GlassCard className="p-5 space-y-3" glow="amber">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" /> Shift Overlaps
                </h4>
                <div className="space-y-2">
                  {getOverlappingShifts(selectedShift).map((os) => (
                    <div
                      key={os.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]"
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: os.color || '#10b981' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{os.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatTime12(os.startTime)} — {formatTime12(os.endTime)}
                        </p>
                      </div>
                      <Badge className="text-[9px] border bg-amber-500/15 text-amber-400 border-amber-500/25">
                        Overlaps
                      </Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </TabsContent>

          {/* ═══ SETTINGS TAB ═══ */}
          <TabsContent value="settings" className="space-y-4">
            <GlassCard className="p-6 space-y-6" glow="violet">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-violet-400" /> Shift Configuration
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Shift Name</Label>
                    <Input
                      value={settingsForm.name}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
                      className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Start Time</Label>
                      <Input
                        type="time"
                        value={settingsForm.startTime}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, startTime: e.target.value }))}
                        className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">End Time</Label>
                      <Input
                        type="time"
                        value={settingsForm.endTime}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, endTime: e.target.value }))}
                        className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <ShiftColorPicker
                      value={settingsForm.color}
                      onChange={(c) => setSettingsForm((f) => ({ ...f, color: c }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Grace Period: <span className="text-cyan-400 font-medium">{settingsForm.gracePeriod} min</span>
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={5}
                      value={settingsForm.gracePeriod}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, gracePeriod: Number(e.target.value) }))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Half Day Minimum: <span className="text-amber-400 font-medium">{settingsForm.halfDayMin}h</span>
                    </Label>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      step={0.5}
                      value={settingsForm.halfDayMin}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, halfDayMin: Number(e.target.value) }))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Overtime Threshold: <span className="text-orange-400 font-medium">{settingsForm.overtimeThreshold}h</span>
                    </Label>
                    <input
                      type="range"
                      min={6}
                      max={14}
                      step={0.5}
                      value={settingsForm.overtimeThreshold}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, overtimeThreshold: Number(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSettingsForm((f) => ({ ...f, isDefault: !f.isDefault }))}
                      className={cn(
                        'relative h-5 w-9 rounded-full transition-colors duration-200',
                        settingsForm.isDefault ? 'bg-emerald-500' : 'bg-black/[0.06] dark:bg-white/[0.1]'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                          settingsForm.isDefault ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                    <Label className="text-xs text-muted-foreground">Set as Default Shift</Label>
                  </div>
                </div>
              </div>

              {/* Timeline Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] p-3 space-y-2">
                  <ShiftTimelineBar shift={settingsForm as Shift} />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>12 AM</span>
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>12 AM</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-black/[0.1] dark:border-white/[0.1]"
                  onClick={() => {
                    setSettingsForm({
                      name: selectedShift.name,
                      startTime: selectedShift.startTime,
                      endTime: selectedShift.endTime,
                      gracePeriod: selectedShift.gracePeriod,
                      halfDayMin: selectedShift.halfDayMin,
                      overtimeThreshold: selectedShift.overtimeThreshold,
                      isDefault: selectedShift.isDefault,
                      color: selectedShift.color || SHIFT_COLORS[0],
                    });
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSettingsSave}
                  disabled={settingsSaving}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                >
                  {settingsSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}{' '}
                  Save Changes
                </Button>
              </div>
            </GlassCard>

            {/* Danger Zone */}
            <GlassCard className="p-6 space-y-4" glow="rose">
              <h4 className="text-sm font-medium text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Danger Zone
              </h4>
              <Separator className="bg-black/[0.04] dark:bg-white/[0.06]" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Delete this shift</p>
                  <p className="text-xs text-muted-foreground">
                    All assigned employees will be unassigned. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 shrink-0"
                  onClick={() => openDeleteConfirm(selectedShift)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Shift
                </Button>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ─── MAIN RENDER ─────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      <AnimatePresence mode="wait">
        {selectedShiftId ? renderDetailPage() : renderListView()}
      </AnimatePresence>

      {/* ═══ CREATE SHIFT DIALOG ═══ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Plus className="h-4 w-4 text-emerald-400" />
              </div>
              Create New Shift
            </DialogTitle>
            <DialogDescription>
              Define a new shift schedule for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <ShiftFormFields form={createForm} setForm={setCreateForm} />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-black/[0.1] dark:border-white/[0.1]"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}{' '}
              Create Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ EDIT SHIFT DIALOG ═══ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Edit className="h-4 w-4 text-amber-400" />
              </div>
              Edit Shift
            </DialogTitle>
            <DialogDescription>
              Update shift configuration for &ldquo;{editingShift?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <ShiftFormFields form={editForm} setForm={setEditForm} />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-black/[0.1] dark:border-white/[0.1]"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              disabled={editSaving}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              {editSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}{' '}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>
            </div>
            <AlertDialogTitle>Delete Shift &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this shift and unassign all employees from it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-black/[0.1] dark:border-white/[0.1]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-500 gap-1.5"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}{' '}
              Delete Shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ ASSIGN EMPLOYEE DIALOG ═══ */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-emerald-400" />
              </div>
              Assign Employees to Shift
            </DialogTitle>
            <DialogDescription>
              Select employees and assign them to a shift.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Shift Selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Target Shift</Label>
              <Select value={assignShiftId} onValueChange={setAssignShiftId}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                  <SelectValue placeholder="Select a shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || '#10b981' }} />
                        {s.name} ({formatTime12(s.startTime)} – {formatTime12(s.endTime)})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>

            {/* Employee List */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {filteredAssignUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No unassigned employees found</p>
                ) : (
                  filteredAssignUsers.map((u) => {
                    const isSelected = assignSelected.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setAssignSelected((prev) =>
                            isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          );
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left',
                          isSelected
                            ? 'bg-emerald-500/10 border border-emerald-500/25'
                            : 'bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                        )}
                      >
                        <div
                          className={cn(
                            'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-black/[0.12] dark:border-white/[0.2]'
                          )}
                        >
                          {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div
                          className={cn(
                            'h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-[9px] font-bold text-white shrink-0',
                            getAvatarColor(u.name)
                          )}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.position || u.email}</p>
                        </div>
                        {u.shiftId && (
                          <Badge className="text-[8px] bg-amber-500/15 text-amber-400 border-amber-500/25 border shrink-0">
                            Has Shift
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {assignSelected.length > 0 && (
              <p className="text-xs text-emerald-400 font-medium">
                {assignSelected.length} employee{assignSelected.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-black/[0.1] dark:border-white/[0.1]"
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkAssign}
              disabled={assigning || assignSelected.length === 0}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              {assigning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}{' '}
              Assign ({assignSelected.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CHANGE SHIFT DIALOG ═══ */}
      <Dialog open={changeShiftOpen} onOpenChange={setChangeShiftOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Edit className="h-4 w-4 text-amber-400" />
              </div>
              Change Shift for {changeShiftUser?.name}
            </DialogTitle>
            <DialogDescription>
              Select a new shift for this employee.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Current Shift */}
            {changeShiftUser?.shiftId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Current:</span>
                <Badge className="text-[9px] border gap-1" style={{
                  backgroundColor: `${selectedShift?.color || '#10b981'}20`,
                  color: selectedShift?.color || '#10b981',
                  borderColor: `${selectedShift?.color || '#10b981'}40`,
                }}>
                  <Clock className="h-2.5 w-2.5" />
                  {changeShiftUser.shiftName || 'Unknown'}
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">New Shift</Label>
              <Select value={changeShiftTargetId} onValueChange={setChangeShiftTargetId}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
                  <SelectValue placeholder="Select a shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || '#10b981' }} />
                        {s.name} ({formatTime12(s.startTime)} – {formatTime12(s.endTime)})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-black/[0.1] dark:border-white/[0.1]"
              onClick={() => setChangeShiftOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleChangeShift}
              disabled={changingShift || !changeShiftTargetId}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              {changingShift ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}{' '}
              Change Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
