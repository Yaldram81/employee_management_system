'use client';

import { useState, useMemo, useCallback } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Users, Crown,
  Building2, Palette, UserPlus, UserMinus, Search,
  Loader2, Sparkles, Shield, Mail, AlertTriangle,
  Eye, Zap, Target, Plus, X, ChevronRight,
} from 'lucide-react';

// ─── Color presets ──────────────────────────────────────────────
const COLOR_PRESETS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Lime', value: '#84cc16' },
];

// ─── Step config ────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Basic Info', icon: Building2, description: 'Name, description & department' },
  { id: 2, label: 'Members', icon: Users, description: 'Add team lead & members' },
  { id: 3, label: 'Customize', icon: Palette, description: 'Color & appearance' },
  { id: 4, label: 'Review', icon: Eye, description: 'Confirm & create' },
];

// ─── Avatar helpers ─────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    'from-emerald-500 to-cyan-500',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-teal-500',
    'from-lime-500 to-green-500',
    'from-fuchsia-500 to-pink-500',
    'from-sky-500 to-blue-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Main Component ─────────────────────────────────────────────
export function CreateTeamPage() {
  const { users, departments, createTeam, loadTeams, setActiveView } = useEMSStore();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    departmentId: '',
    color: '#10b981',
    isActive: true,
  });

  // Members state
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Array<{ userId: string; role: 'LEAD' | 'MEMBER' }>>([]);

  // Creation state
  const [creating, setCreating] = useState(false);

  // ─── Computed ─────────────────────────────────────────────
  const teamLead = useMemo(() => {
    const leadEntry = selectedMembers.find(m => m.role === 'LEAD');
    if (!leadEntry) return null;
    return users.find(u => u.id === leadEntry.userId) || null;
  }, [selectedMembers, users]);

  const memberUsers = useMemo(() => {
    return selectedMembers
      .map(m => ({ ...m, user: users.find(u => u.id === m.userId) }))
      .filter(m => m.user);
  }, [selectedMembers, users]);

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(selectedMembers.map(m => m.userId));
    return users.filter(u => u.isActive !== false && !selectedIds.has(u.id));
  }, [users, selectedMembers]);

  const filteredAvailableUsers = useMemo(() => {
    if (!memberSearch) return availableUsers.slice(0, 30);
    const q = memberSearch.toLowerCase();
    return availableUsers.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [availableUsers, memberSearch]);

  const selectedDepartment = useMemo(() => {
    if (!form.departmentId) return null;
    return departments.find(d => d.id === form.departmentId) || null;
  }, [form.departmentId, departments]);

  // ─── Validation ───────────────────────────────────────────
  const stepValid = useMemo(() => {
    switch (currentStep) {
      case 1: return form.name.trim().length >= 2;
      case 2: return selectedMembers.length > 0;
      case 3: return true; // Color always valid
      case 4: return form.name.trim().length >= 2 && selectedMembers.length > 0;
      default: return false;
    }
  }, [currentStep, form.name, selectedMembers]);

  // ─── Handlers ─────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!stepValid) return;
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, [stepValid]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const addMember = useCallback((user: User, role: 'LEAD' | 'MEMBER' = 'MEMBER') => {
    // If adding a LEAD, demote existing lead to MEMBER
    if (role === 'LEAD') {
      setSelectedMembers(prev =>
        prev.map(m => m.role === 'LEAD' ? { ...m, role: 'MEMBER' as const } : m)
          .concat({ userId: user.id, role: 'LEAD' as const })
      );
    } else {
      setSelectedMembers(prev => [...prev, { userId: user.id, role }]);
    }
  }, []);

  const removeMember = useCallback((userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.userId !== userId));
  }, []);

  const changeRole = useCallback((userId: string, newRole: 'LEAD' | 'MEMBER') => {
    setSelectedMembers(prev => {
      if (newRole === 'LEAD') {
        // Demote existing lead
        return prev.map(m => {
          if (m.userId === userId) return { ...m, role: 'LEAD' as const };
          if (m.role === 'LEAD') return { ...m, role: 'MEMBER' as const };
          return m;
        });
      }
      return prev.map(m => m.userId === userId ? { ...m, role: newRole } : m);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!form.name.trim() || selectedMembers.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      await createTeam(form.name, form.description, selectedMembers);
      await loadTeams();
      toast.success('Team created successfully!', { description: `"${form.name}" is now ready to go.` });
      setActiveView('team');
    } catch {
      toast.error('Failed to create team', { description: 'Please try again.' });
    } finally {
      setTimeout(() => setCreating(false), 400);
    }
  }, [form.name, form.description, selectedMembers, createTeam, loadTeams, setActiveView]);

  const goBackToTeams = useCallback(() => {
    setActiveView('team');
  }, [setActiveView]);

  // ─── Animation variants ──────────────────────────────────
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  // ═══════════════════════════════════════════════════════════
  // ═══ RENDER ═══════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ═══ BACK BUTTON ═══ */}
      <Button variant="ghost" size="sm" onClick={goBackToTeams} className="gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </Button>

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
          <Plus className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Create New Team
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set up a new team with members, department, and custom settings
          </p>
        </div>
      </div>

      {/* ═══ STEP INDICATOR ═══ */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            const isLast = idx === STEPS.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Step circle */}
                  <motion.div
                    className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors',
                      isComplete
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isActive
                          ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                          : 'border-black/[0.1] dark:border-white/[0.1] text-muted-foreground/40 bg-black/[0.03] dark:bg-white/[0.05]'
                    )}
                    animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </motion.div>

                  {/* Step label */}
                  <div className="min-w-0 hidden sm:block">
                    <p className={cn(
                      'text-xs font-semibold truncate',
                      isActive ? 'text-emerald-400' : isComplete ? 'text-foreground' : 'text-muted-foreground/50'
                    )}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/40 truncate">{step.description}</p>
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 mx-3">
                    <div className="h-0.5 bg-black/[0.03] dark:bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: isComplete ? '100%' : '0%' }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ═══ STEP CONTENT ═══ */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {currentStep === 1 && (
            <StepBasicInfo form={form} setForm={setForm} departments={departments} />
          )}
          {currentStep === 2 && (
            <StepMembers
              memberSearch={memberSearch}
              setMemberSearch={setMemberSearch}
              selectedMembers={selectedMembers}
              filteredAvailableUsers={filteredAvailableUsers}
              addMember={addMember}
              removeMember={removeMember}
              changeRole={changeRole}
              users={users}
            />
          )}
          {currentStep === 3 && (
            <StepCustomize form={form} setForm={setForm} />
          )}
          {currentStep === 4 && (
            <StepReview
              form={form}
              selectedDepartment={selectedDepartment}
              teamLead={teamLead}
              memberUsers={memberUsers}
              users={users}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══ NAVIGATION FOOTER ═══ */}
      <GlassCard className="p-4 sticky bottom-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={goPrev} className="gap-1.5 border-black/[0.1] dark:border-white/[0.1]">
                <ArrowLeft className="h-4 w-4" /> Previous
              </Button>
            )}
            <Button variant="ghost" onClick={goBackToTeams} className="text-muted-foreground hover:text-rose-400">
              Cancel
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
            {currentStep < 4 ? (
              <Button
                onClick={goNext}
                disabled={!stepValid}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={creating || !stepValid}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none"
              >
                {creating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Create Team</>
                )}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ STEP 1: Basic Info ═══════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function StepBasicInfo({ form, setForm, departments }: {
  form: { name: string; description: string; departmentId: string; color: string; isActive: boolean };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  departments: Array<{ id: string; name: string; color?: string; location?: string; employeeCount?: number }>;
}) {
  const sortedDepts = useMemo(() => [...departments].sort((a, b) => a.name.localeCompare(b.name)), [departments]);

  return (
    <div className="space-y-6">
      {/* Team Name & Icon Preview */}
      <GlassCard glow="emerald" className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-lg p-2 bg-emerald-500/10">
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Team Identity</h3>
            <p className="text-xs text-muted-foreground">Give your team a name and purpose</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Live preview */}
          <div className="space-y-4">
            <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
            <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-5">
              <div className="flex items-center gap-4">
                <div
                  className="h-14 w-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 shadow-lg"
                  style={{ backgroundColor: form.color || '#10b981', opacity: 0.9 }}
                >
                  <span className="text-white drop-shadow-sm">
                    {form.name ? getInitials(form.name) : '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold truncate">{form.name || 'Team Name'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {form.description || 'No description yet'}
                  </p>
                </div>
              </div>
              {form.departmentId && (
                <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.05]">
                  <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
                    <Building2 className="h-2.5 w-2.5 mr-1" />
                    {departments.find(d => d.id === form.departmentId)?.name || 'Department'}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name" className="text-xs font-medium">
                Team Name <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="team-name"
                placeholder="e.g. Phoenix Squad, DevOps Warriors..."
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-10 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 placeholder:text-muted-foreground/30"
                maxLength={50}
              />
              <p className="text-[10px] text-muted-foreground/50">{form.name.length}/50 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-desc" className="text-xs font-medium">Description</Label>
              <Textarea
                id="team-desc"
                placeholder="What does this team do? What are its goals?"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 resize-none placeholder:text-muted-foreground/30"
                maxLength={300}
              />
              <p className="text-[10px] text-muted-foreground/50">{form.description.length}/300 characters</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Department Selection */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-lg p-2 bg-cyan-500/10">
            <Building2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Department Link</h3>
            <p className="text-xs text-muted-foreground">Associate this team with a department (optional)</p>
          </div>
        </div>

        <div className="space-y-3">
          <Select value={form.departmentId || '_none'} onValueChange={v => setForm(prev => ({ ...prev, departmentId: v === '_none' ? '' : v }))}>
            <SelectTrigger className="h-10 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30">
              <SelectValue placeholder="Select a department..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-black/[0.1] dark:border-white/[0.1]">
              <SelectItem value="_none">No Department</SelectItem>
              {sortedDepts.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color || '#6b7280' }} />
                    <span>{dept.name}</span>
                    {dept.employeeCount !== undefined && (
                      <span className="text-muted-foreground text-[10px]">({dept.employeeCount} employees)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department cards grid */}
          {sortedDepts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
              {sortedDepts.map(dept => (
                <motion.button
                  key={dept.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setForm(prev => ({ ...prev, departmentId: prev.departmentId === dept.id ? '' : dept.id }))}
                  className={cn(
                    'rounded-lg p-3 border text-left transition-all',
                    form.departmentId === dept.id
                      ? 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                      : 'border-black/[0.06] dark:border-white/[0.05] bg-black/[0.01] dark:bg-white/[0.02] hover:border-black/[0.1] dark:hover:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dept.color || '#6b7280' }} />
                    <span className="text-xs font-medium truncate">{dept.name}</span>
                  </div>
                  {dept.employeeCount !== undefined && (
                    <p className="text-[10px] text-muted-foreground">{dept.employeeCount} employees</p>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ STEP 2: Members ══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function StepMembers({ memberSearch, setMemberSearch, selectedMembers, filteredAvailableUsers, addMember, removeMember, changeRole, users }: {
  memberSearch: string;
  setMemberSearch: (v: string) => void;
  selectedMembers: Array<{ userId: string; role: 'LEAD' | 'MEMBER' }>;
  filteredAvailableUsers: User[];
  addMember: (user: User, role?: 'LEAD' | 'MEMBER') => void;
  removeMember: (userId: string) => void;
  changeRole: (userId: string, newRole: 'LEAD' | 'MEMBER') => void;
  users: User[];
}) {
  const hasLead = selectedMembers.some(m => m.role === 'LEAD');
  const memberCount = selectedMembers.length;

  return (
    <div className="space-y-6">
      {/* Current Team Roster */}
      <GlassCard glow="emerald" className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-emerald-500/10">
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Team Roster</h3>
              <p className="text-xs text-muted-foreground">{memberCount} member{memberCount !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
              {memberCount} selected
            </Badge>
            {!hasLead && (
              <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/25 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> No Lead
              </Badge>
            )}
          </div>
        </div>

        {selectedMembers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center rounded-xl bg-black/[0.01] dark:bg-white/[0.02] border border-dashed border-black/[0.1] dark:border-white/[0.1]">
            <Users className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No members added yet</p>
            <p className="text-xs text-muted-foreground/50">Search and add members from the panel below</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {/* Lead section */}
            {hasLead && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Crown className="h-3 w-3" /> Team Lead
                </p>
                {selectedMembers.filter(m => m.role === 'LEAD').map(m => {
                  const user = users.find(u => u.id === m.userId);
                  if (!user) return null;
                  return (
                    <motion.div
                      key={m.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/15"
                    >
                      <div className={cn(
                        'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold shrink-0 border-2 border-amber-400/30',
                        getAvatarColor(user.name)
                      )}>
                        {getInitials(user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{user.name}</p>
                          <Badge className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/25 gap-0.5">
                            <Crown className="h-2.5 w-2.5" /> LEAD
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" /> {user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => changeRole(m.userId, 'MEMBER')}
                          className="h-7 text-[10px] text-muted-foreground hover:text-cyan-400 gap-1"
                        >
                          Demote
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(m.userId)}
                          className="h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Members section */}
            {selectedMembers.filter(m => m.role === 'MEMBER').length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Members ({selectedMembers.filter(m => m.role === 'MEMBER').length})
                </p>
                <div className="space-y-1.5">
                  {selectedMembers.filter(m => m.role === 'MEMBER').map(m => {
                    const user = users.find(u => u.id === m.userId);
                    if (!user) return null;
                    return (
                      <motion.div
                        key={m.userId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group"
                      >
                        <div className={cn(
                          'h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold shrink-0',
                          getAvatarColor(user.name)
                        )}>
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{user.position || user.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => changeRole(m.userId, 'LEAD')}
                            className="h-7 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1"
                          >
                            <Crown className="h-3 w-3" /> Promote
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(m.userId)}
                            className="h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Add Members Panel */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-lg p-2 bg-cyan-500/10">
            <UserPlus className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Add Members</h3>
            <p className="text-xs text-muted-foreground">Search and add users to your team</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            className="h-10 pl-9 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
          />
        </div>

        {/* Quick add as lead button */}
        {!hasLead && filteredAvailableUsers.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5 mb-2">
              <Crown className="h-3.5 w-3.5" /> Quick: Assign a Team Lead
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filteredAvailableUsers.slice(0, 5).map(user => (
                <motion.button
                  key={user.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addMember(user, 'LEAD')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  <div className={cn('h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-[8px] font-bold text-white', getAvatarColor(user.name))}>
                    {getInitials(user.name)}
                  </div>
                  {user.name}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* User list */}
        <ScrollArea className="max-h-[350px]">
          <div className="space-y-1">
            {filteredAvailableUsers.map(user => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors group"
              >
                <div className={cn(
                  'h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold shrink-0',
                  getAvatarColor(user.name)
                )}>
                  <span className="text-white">{getInitials(user.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{user.position || user.email}</span>
                    {user.department && (
                      <Badge variant="outline" className="text-[9px] border-black/[0.1] dark:border-white/[0.1] h-4 px-1.5">{user.department}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addMember(user, 'MEMBER')}
                    className="h-7 text-[10px] border-black/[0.1] dark:border-white/[0.1] hover:border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 gap-1"
                  >
                    <Plus className="h-3 w-3" /> Member
                  </Button>
                  {!hasLead && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addMember(user, 'LEAD')}
                      className="h-7 text-[10px] border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10 text-amber-400 gap-1"
                    >
                      <Crown className="h-3 w-3" /> Lead
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
            {filteredAvailableUsers.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">
                  {memberSearch ? 'No users match your search' : 'All users have been added'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ STEP 3: Customize ════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function StepCustomize({ form, setForm }: {
  form: { name: string; description: string; departmentId: string; color: string; isActive: boolean };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
}) {
  return (
    <div className="space-y-6">
      {/* Color Picker */}
      <GlassCard glow="emerald" className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-lg p-2 bg-emerald-500/10">
            <Palette className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Team Color</h3>
            <p className="text-xs text-muted-foreground">Choose a color that represents your team</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Color presets */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Preset Colors</Label>
            <div className="grid grid-cols-5 gap-2.5">
              {COLOR_PRESETS.map(color => (
                <motion.button
                  key={color.value}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setForm(prev => ({ ...prev, color: color.value }))}
                  className={cn(
                    'h-11 w-full rounded-xl flex items-center justify-center transition-all relative',
                    form.color === color.value
                      ? 'ring-2 ring-white/40 shadow-lg'
                      : 'hover:ring-1 hover:ring-white/20'
                  )}
                  style={{ backgroundColor: color.value }}
                >
                  {form.color === color.value && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <CheckCircle2 className="h-4 w-4 text-white drop-shadow-md" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center">
              {COLOR_PRESETS.find(c => c.value === form.color)?.name || 'Custom color'}
            </p>
          </div>

          {/* Live preview */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
            <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-5 space-y-4">
              {/* Team card preview */}
              <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.05]">
                <div className="w-1.5 shrink-0" style={{ backgroundColor: form.color }} />
                <div className="p-4 flex-1 bg-black/[0.01] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ backgroundColor: form.color, opacity: 0.9 }}
                    >
                      <span className="text-white">{form.name ? getInitials(form.name) : '?'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{form.name || 'Team Name'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{form.description || 'No description'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge preview */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className="text-[10px] border"
                  style={{ backgroundColor: `${form.color}15`, color: form.color, borderColor: `${form.color}25` }}
                >
                  <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: form.color }} />
                  Team Badge
                </Badge>
                <Badge variant="outline" className="text-[10px] border-black/[0.1] dark:border-white/[0.1]">Active</Badge>
              </div>

              {/* Button preview */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  style={{ backgroundColor: form.color, borderColor: form.color }}
                >
                  <Zap className="h-3 w-3" /> Action
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-black/[0.1] dark:border-white/[0.1]"
                  style={{ color: form.color, borderColor: `${form.color}30` }}
                >
                  <Target className="h-3 w-3" /> View
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom hex input */}
        <div className="mt-5 pt-5 border-t border-black/[0.06] dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <Label className="text-xs font-medium text-muted-foreground shrink-0">Custom Hex</Label>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg border border-black/[0.1] dark:border-white/[0.1]" style={{ backgroundColor: form.color }} />
              <Input
                value={form.color}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                    setForm(prev => ({ ...prev, color: v }));
                  }
                }}
                className="h-8 w-28 bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30 font-mono text-xs"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Team Status */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg p-2 bg-cyan-500/10">
            <Zap className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Team Status</h3>
            <p className="text-xs text-muted-foreground">Set initial activation state</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]">
          <div>
            <p className="text-sm font-medium">Active on Creation</p>
            <p className="text-xs text-muted-foreground">Team will be immediately available for task assignment</p>
          </div>
          <Switch
            checked={form.isActive}
            onCheckedChange={checked => setForm(prev => ({ ...prev, isActive: checked }))}
          />
        </div>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ═══ STEP 4: Review ═══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
function StepReview({ form, selectedDepartment, teamLead, memberUsers, users }: {
  form: { name: string; description: string; departmentId: string; color: string; isActive: boolean };
  selectedDepartment: { id: string; name: string; color?: string; location?: string; employeeCount?: number } | null;
  teamLead: User | null;
  memberUsers: Array<{ userId: string; role: 'LEAD' | 'MEMBER'; user?: User }>;
  users: User[];
}) {
  const members = memberUsers.filter(m => m.role === 'MEMBER');
  const totalMembers = memberUsers.length;

  return (
    <div className="space-y-6">
      {/* Team Summary Card */}
      <GlassCard glow="emerald" className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-lg p-2 bg-emerald-500/10">
            <Eye className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Team Summary</h3>
            <p className="text-xs text-muted-foreground">Review all details before creating</p>
          </div>
        </div>

        <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.1] dark:border-white/[0.1] p-6">
          {/* Team header preview */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 shadow-lg"
              style={{ backgroundColor: form.color, opacity: 0.9 }}
            >
              <span className="text-white drop-shadow-sm">{getInitials(form.name)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">{form.name}</h2>
              {form.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{form.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selectedDepartment && (
                  <Badge variant="outline" className="text-[10px] border-cyan-500/20 text-cyan-400 bg-cyan-500/5">
                    <Building2 className="h-2.5 w-2.5 mr-1" />{selectedDepartment.name}
                  </Badge>
                )}
                <Badge className={cn(
                  'text-[10px]',
                  form.isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                    : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                )}>
                  {form.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge className="text-[10px]" style={{ backgroundColor: `${form.color}15`, color: form.color, borderColor: `${form.color}25` }}>
                  <div className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: form.color }} />
                  Team Color
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-black/[0.03] dark:bg-white/[0.05] mb-6" />

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
              <Users className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{totalMembers}</p>
              <p className="text-[10px] text-muted-foreground">Total Members</p>
            </div>
            <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
              <Crown className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{teamLead ? 1 : 0}</p>
              <p className="text-[10px] text-muted-foreground">Team Lead</p>
            </div>
            <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] text-center">
              <Building2 className="h-5 w-5 text-violet-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{selectedDepartment ? 1 : 0}</p>
              <p className="text-[10px] text-muted-foreground">Department</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Team Lead */}
      <GlassCard glow="amber" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg p-2 bg-amber-500/10">
            <Crown className="h-4 w-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold">Team Lead</h3>
        </div>
        {teamLead ? (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-500/[0.04] border border-amber-500/15">
            <div className={cn(
              'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg font-bold border-2 border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
              getAvatarColor(teamLead.name)
            )}>
              {getInitials(teamLead.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold truncate">{teamLead.name}</p>
                <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/25 gap-0.5">
                  <Crown className="h-2.5 w-2.5" /> LEAD
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" /> {teamLead.email}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {teamLead.position || teamLead.role} {teamLead.department && `· ${teamLead.department}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">No Team Lead Assigned</p>
              <p className="text-xs text-muted-foreground mt-0.5">Consider going back to assign a lead for better team coordination.</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Members List */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg p-2 bg-cyan-500/10">
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <h3 className="text-sm font-semibold">Team Members ({members.length})</h3>
        </div>
        {members.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {members.map(m => {
              if (!m.user) return null;
              return (
                <motion.div
                  key={m.userId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]"
                >
                  <div className={cn(
                    'h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold shrink-0',
                    getAvatarColor(m.user.name)
                  )}>
                    <span className="text-white">{getInitials(m.user.name)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.user.position || m.user.email}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">No additional members (only lead assigned)</p>
        )}
      </GlassCard>

      {/* Ready to Create Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-violet-500/10 border border-emerald-500/20"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold">Ready to Create!</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your team &quot;{form.name}&quot; with {totalMembers} member{totalMembers !== 1 ? 's' : ''} is ready.
              Click <span className="text-emerald-400 font-medium">Create Team</span> below to finalize.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-emerald-400 shrink-0" />
        </div>
      </motion.div>
    </div>
  );
}
