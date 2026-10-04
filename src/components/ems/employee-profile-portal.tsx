'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { StatCard } from './stat-card';
import { StatusBadge } from './status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Clock,
  Shield,
  KeyRound,
  Lock,
  Monitor,
  Smartphone,
  FileText,
  Download,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Home,
  Wifi,
  Edit,
  Save,
  X,
  UserCog,
  Heart,
  Globe,
  BadgeCheck,
  Activity,
  Eye,
  EyeOff,
  Fingerprint,
  LogOut,
  ChevronRight,
  Upload,
  Camera,
  Sparkles,
} from 'lucide-react';
import { getInitials, formatDateLong, PageSkeleton } from './shared';

// ─── Helpers ────────────────────────────────────────────────────

function getAvatarGradient(name: string) {
  const gradients = [
    'from-emerald-500 to-cyan-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-teal-500',
    'from-lime-500 to-green-500',
    'from-fuchsia-500 to-pink-500',
    'from-violet-500 to-purple-500',
    'from-teal-500 to-emerald-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function getWorkModeConfig(mode?: string) {
  switch (mode) {
    case 'remote':
      return { label: 'Remote', icon: Home, color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/25' };
    case 'hybrid':
      return { label: 'Hybrid', icon: Wifi, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' };
    case 'office':
      return { label: 'On-site', icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' };
    default:
      return { label: 'Not set', icon: Globe, color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/25' };
  }
}

// formatDateLong imported from ./shared

function daysSince(dateStr?: string) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// ─── Animation Variants ────────────────────────────────────────
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

// ─── Data Types ────────────────────────────────────────────────
interface DocumentItem {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
  priority: string;
  isRead: boolean;
  category: string;
}

interface LoginSessionItem {
  id: string;
  device: string;
  ip: string;
  time: string;
  current: boolean;
}

// ─── Edit Profile Form Type ─────────────────────────────────────
interface EditProfileForm {
  name: string;
  phone: string;
  address: string;
  emergencyContact: string;
  dateOfBirth: string;
}

// ─── Main Component ─────────────────────────────────────────────
export function EmployeeProfilePortal() {
  const { user, users, departments, updateUser } = useEMSStore();

  // ─── Loading state ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  // ─── Derived Data ────────────────────────────────────────────
  const userDepartment = useMemo(() => {
    if (!user?.departmentId) return null;
    return departments.find((d) => d.id === user.departmentId) || null;
  }, [user?.departmentId, departments]);

  const managerUser = useMemo(() => {
    if (!userDepartment?.managerId) return null;
    return users.find((u) => u.id === userDepartment.managerId) || null;
  }, [userDepartment?.managerId, users]);

  const tenureDays = useMemo(() => daysSince(user?.joinDate), [user?.joinDate]);

  // ─── State ───────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    name: '',
    phone: '',
    address: '',
    emergencyContact: '',
    dateOfBirth: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState<EditProfileForm>({
    name: '',
    phone: '',
    address: '',
    emergencyContact: '',
    dateOfBirth: '',
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // ─── Password Dialog ─────────────────────────────────────────
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ─── 2FA toggle ──────────────────────────────────────────────
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // ─── API-driven data state ────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginSessionItem[]>([]);
  const [profileDataLoading, setProfileDataLoading] = useState(true);

  // Load read status from localStorage
  const getReadAnnouncementIds = useCallback(() => {
    try {
      const stored = localStorage.getItem('readAnnouncementIds');
      return stored ? JSON.parse(stored) as string[] : [];
    } catch { return []; }
  }, []);

  // ─── Fetch profile data from API ───────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setProfileDataLoading(true);
    Promise.all([
      fetch(`/api/employee-documents?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${btoa(JSON.stringify({ userId: user.id, role: user.role }))}` },
      }).then(r => r.ok ? r.json() : { data: [] }).then(d => d.data || []),
      fetch('/api/announcements', {
        headers: { Authorization: `Bearer ${btoa(JSON.stringify({ userId: user.id, role: user.role }))}` },
      }).then(r => r.ok ? r.json() : { data: [] }).then(d => {
        const items: AnnouncementItem[] = d.data || [];
        const readIds = getReadAnnouncementIds();
        return items.map(a => ({ ...a, isRead: readIds.includes(a.id) }));
      }),
      fetch(`/api/login-history?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${btoa(JSON.stringify({ userId: user.id, role: user.role }))}` },
      }).then(r => r.ok ? r.json() : { data: [] }).then(d => d.data || []),
    ]).then(([docs, anns, logs]) => {
      setDocuments(docs);
      setAnnouncements(anns);
      setLoginHistory(logs);
    }).catch(() => {
      // Keep empty arrays on error
    }).finally(() => setProfileDataLoading(false));
  }, [user?.id, user?.role, getReadAnnouncementIds]);

  // ─── Handlers ────────────────────────────────────────────────
  const openEditDialog = useCallback(() => {
    if (!user) return;
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      address: '',
      emergencyContact: '',
      dateOfBirth: '',
    });
    setEditDialogOpen(true);
  }, [user]);

  const handleEditSave = useCallback(async () => {
    if (!user) return;
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setEditSaving(true);
    try {
      await updateUser(user.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
      });
      toast.success('Profile updated successfully');
      setEditDialogOpen(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setTimeout(() => setEditSaving(false), 400);
    }
  }, [user, editForm, updateUser]);

  const openPersonalEdit = useCallback(() => {
    if (!user) return;
    setPersonalForm({
      name: user.name || '',
      phone: user.phone || '',
      address: '',
      emergencyContact: '',
      dateOfBirth: '',
    });
    setEditingPersonal(true);
  }, [user]);

  const handlePersonalSave = useCallback(async () => {
    if (!user) return;
    if (!personalForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingPersonal(true);
    try {
      await updateUser(user.id, {
        name: personalForm.name.trim(),
        phone: personalForm.phone.trim() || null,
      });
      toast.success('Personal information updated');
      setEditingPersonal(false);
    } catch {
      toast.error('Failed to update information');
    } finally {
      setTimeout(() => setSavingPersonal(false), 400);
    }
  }, [user, personalForm, updateUser]);

  const handlePasswordChange = useCallback(async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!user) return;
    setPasswordSaving(true);
    try {
      await updateUser(user.id, { password: newPassword });
      toast.success('Password changed successfully');
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setTimeout(() => setPasswordSaving(false), 400);
    }
  }, [user, newPassword, confirmPassword, updateUser]);

  const markAnnouncementRead = useCallback((id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
    // Persist read status in localStorage
    try {
      const readIds = JSON.parse(localStorage.getItem('readAnnouncementIds') || '[]') as string[];
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('readAnnouncementIds', JSON.stringify(readIds));
      }
    } catch { /* ignore */ }
  }, []);

  const handleDownloadDoc = useCallback((doc: DocumentItem) => {
    toast.info(`Preparing ${doc.name} for download...`);
  }, []);

  // ─── Quick Info Data ─────────────────────────────────────────
  const workModeConfig = getWorkModeConfig(user?.workMode);

  const quickInfoCards = [
    {
      title: 'Department',
      value: userDepartment?.name || 'Unassigned',
      icon: Building2,
      color: 'emerald' as const,
    },
    {
      title: 'Position',
      value: user?.position || 'Not set',
      icon: Briefcase,
      color: 'cyan' as const,
    },
    {
      title: 'Work Mode',
      value: workModeConfig.label,
      icon: workModeConfig.icon,
      color: user?.workMode === 'remote' ? 'cyan' as const : user?.workMode === 'hybrid' ? 'amber' as const : 'emerald' as const,
    },
    {
      title: 'Joined',
      value: user?.joinDate ? formatDateLong(user.joinDate) : 'Not set',
      icon: Calendar,
      color: 'slate' as const,
    },
  ];

  // ─── Guard ───────────────────────────────────────────────────
  if (loading) return <div className="p-4"><PageSkeleton /></div>;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-12 text-center">
          <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No user data available</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ 1. PROFILE HERO SECTION ═══ */}
      <motion.div {...fadeIn}>
        <GlassCard className="overflow-hidden" glow="emerald">
          {/* Gradient Background Banner */}
          <div className={cn(
            'h-32 sm:h-40 bg-gradient-to-r relative overflow-hidden',
            getAvatarGradient(user.name)
          )}>
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-black/[0.06] dark:bg-white/[0.1] blur-xl" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-black/[0.03] dark:bg-white/[0.05] blur-2xl" />
            <div className="absolute top-4 right-4">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 bg-black/[0.06] dark:bg-white/[0.1] border-black/[0.12] dark:border-white/[0.2] text-white hover:bg-black/[0.1] dark:hover:bg-white/[0.2] backdrop-blur-sm"
                onClick={openEditDialog}
              >
                <Edit className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-6 pb-6 -mt-14 sm:-mt-16 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Large Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-xl">
                  <AvatarFallback className={cn(
                    'bg-gradient-to-br text-2xl sm:text-3xl font-bold text-white',
                    getAvatarGradient(user.name)
                  )}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {/* Status Indicator */}
                <span className={cn(
                  'absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background',
                  user.isActive !== false ? 'bg-emerald-400' : 'bg-slate-500'
                )} />
                {/* Camera overlay on hover */}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Name & Details */}
              <div className="flex-1 min-w-0 pt-2 sm:pb-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                      {user.name}
                    </span>
                  </h1>
                  <Badge className={cn(
                    'border text-xs',
                    user.isActive !== false
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                  )}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    {user.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {user.position && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" /> {user.position}
                    </span>
                  )}
                  {userDepartment && (
                    <Badge variant="outline" className="text-[10px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                      <Building2 className="h-2.5 w-2.5 mr-1" /> {userDepartment.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn('text-[10px] border', workModeConfig.bg, workModeConfig.color, workModeConfig.border)}>
                    {(() => { const Icon = workModeConfig.icon; return <Icon className="h-2.5 w-2.5 mr-1" />; })()}
                    {workModeConfig.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" /> ID: {user.id.slice(0, 8).toUpperCase()}
                  </span>
                  {user.joinDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Joined {formatDateLong(user.joinDate)}
                      {tenureDays !== null && (
                        <span className="text-emerald-400 ml-1">({tenureDays} days)</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ═══ 2. QUICK INFO CARDS ═══ */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {quickInfoCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.title} variants={staggerItem}>
              <StatCard
                title={card.title}
                value={card.value}
                icon={Icon}
                color={card.color}
                hero
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* ═══ 3. BENTO GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Personal Information ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6 h-full" hover glow="emerald">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold">Personal Information</h3>
              </div>
              {!editingPersonal ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={openPersonalEdit}
                >
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={handlePersonalSave}
                    disabled={savingPersonal}
                  >
                    {savingPersonal ? <Activity className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                    onClick={() => setEditingPersonal(false)}
                  >
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Full Name
                </Label>
                {editingPersonal ? (
                  <Input
                    value={personalForm.name}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-8 text-sm bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                ) : (
                  <p className="text-sm font-medium">{user.name}</p>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <p className="text-sm font-medium text-muted-foreground">{user.email}</p>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                {editingPersonal ? (
                  <Input
                    value={personalForm.phone}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 555-0123"
                    className="h-8 text-sm bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                ) : (
                  <p className="text-sm font-medium">{user.phone || 'Not set'}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Address
                </Label>
                {editingPersonal ? (
                  <Input
                    value={personalForm.address}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, City"
                    className="h-8 text-sm bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">Not set</p>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Heart className="h-3 w-3" /> Emergency Contact
                </Label>
                {editingPersonal ? (
                  <Input
                    value={personalForm.emergencyContact}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                    placeholder="Jane Doe — +1 555-9999"
                    className="h-8 text-sm bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">Not set</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Date of Birth
                </Label>
                {editingPersonal ? (
                  <Input
                    type="date"
                    value={personalForm.dateOfBirth}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                    className="h-8 text-sm bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                  />
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">Not set</p>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Work Information ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-6 h-full" hover glow="cyan">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-cyan-400" />
              <h3 className="font-semibold">Work Information</h3>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Employee ID', value: user.id.slice(0, 8).toUpperCase(), icon: BadgeCheck },
                { label: 'Department', value: userDepartment?.name || 'Unassigned', icon: Building2 },
                { label: 'Position', value: user.position || 'Not set', icon: Briefcase },
                { label: 'Shift', value: user.shiftName || 'Default', icon: Clock },
                { label: 'Manager', value: managerUser?.name || userDepartment?.managerName || 'Not assigned', icon: UserCog },
                { label: 'Work Mode', value: workModeConfig.label, icon: workModeConfig.icon },
                { label: 'Reporting To', value: managerUser?.name || 'Not assigned', icon: ChevronRight },
                { label: 'Join Date', value: user.joinDate ? formatDateLong(user.joinDate) : 'Not set', icon: Calendar },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3 py-2 border-b border-black/[0.06] dark:border-white/[0.05] last:border-0">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium truncate">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* ─── Account & Security ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard className="p-6 h-full" hover glow="amber">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold">Account & Security</h3>
            </div>

            <div className="space-y-4">
              {/* Last Login */}
              <div className="flex items-start gap-3 py-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Last Login</p>
                  {profileDataLoading ? (
                    <div className="h-4 w-24 bg-black/[0.03] dark:bg-white/[0.05] rounded animate-pulse mt-1" />
                  ) : loginHistory.length > 0 ? (
                    <>
                      <p className="text-sm font-medium">{loginHistory[0]?.time || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{loginHistory[0]?.device} — {loginHistory[0]?.ip}</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">No login records</p>
                  )}
                </div>
              </div>

              {/* Change Password */}
              <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-black/[0.1] dark:border-white/[0.1] hover:bg-amber-500/10 hover:border-amber-500/30"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  <Lock className="h-3 w-3" /> Change
                </Button>
              </div>

              {/* Two-Factor Auth */}
              <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Two-Factor Auth</p>
                    <p className="text-xs text-muted-foreground">
                      {twoFactorEnabled ? 'Enabled — TOTP authenticator' : 'Add an extra layer of security'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={(v) => {
                    setTwoFactorEnabled(v);
                    toast.success(v ? '2FA enabled' : '2FA disabled');
                  }}
                />
              </div>

              {/* Active Sessions */}
              <div className="py-2 border-b border-black/[0.06] dark:border-white/[0.05]">
                <div className="flex items-center gap-3 mb-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Active Sessions</p>
                </div>
                <div className="space-y-2 ml-7">
                  {profileDataLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-black/[0.03] dark:bg-white/[0.05] rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : loginHistory.length > 0 ? (
                    loginHistory.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium truncate">{session.device}</p>
                          {session.current && (
                            <Badge className="text-[8px] bg-emerald-500/15 text-emerald-400 border-emerald-500/25 border px-1 py-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{session.ip} · {session.time}</p>
                      </div>
                      {!session.current && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-1.5">
                          <LogOut className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">No active sessions</p>
                  )}
                </div>
              </div>

              {/* Login History */}
              <div className="py-2">
                <div className="flex items-center gap-3 mb-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Recent Login Activity</p>
                </div>
                <div className="ml-7 space-y-1.5">
                  {[
                    { action: 'Successful login', time: '2 hours ago', status: 'success' },
                    { action: 'Password changed', time: '30 days ago', status: 'warning' },
                    { action: 'Successful login', time: '3 days ago', status: 'success' },
                    { action: 'Failed login attempt', time: '5 days ago', status: 'error' },
                  ].map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {entry.status === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        {entry.status === 'warning' && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                        {entry.status === 'error' && <X className="h-3 w-3 text-rose-400" />}
                        <span className="text-muted-foreground">{entry.action}</span>
                      </div>
                      <span className="text-muted-foreground">{entry.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══ 4. DOCUMENTS & ANNOUNCEMENTS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── My Documents ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <GlassCard className="p-6 h-full" hover glow="cyan">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold">My Documents</h3>
              </div>
              <Badge variant="outline" className="text-[10px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                {documents.length} files
              </Badge>
            </div>

            {profileDataLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-black/[0.03] dark:bg-white/[0.05] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : documents.length > 0 ? (
              <ScrollArea className="max-h-72">
                <div className="space-y-2">
                  {documents.map((doc) => {
                    const typeConfig: Record<string, { color: string; icon: typeof FileText }> = {
                      contract: { color: 'text-amber-400', icon: FileText },
                      payslip: { color: 'text-emerald-400', icon: FileText },
                      certificate: { color: 'text-cyan-400', icon: BadgeCheck },
                      tax: { color: 'text-rose-400', icon: FileText },
                    };
                    const config = typeConfig[doc.type] || typeConfig.contract;
                    const TypeIcon = config.icon;

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.05] hover:border-cyan-500/20 transition-colors group"
                      >
                        <div className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]">
                          <TypeIcon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDateLong(doc.date)} · {doc.size}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500/10"
                          onClick={() => handleDownloadDoc(doc)}
                        >
                          <Download className="h-3.5 w-3.5 text-cyan-400" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No documents available</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ─── Recent Announcements ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <GlassCard className="p-6 h-full" hover glow="amber">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold">Recent Announcements</h3>
              </div>
              {announcements.some((a) => !a.isRead) && (
                <Badge className="text-[9px] bg-rose-500/15 text-rose-400 border-rose-500/25 border">
                  {announcements.filter((a) => !a.isRead).length} new
                </Badge>
              )}
            </div>

            {profileDataLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-black/[0.03] dark:bg-white/[0.05] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : announcements.length > 0 ? (
              <ScrollArea className="max-h-72">
                <div className="space-y-2">
                  {announcements.map((announcement) => {
                    const priorityConfig: Record<string, { color: string; dot: string }> = {
                      high: { color: 'text-rose-400', dot: 'bg-rose-400' },
                      medium: { color: 'text-amber-400', dot: 'bg-amber-400' },
                      low: { color: 'text-slate-400', dot: 'bg-slate-400' },
                    };
                    const pConfig = priorityConfig[announcement.priority] || priorityConfig.low;

                    return (
                      <div
                        key={announcement.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                          announcement.isRead
                            ? 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.06] dark:border-white/[0.05]'
                            : 'bg-amber-500/[0.04] border-amber-500/15 hover:border-amber-500/25'
                        )}
                        onClick={() => markAnnouncementRead(announcement.id)}
                      >
                        <div className="mt-1">
                          <span className={cn('h-2 w-2 rounded-full block', pConfig.dot)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'text-sm truncate',
                              announcement.isRead ? 'text-muted-foreground font-normal' : 'font-medium'
                            )}>
                              {announcement.title}
                            </p>
                            {!announcement.isRead && (
                              <span className="shrink-0 text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded px-1 py-0.5">
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>{formatDateLong(announcement.date)}</span>
                            <Badge variant="outline" className={cn('text-[8px] border px-1 py-0', pConfig.color, 'border-current/20')}>
                              {announcement.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] px-1 py-0">
                              {announcement.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No announcements</p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* ═══ 5. EDIT PROFILE DIALOG ═══ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-emerald-400" />
              Edit Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your personal information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Avatar Upload Area */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className={cn(
                    'bg-gradient-to-br text-lg font-bold text-white',
                    getAvatarGradient(user.name)
                  )}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center border-2 border-background cursor-pointer hover:bg-emerald-500 transition-colors">
                  <Upload className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Click the icon to upload a new avatar</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />

            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Full Name <span className="text-rose-400">*</span>
                </Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 555-0123"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Address
              </Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, City, State"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3" /> Emergency Contact
              </Label>
              <Input
                value={editForm.emergencyContact}
                onChange={(e) => setEditForm((f) => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Jane Doe — +1 555-9999"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
              onClick={handleEditSave}
              disabled={editSaving}
            >
              {editSaving ? (
                <Activity className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CHANGE PASSWORD DIALOG ═══ */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="glass-strong border-black/[0.12] dark:border-white/[0.2] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              Change Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your new password below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30 pr-10"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-amber-500/30"
              />
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-400 flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" /> Passwords do not match
              </motion.p>
            )}

            {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-amber-400 flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" /> Password must be at least 6 characters
              </motion.p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              onClick={() => {
                setPasswordDialogOpen(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-500 gap-1.5"
              onClick={handlePasswordChange}
              disabled={passwordSaving}
            >
              {passwordSaving ? (
                <Activity className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
