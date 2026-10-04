'use client';

import { useState, useEffect } from 'react';
import { useEMSStore } from '@/lib/store';
import { GlassCard } from './glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Globe,
  Shield,
  Bell,
  Building2,
  ToggleLeft,
  Wrench,
  Save,
  Clock,
  CalendarDays,
  DollarSign,
  Languages,
  Lock,
  KeyRound,
  Smartphone,
  Mail,
  Monitor,
  Fingerprint,
  FileWarning,
  Trash2,
  Database,
  Server,
  Activity,
  AlertTriangle,
  Download,
  Upload,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Palette,
  ImageIcon,
  ExternalLink,
  Info,
  Package,
  Settings2,
  Zap,
  Users,
  MapPin,
  Hash,
  Globe2,
  Layout,
  MailCheck,
  Moon,
  Sun,
} from 'lucide-react';

// ─── Extended Form State ────────────────────────────────────────
interface GeneralForm {
  timezone: string;
  currency: string;
  dateFormat: string;
  language: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  lateThreshold: number;
  overtimeThreshold: number;
  workingDays: string[];
  fiscalYearStart: string;
}

interface SecurityForm {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpiryDays: string;
  sessionTimeout: string;
  maxConcurrentSessions: string;
  enable2FA: boolean;
  twoFactorMethod: string;
  maxLoginAttempts: string;
  lockoutDuration: string;
  ipWhitelist: string;
  enableAuditLog: boolean;
  logRetentionDays: string;
}

interface NotificationForm {
  emailLeaveUpdates: boolean;
  emailTaskAssignments: boolean;
  emailComplaintUpdates: boolean;
  emailAttendanceAlerts: boolean;
  emailApprovalRequests: boolean;
  emailPayrollProcessed: boolean;
  emailSystemAlerts: boolean;
  emailGeneralInfo: boolean;
  inAppLeaveUpdates: boolean;
  inAppTaskAssignments: boolean;
  inAppComplaintUpdates: boolean;
  inAppAttendanceAlerts: boolean;
  inAppApprovalRequests: boolean;
  inAppPayrollProcessed: boolean;
  inAppSystemAlerts: boolean;
  inAppGeneralInfo: boolean;
  dailyDigest: boolean;
  digestTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface OrganizationForm {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  companyLogoUrl: string;
  companyWebsite: string;
  taxId: string;
  primaryColor: string;
  accentColor: string;
  showLogoHeader: boolean;
  showLogoSidebar: boolean;
  showLogoEmails: boolean;
}

interface ModulesForm {
  attendance: boolean;
  leaves: boolean;
  tasks: boolean;
  requests: boolean;
  complaints: boolean;
  payroll: boolean;
  analytics: boolean;
  teams: boolean;
  departments: boolean;
}

interface AdvancedForm {
  backupFrequency: string;
}

// ─── Constants ──────────────────────────────────────────────────
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20ac)' },
  { value: 'GBP', label: 'GBP (\u00a3)' },
  { value: 'JPY', label: 'JPY (\u00a5)' },
  { value: 'CNY', label: 'CNY (\u00a5)' },
  { value: 'INR', label: 'INR (\u20b9)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'CHF', label: 'CHF (Fr)' },
  { value: 'SGD', label: 'SGD (S$)' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
];

const WEEKDAYS = [
  { value: 'Mon', label: 'Mon' },
  { value: 'Tue', label: 'Tue' },
  { value: 'Wed', label: 'Wed' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Fri', label: 'Fri' },
  { value: 'Sat', label: 'Sat' },
  { value: 'Sun', label: 'Sun' },
];

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const COLOR_PRESETS = [
  '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#f97316', '#14b8a6', '#84cc16', '#6366f1',
];

const MODULE_LIST = [
  {
    key: 'attendance',
    name: 'Attendance',
    description: 'Track employee clock-in/out, manage shifts, and monitor attendance patterns.',
    icon: Clock,
    color: 'text-cyan-400',
  },
  {
    key: 'leaves',
    name: 'Leave Management',
    description: 'Handle leave requests, balances, policies, and company holidays.',
    icon: CalendarDays,
    color: 'text-emerald-400',
  },
  {
    key: 'tasks',
    name: 'Task Board',
    description: 'Organize tasks with boards, sprints, and team collaboration tools.',
    icon: Layout,
    color: 'text-amber-400',
  },
  {
    key: 'requests',
    name: 'Requests',
    description: 'Process employee requests for documents, equipment, and other needs.',
    icon: Settings2,
    color: 'text-violet-400',
  },
  {
    key: 'complaints',
    name: 'Complaints',
    description: 'Manage and resolve workplace complaints with tracking and escalation.',
    icon: FileWarning,
    color: 'text-rose-400',
  },
  {
    key: 'payroll',
    name: 'Payroll',
    description: 'Process salaries, manage deductions, and generate payslips automatically.',
    icon: DollarSign,
    color: 'text-emerald-400',
  },
  {
    key: 'analytics',
    name: 'Analytics',
    description: 'Visualize workforce data with charts, reports, and insights.',
    icon: Activity,
    color: 'text-cyan-400',
  },
  {
    key: 'teams',
    name: 'Teams',
    description: 'Create and manage teams, assign leads, and track team performance.',
    icon: Users,
    color: 'text-amber-400',
  },
  {
    key: 'departments',
    name: 'Departments',
    description: 'Organize company structure with departments, budgets, and managers.',
    icon: Building2,
    color: 'text-violet-400',
  },
];

// ─── Tab Config ─────────────────────────────────────────────────
const TAB_CONFIG = [
  { value: 'general', label: 'General', icon: Globe, color: 'text-cyan-400' },
  { value: 'security', label: 'Security', icon: Shield, color: 'text-amber-400' },
  { value: 'notifications', label: 'Notifications', icon: Bell, color: 'text-rose-400' },
  { value: 'organization', label: 'Organization', icon: Building2, color: 'text-violet-400' },
  { value: 'modules', label: 'Modules', icon: ToggleLeft, color: 'text-emerald-400' },
  { value: 'advanced', label: 'Advanced', icon: Wrench, color: 'text-slate-400' },
];

// ─── Input Class ────────────────────────────────────────────────
const inputClass = 'bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30';
const selectTriggerClass = 'bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] focus:border-emerald-500/30';

// ─── Animation Variants ────────────────────────────────────────
const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

// ─── Component ──────────────────────────────────────────────────
export function SettingsView() {
  const { user, settings, updateSettings, departments } = useEMSStore();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  // General form
  const [general, setGeneral] = useState<GeneralForm>({
    timezone: settings.timezone || 'UTC',
    currency: settings.currency || 'USD',
    dateFormat: 'YYYY-MM-DD',
    language: 'en',
    workingHoursStart: settings.workingHoursStart || '09:00',
    workingHoursEnd: settings.workingHoursEnd || '17:00',
    lateThreshold: settings.lateThreshold || 15,
    overtimeThreshold: 8,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    fiscalYearStart: '1',
  });

  // Security form
  const [security, setSecurity] = useState<SecurityForm>({
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    passwordExpiryDays: '90',
    sessionTimeout: '30',
    maxConcurrentSessions: '3',
    enable2FA: false,
    twoFactorMethod: 'totp',
    maxLoginAttempts: '5',
    lockoutDuration: '30',
    ipWhitelist: '',
    enableAuditLog: true,
    logRetentionDays: '90',
  });

  // Notification form
  const [notifications, setNotifications] = useState<NotificationForm>({
    emailLeaveUpdates: true,
    emailTaskAssignments: true,
    emailComplaintUpdates: true,
    emailAttendanceAlerts: true,
    emailApprovalRequests: true,
    emailPayrollProcessed: true,
    emailSystemAlerts: true,
    emailGeneralInfo: false,
    inAppLeaveUpdates: true,
    inAppTaskAssignments: true,
    inAppComplaintUpdates: true,
    inAppAttendanceAlerts: true,
    inAppApprovalRequests: true,
    inAppPayrollProcessed: true,
    inAppSystemAlerts: true,
    inAppGeneralInfo: true,
    dailyDigest: false,
    digestTime: '08:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  // Organization form
  const [organization, setOrganization] = useState<OrganizationForm>({
    companyName: 'Acme Corporation',
    addressLine1: '123 Business Avenue',
    addressLine2: 'Suite 100',
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
    zip: '94102',
    companyLogoUrl: '',
    companyWebsite: 'https://acme.example.com',
    taxId: 'US-123456789',
    primaryColor: '#10b981',
    accentColor: '#06b6d4',
    showLogoHeader: true,
    showLogoSidebar: true,
    showLogoEmails: false,
  });

  // Modules form
  const [modules, setModules] = useState<ModulesForm>({
    attendance: settings.modules?.attendance ?? true,
    leaves: settings.modules?.leaves ?? true,
    tasks: settings.modules?.tasks ?? true,
    requests: settings.modules?.requests ?? true,
    complaints: settings.modules?.complaints ?? true,
    payroll: settings.modules?.payroll ?? true,
    analytics: settings.modules?.analytics ?? true,
    teams: true,
    departments: true,
  });

  // Advanced form
  const [advanced, setAdvanced] = useState<AdvancedForm>({
    backupFrequency: 'weekly',
  });

  // Sync form state when store settings change
  useEffect(() => {
    setGeneral(prev => ({
      ...prev,
      timezone: settings.timezone || prev.timezone,
      currency: settings.currency || prev.currency,
      dateFormat: (settings.dateFormat as string) || prev.dateFormat,
      language: (settings.language as string) || prev.language,
      workingHoursStart: settings.workingHoursStart || prev.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd || prev.workingHoursEnd,
      lateThreshold: settings.lateThreshold || prev.lateThreshold,
      overtimeThreshold: (settings.overtimeThreshold as number) || prev.overtimeThreshold,
      workingDays: (settings.workingDays as string[]) || prev.workingDays,
      fiscalYearStart: (settings.fiscalYearStart as string) || prev.fiscalYearStart,
    }));
    setModules(prev => ({
      ...prev,
      attendance: settings.modules?.attendance ?? prev.attendance,
      leaves: settings.modules?.leaves ?? prev.leaves,
      tasks: settings.modules?.tasks ?? prev.tasks,
      requests: settings.modules?.requests ?? prev.requests,
      complaints: settings.modules?.complaints ?? prev.complaints,
      payroll: settings.modules?.payroll ?? prev.payroll,
      analytics: settings.modules?.analytics ?? prev.analytics,
    }));
    // Sync security from store
    const sec = settings.security as Partial<SecurityForm> | undefined;
    if (sec) {
      setSecurity(prev => ({ ...prev, ...sec }));
    }
    // Sync notifications from store
    const notif = settings.notifications as Partial<NotificationForm> | undefined;
    if (notif) {
      setNotifications(prev => ({ ...prev, ...notif }));
    }
    // Sync organization from store
    const org = settings.organization as Partial<OrganizationForm> | undefined;
    if (org) {
      setOrganization(prev => ({ ...prev, ...org }));
    }
    // Sync advanced from store
    const adv = settings.advanced as Partial<AdvancedForm> | undefined;
    if (adv) {
      setAdvanced(prev => ({ ...prev, ...adv }));
    }
  }, [settings]);

  // ─── Save Handler ─────────────────────────────────────────────
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await updateSettings({
        // General
        timezone: general.timezone,
        currency: general.currency,
        dateFormat: general.dateFormat,
        language: general.language,
        workingHoursStart: general.workingHoursStart,
        workingHoursEnd: general.workingHoursEnd,
        lateThreshold: general.lateThreshold,
        overtimeThreshold: general.overtimeThreshold,
        workingDays: general.workingDays,
        fiscalYearStart: general.fiscalYearStart,
        // Security
        security: { ...security },
        // Notifications
        notifications: { ...notifications },
        // Organization
        organization: { ...organization },
        // Modules
        modules: { ...modules },
        // Advanced
        advanced: { ...advanced },
        // Holidays (preserve existing)
        holidays: settings.holidays,
      });
      setLastSaved(new Date());
      toast.success('All settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle working day ───────────────────────────────────────
  const toggleWorkingDay = (day: string) => {
    setGeneral(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  // ─── Toggle module ────────────────────────────────────────────
  const toggleModule = (key: string) => {
    setModules(prev => ({ ...prev, [key]: !prev[key as keyof ModulesForm] }));
  };

  // ─── Render helpers ───────────────────────────────────────────
  const renderSectionHeader = (icon: React.ReactNode, title: string, description: string) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">{icon}</div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  // ─── General Tab ──────────────────────────────────────────────
  const renderGeneralTab = () => (
    <motion.div className="space-y-4" {...fadeInUp} key="general">
      {/* Locale & Format */}
      <GlassCard className="p-6" glow="cyan">
        {renderSectionHeader(
          <Globe className="h-4 w-4 text-cyan-400" />,
          'Locale & Format',
          'Regional settings for your EMS instance'
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <Globe2 className="h-3 w-3 text-muted-foreground" /> Timezone
            </Label>
            <Select value={general.timezone} onValueChange={v => setGeneral({ ...general, timezone: v })}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <DollarSign className="h-3 w-3 text-muted-foreground" /> Currency
            </Label>
            <Select value={general.currency} onValueChange={v => setGeneral({ ...general, currency: v })}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <CalendarDays className="h-3 w-3 text-muted-foreground" /> Date Format
            </Label>
            <Select value={general.dateFormat} onValueChange={v => setGeneral({ ...general, dateFormat: v })}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map(df => (
                  <SelectItem key={df.value} value={df.value}>{df.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <Languages className="h-3 w-3 text-muted-foreground" /> Language
            </Label>
            <Select value={general.language} onValueChange={v => setGeneral({ ...general, language: v })}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Working Hours */}
      <GlassCard className="p-6" glow="cyan">
        {renderSectionHeader(
          <Clock className="h-4 w-4 text-cyan-400" />,
          'Working Hours',
          'Define standard working schedule and thresholds'
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Start Time</Label>
            <Input
              type="time"
              value={general.workingHoursStart}
              onChange={e => setGeneral({ ...general, workingHoursStart: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">End Time</Label>
            <Input
              type="time"
              value={general.workingHoursEnd}
              onChange={e => setGeneral({ ...general, workingHoursEnd: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Late Threshold (min)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={general.lateThreshold}
              onChange={e => setGeneral({ ...general, lateThreshold: parseInt(e.target.value) || 15 })}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Overtime Threshold (hrs)</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={general.overtimeThreshold}
              onChange={e => setGeneral({ ...general, overtimeThreshold: parseInt(e.target.value) || 8 })}
              className={inputClass}
            />
          </div>
        </div>

        <Separator className="bg-black/[0.06] dark:bg-white/[0.1] my-5" />

        {/* Working Days */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Working Days</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWorkingDay(day.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
                  general.workingDays.includes(day.value)
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <Separator className="bg-black/[0.06] dark:bg-white/[0.1] my-5" />

        {/* Fiscal Year */}
        <div className="max-w-xs space-y-2">
          <Label className="text-xs">Fiscal Year Start Month</Label>
          <Select value={general.fiscalYearStart} onValueChange={v => setGeneral({ ...general, fiscalYearStart: v })}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlassCard>
    </motion.div>
  );

  // ─── Security Tab ─────────────────────────────────────────────
  const renderSecurityTab = () => (
    <motion.div className="space-y-4" {...fadeInUp} key="security">
      {/* Password Policy */}
      <GlassCard className="p-6" glow="amber">
        {renderSectionHeader(
          <KeyRound className="h-4 w-4 text-amber-400" />,
          'Password Policy',
          'Configure password requirements for all users'
        )}
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Minimum Password Length</Label>
              <span className="text-sm font-mono text-amber-400">{security.minPasswordLength}</span>
            </div>
            <Slider
              value={[security.minPasswordLength]}
              onValueChange={v => setSecurity({ ...security, minPasswordLength: v[0] })}
              min={6}
              max={24}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>6</span>
              <span>24</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'requireUppercase' as const, label: 'Uppercase (A-Z)', icon: 'A' },
              { key: 'requireLowercase' as const, label: 'Lowercase (a-z)', icon: 'a' },
              { key: 'requireNumbers' as const, label: 'Numbers (0-9)', icon: '1' },
              { key: 'requireSpecialChars' as const, label: 'Special (!@#$)', icon: '#' },
            ].map(item => (
              <div
                key={item.key}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-lg border transition-colors cursor-pointer',
                  security[item.key]
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]'
                )}
                onClick={() => setSecurity({ ...security, [item.key]: !security[item.key] })}
              >
                <Checkbox
                  checked={security[item.key]}
                  onCheckedChange={() => setSecurity({ ...security, [item.key]: !security[item.key] })}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="max-w-xs space-y-2">
            <Label className="text-xs">Password Expiry (days)</Label>
            <Select value={security.passwordExpiryDays} onValueChange={v => setSecurity({ ...security, passwordExpiryDays: v })}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Session Management */}
      <GlassCard className="p-6" glow="amber">
        {renderSectionHeader(
          <Monitor className="h-4 w-4 text-amber-400" />,
          'Session Management',
          'Control user sessions and timeouts'
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Session Timeout</Label>
            <Select value={security.sessionTimeout} onValueChange={v => setSecurity({ ...security, sessionTimeout: v })}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Max Concurrent Sessions</Label>
            <Select value={security.maxConcurrentSessions} onValueChange={v => setSecurity({ ...security, maxConcurrentSessions: v })}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 session</SelectItem>
                <SelectItem value="2">2 sessions</SelectItem>
                <SelectItem value="3">3 sessions</SelectItem>
                <SelectItem value="5">5 sessions</SelectItem>
                <SelectItem value="unlimited">Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Two-Factor Authentication */}
      <GlassCard className="p-6" glow="amber">
        {renderSectionHeader(
          <Smartphone className="h-4 w-4 text-amber-400" />,
          'Two-Factor Authentication',
          'Add an extra layer of security'
        )}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <div>
              <p className="text-sm font-medium">Enable 2FA</p>
              <p className="text-xs text-muted-foreground">Require two-factor authentication for all users</p>
            </div>
            <Switch
              checked={security.enable2FA}
              onCheckedChange={v => setSecurity({ ...security, enable2FA: v })}
            />
          </div>
          {security.enable2FA && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-xs space-y-2"
            >
              <Label className="text-xs">2FA Method</Label>
              <Select value={security.twoFactorMethod} onValueChange={v => setSecurity({ ...security, twoFactorMethod: v })}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totp">TOTP (Authenticator App)</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          )}
        </div>
      </GlassCard>

      {/* Login Security */}
      <GlassCard className="p-6" glow="amber">
        {renderSectionHeader(
          <Lock className="h-4 w-4 text-amber-400" />,
          'Login Security',
          'Brute-force protection and IP restrictions'
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Max Login Attempts</Label>
              <Select value={security.maxLoginAttempts} onValueChange={v => setSecurity({ ...security, maxLoginAttempts: v })}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 attempts</SelectItem>
                  <SelectItem value="5">5 attempts</SelectItem>
                  <SelectItem value="10">10 attempts</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Lockout Duration (minutes)</Label>
              <Select value={security.lockoutDuration} onValueChange={v => setSecurity({ ...security, lockoutDuration: v })}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">IP Whitelist (one per line)</Label>
            <Textarea
              value={security.ipWhitelist}
              onChange={e => setSecurity({ ...security, ipWhitelist: e.target.value })}
              placeholder={'192.168.1.0/24\n10.0.0.1'}
              className={cn(inputClass, 'min-h-20 font-mono text-xs')}
            />
            <p className="text-[10px] text-muted-foreground">Leave empty to allow all IPs. Use CIDR notation for ranges.</p>
          </div>
        </div>
      </GlassCard>

      {/* Audit Logging */}
      <GlassCard className="p-6" glow="amber">
        {renderSectionHeader(
          <Fingerprint className="h-4 w-4 text-amber-400" />,
          'Audit Logging',
          'Track system activity and changes'
        )}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <div>
              <p className="text-sm font-medium">Enable Audit Log</p>
              <p className="text-xs text-muted-foreground">Record all system actions and user activities</p>
            </div>
            <Switch
              checked={security.enableAuditLog}
              onCheckedChange={v => setSecurity({ ...security, enableAuditLog: v })}
            />
          </div>
          {security.enableAuditLog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="max-w-xs space-y-2"
            >
              <Label className="text-xs">Log Retention Period</Label>
              <Select value={security.logRetentionDays} onValueChange={v => setSecurity({ ...security, logRetentionDays: v })}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">365 days</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );

  // ─── Notifications Tab ────────────────────────────────────────
  const notificationItems = [
    { key: 'LeaveUpdates', label: 'Leave Updates', desc: 'Approvals, rejections, and status changes' },
    { key: 'TaskAssignments', label: 'Task Assignments', desc: 'New tasks and due date reminders' },
    { key: 'ComplaintUpdates', label: 'Complaint Updates', desc: 'Status changes on your complaints' },
    { key: 'AttendanceAlerts', label: 'Attendance Alerts', desc: 'Late arrivals and missed punches' },
    { key: 'ApprovalRequests', label: 'Approval Requests', desc: 'Items needing your review' },
    { key: 'PayrollProcessed', label: 'Payroll Processed', desc: 'Salary processing completions' },
    { key: 'SystemAlerts', label: 'System Alerts', desc: 'Critical system notifications' },
    { key: 'GeneralInfo', label: 'General Info', desc: 'System announcements and updates' },
  ];

  const renderNotificationsTab = () => (
    <motion.div className="space-y-4" {...fadeInUp} key="notifications">
      {/* Email Notifications */}
      <GlassCard className="p-6" glow="rose">
        {renderSectionHeader(
          <Mail className="h-4 w-4 text-rose-400" />,
          'Email Notifications',
          'Choose which events trigger email notifications'
        )}
        <div className="space-y-1">
          {notificationItems.map(item => {
            const emailKey = `email${item.key}` as keyof NotificationForm;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notifications[emailKey] as boolean}
                  onCheckedChange={v => setNotifications({ ...notifications, [emailKey]: v })}
                />
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* In-App Notifications */}
      <GlassCard className="p-6" glow="rose">
        {renderSectionHeader(
          <Bell className="h-4 w-4 text-rose-400" />,
          'In-App Notifications',
          'Choose which events show in-app alerts'
        )}
        <div className="space-y-1">
          {notificationItems.map(item => {
            const inAppKey = `inApp${item.key}` as keyof NotificationForm;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notifications[inAppKey] as boolean}
                  onCheckedChange={v => setNotifications({ ...notifications, [inAppKey]: v })}
                />
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Notification Schedule */}
      <GlassCard className="p-6" glow="rose">
        {renderSectionHeader(
          <Clock className="h-4 w-4 text-rose-400" />,
          'Notification Schedule',
          'Configure when and how often you receive notifications'
        )}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <div>
              <p className="text-sm font-medium">Daily Digest</p>
              <p className="text-xs text-muted-foreground">Receive a daily summary instead of individual notifications</p>
            </div>
            <Switch
              checked={notifications.dailyDigest}
              onCheckedChange={v => setNotifications({ ...notifications, dailyDigest: v })}
            />
          </div>

          {notifications.dailyDigest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="max-w-xs space-y-2"
            >
              <Label className="text-xs">Digest Delivery Time</Label>
              <Input
                type="time"
                value={notifications.digestTime}
                onChange={e => setNotifications({ ...notifications, digestTime: e.target.value })}
                className={inputClass}
              />
            </motion.div>
          )}

          <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />

          <div>
            <Label className="text-xs font-medium mb-3 block">Quiet Hours</Label>
            <p className="text-xs text-muted-foreground mb-3">No notifications will be sent during these hours</p>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="space-y-2">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={notifications.quietHoursStart}
                  onChange={e => setNotifications({ ...notifications, quietHoursStart: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  value={notifications.quietHoursEnd}
                  onChange={e => setNotifications({ ...notifications, quietHoursEnd: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Email Template Preview */}
      <GlassCard className="p-6" glow="rose">
        {renderSectionHeader(
          <MailCheck className="h-4 w-4 text-rose-400" />,
          'Email Template Preview',
          'Preview how notification emails will appear'
        )}
        <div className="rounded-lg border border-black/[0.1] dark:border-white/[0.1] overflow-hidden">
          <div className="bg-emerald-600/20 px-4 py-3 border-b border-black/[0.1] dark:border-white/[0.1]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-emerald-500/40 flex items-center justify-center">
                <Building2 className="h-3 w-3 text-emerald-300" />
              </div>
              <span className="text-sm font-semibold">{organization.companyName}</span>
            </div>
          </div>
          <div className="p-4 bg-black/[0.01] dark:bg-white/[0.02] space-y-3">
            <p className="text-xs text-muted-foreground">Subject: Leave Request Approved</p>
            <div className="space-y-2 text-xs">
              <p>Hi John,</p>
              <p>Your leave request from <span className="text-emerald-400 font-medium">Mar 10 - Mar 12</span> has been <span className="text-emerald-400 font-medium">approved</span>.</p>
              <p>Enjoy your time off!</p>
            </div>
            <div className="pt-2 border-t border-black/[0.1] dark:border-white/[0.1]">
              <p className="text-[10px] text-muted-foreground">
                This is an automated message from {organization.companyName} EMS. Please do not reply.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );

  // ─── Organization Tab ─────────────────────────────────────────
  const renderOrganizationTab = () => (
    <motion.div className="space-y-4" {...fadeInUp} key="organization">
      {/* Company Profile */}
      <GlassCard className="p-6" glow="violet">
        {renderSectionHeader(
          <Building2 className="h-4 w-4 text-violet-400" />,
          'Company Profile',
          'Basic company information displayed across the platform'
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3 w-3 text-muted-foreground" /> Company Name
              </Label>
              <Input
                value={organization.companyName}
                onChange={e => setOrganization({ ...organization, companyName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Globe2 className="h-3 w-3 text-muted-foreground" /> Website
              </Label>
              <Input
                value={organization.companyWebsite}
                onChange={e => setOrganization({ ...organization, companyWebsite: e.target.value })}
                placeholder="https://example.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <MapPin className="h-3 w-3 text-muted-foreground" /> Address Line 1
            </Label>
            <Input
              value={organization.addressLine1}
              onChange={e => setOrganization({ ...organization, addressLine1: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Address Line 2</Label>
            <Input
              value={organization.addressLine2}
              onChange={e => setOrganization({ ...organization, addressLine2: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">City</Label>
              <Input
                value={organization.city}
                onChange={e => setOrganization({ ...organization, city: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">State</Label>
              <Input
                value={organization.state}
                onChange={e => setOrganization({ ...organization, state: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Country</Label>
              <Input
                value={organization.country}
                onChange={e => setOrganization({ ...organization, country: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Zip / Postal</Label>
              <Input
                value={organization.zip}
                onChange={e => setOrganization({ ...organization, zip: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <ImageIcon className="h-3 w-3 text-muted-foreground" /> Logo URL
              </Label>
              <Input
                value={organization.companyLogoUrl}
                onChange={e => setOrganization({ ...organization, companyLogoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Hash className="h-3 w-3 text-muted-foreground" /> Tax ID / Registration No.
              </Label>
              <Input
                value={organization.taxId}
                onChange={e => setOrganization({ ...organization, taxId: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Branding */}
      <GlassCard className="p-6" glow="violet">
        {renderSectionHeader(
          <Palette className="h-4 w-4 text-violet-400" />,
          'Branding',
          'Customize the visual identity of your EMS instance'
        )}
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-xs font-medium">Primary Color</Label>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg border border-black/[0.12] dark:border-white/[0.2] shadow-inner"
                  style={{ backgroundColor: organization.primaryColor }}
                />
                <Input
                  value={organization.primaryColor}
                  onChange={e => setOrganization({ ...organization, primaryColor: e.target.value })}
                  className={cn(inputClass, 'font-mono text-xs flex-1')}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setOrganization({ ...organization, primaryColor: color })}
                    className={cn(
                      'h-7 w-7 rounded-md border-2 transition-all',
                      organization.primaryColor === color ? 'border-white scale-110' : 'border-black/[0.12] dark:border-white/[0.2] hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium">Accent Color</Label>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg border border-black/[0.12] dark:border-white/[0.2] shadow-inner"
                  style={{ backgroundColor: organization.accentColor }}
                />
                <Input
                  value={organization.accentColor}
                  onChange={e => setOrganization({ ...organization, accentColor: e.target.value })}
                  className={cn(inputClass, 'font-mono text-xs flex-1')}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setOrganization({ ...organization, accentColor: color })}
                    className={cn(
                      'h-7 w-7 rounded-md border-2 transition-all',
                      organization.accentColor === color ? 'border-white scale-110' : 'border-black/[0.12] dark:border-white/[0.2] hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-black/[0.06] dark:bg-white/[0.1]" />

          <div className="space-y-3">
            <Label className="text-xs font-medium">Logo Display</Label>
            <div className="space-y-2">
              {[
                { key: 'showLogoHeader' as const, label: 'Show in Header', desc: 'Display logo in the top navigation bar' },
                { key: 'showLogoSidebar' as const, label: 'Show in Sidebar', desc: 'Display logo in the sidebar menu' },
                { key: 'showLogoEmails' as const, label: 'Show in Emails', desc: 'Include logo in notification emails' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={organization[item.key]}
                    onCheckedChange={v => setOrganization({ ...organization, [item.key]: v })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Departments Quick View */}
      <GlassCard className="p-6" glow="violet">
        {renderSectionHeader(
          <Building2 className="h-4 w-4 text-violet-400" />,
          'Departments',
          'Quick overview of company departments'
        )}
        {departments.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {departments.map(dept => (
              <div
                key={dept.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-black/[0.01] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: dept.color ? `${dept.color}30` : 'rgba(139,92,246,0.2)',
                      color: dept.color || '#a78bfa',
                    }}
                  >
                    {dept.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{dept.name}</p>
                    {dept.location && (
                      <p className="text-xs text-muted-foreground">{dept.location}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {dept.employeeCount || 0} employees
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                    dept.isActive !== false
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  )}>
                    {dept.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No departments configured yet.</p>
        )}
      </GlassCard>

      {/* Company Holidays Note */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <CalendarDays className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Company Holidays</p>
            <p className="text-xs text-muted-foreground">
              Manage company holidays, observances, and blackout periods in the Leave Management section.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 gap-1.5"
            onClick={() => toast.info('Navigate to Leave Management to manage holidays')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Manage
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );

  // ─── Modules Tab ──────────────────────────────────────────────
  const renderModulesTab = () => (
    <motion.div className="space-y-4" {...fadeInUp} key="modules">
      <GlassCard className="p-6" glow="emerald">
        {renderSectionHeader(
          <Package className="h-4 w-4 text-emerald-400" />,
          'Module Configuration',
          'Enable or disable EMS modules to customize your experience'
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_LIST.map(mod => {
            const Icon = mod.icon;
            const isEnabled = modules[mod.key as keyof ModulesForm];
            return (
              <motion.div
                key={mod.key}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'rounded-xl border p-4 transition-colors',
                  isEnabled
                    ? 'bg-black/[0.02] dark:bg-white/[0.04] border-emerald-500/25'
                    : 'bg-black/[0.01] dark:bg-white/[0.02] border-black/[0.1] dark:border-white/[0.1] opacity-60'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05]', mod.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleModule(mod.key)}
                  />
                </div>
                <h4 className="text-sm font-semibold mb-1">{mod.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{mod.description}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info(`${mod.name} configuration coming soon`)}
                >
                  <Settings2 className="h-3 w-3" />
                  Configure
                </Button>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* Module Dependencies Note */}
      <GlassCard className="p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-0.5">
            <Info className="h-4 w-4 text-amber-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Module Dependencies</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Some modules depend on others to function properly:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>&#8226; <span className="text-amber-400">Analytics</span> requires at least one data source module (Attendance, Leave, or Tasks)</li>
              <li>&#8226; <span className="text-amber-400">Payroll</span> requires Attendance module for accurate hour calculations</li>
              <li>&#8226; <span className="text-amber-400">Teams</span> and <span className="text-amber-400">Departments</span> are core organizational modules and cannot be disabled</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );

  // ─── Advanced Tab ─────────────────────────────────────────────
  const renderAdvancedTab = () => (
    <motion.div className="space-y-4" {...fadeInUp} key="advanced">
      {/* Data Management */}
      <GlassCard className="p-6" glow="cyan">
        {renderSectionHeader(
          <Database className="h-4 w-4 text-cyan-400" />,
          'Data Management',
          'Import, export, and backup your EMS data'
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => toast.success('Data export initiated. You will be notified when ready.')}
            >
              <Download className="h-4 w-4" />
              <span className="text-xs font-medium">Export All Data</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => toast.info('Import wizard opening...')}
            >
              <Upload className="h-4 w-4" />
              <span className="text-xs font-medium">Import Data</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Backup Frequency</Label>
              <Select value={advanced.backupFrequency} onValueChange={v => setAdvanced({ ...advanced, backupFrequency: v })}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Last Backup</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] text-sm text-muted-foreground">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                Mar 4, 2026 at 02:00 AM
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* System Info */}
      <GlassCard className="p-6" glow="cyan">
        {renderSectionHeader(
          <Server className="h-4 w-4 text-cyan-400" />,
          'System Information',
          'Current system status and health'
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <div className="p-2 rounded-md bg-emerald-500/10">
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="text-sm font-semibold">v2.0.0</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <div className="p-2 rounded-md bg-emerald-500/10">
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Database Status</p>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Healthy</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <div className="p-2 rounded-md bg-emerald-500/10">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">API Health</p>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Operational</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1]">
            <div className="p-2 rounded-md bg-cyan-500/10">
              <Clock className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-sm font-semibold">14d 7h 23m</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard className="p-6 border-rose-500/25" glow="rose">
        {renderSectionHeader(
          <AlertTriangle className="h-4 w-4 text-rose-400" />,
          'Danger Zone',
          'Irreversible actions — proceed with caution'
        )}
        <div className="space-y-3">
          {/* Reset All Settings */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-rose-300">Reset All Settings</p>
                  <p className="text-xs text-muted-foreground">Restore all settings to their default values</p>
                </div>
                <Button variant="outline" size="sm" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Reset
                </Button>
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                  Reset All Settings?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will restore all settings to their default values. This action cannot be undone.
                  All custom configurations will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-rose-600 hover:bg-rose-500 text-white"
                  onClick={() => {
                    setGeneral({
                      timezone: 'UTC',
                      currency: 'USD',
                      dateFormat: 'YYYY-MM-DD',
                      language: 'en',
                      workingHoursStart: '09:00',
                      workingHoursEnd: '17:00',
                      lateThreshold: 15,
                      overtimeThreshold: 8,
                      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                      fiscalYearStart: '1',
                    });
                    setSecurity({
                      minPasswordLength: 8,
                      requireUppercase: true,
                      requireLowercase: true,
                      requireNumbers: true,
                      requireSpecialChars: false,
                      passwordExpiryDays: '90',
                      sessionTimeout: '30',
                      maxConcurrentSessions: '3',
                      enable2FA: false,
                      twoFactorMethod: 'totp',
                      maxLoginAttempts: '5',
                      lockoutDuration: '30',
                      ipWhitelist: '',
                      enableAuditLog: true,
                      logRetentionDays: '90',
                    });
                    toast.success('All settings have been reset to defaults');
                  }}
                >
                  Yes, Reset All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Purge Audit Logs */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-rose-300">Purge Audit Logs</p>
                  <p className="text-xs text-muted-foreground">Permanently delete all audit log entries</p>
                </div>
                <Button variant="outline" size="sm" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Purge
                </Button>
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                  Purge All Audit Logs?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all audit log entries. This action cannot be undone
                  and may affect compliance requirements.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-rose-600 hover:bg-rose-500 text-white"
                  onClick={() => toast.success('Audit logs have been purged')}
                >
                  Yes, Purge Logs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Clear Cache */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-colors">
            <div>
              <p className="text-sm font-medium text-rose-300">Clear Cache</p>
              <p className="text-xs text-muted-foreground">Clear application cache and reload data</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
              onClick={() => toast.success('Application cache cleared successfully')}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );

  // ─── Main Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300 bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure and manage your EMS instance
          </p>
          {lastSaved && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </motion.div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl py-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] w-full flex flex-wrap h-auto gap-1 p-1.5">
            {TAB_CONFIG.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 min-w-[100px] data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 gap-1.5 text-xs"
                >
                  <Icon className={cn('h-3.5 w-3.5', activeTab === tab.value ? tab.color : '')} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-4">
          {renderGeneralTab()}
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          {renderSecurityTab()}
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          {renderNotificationsTab()}
        </TabsContent>

        <TabsContent value="organization" className="mt-4">
          {renderOrganizationTab()}
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          {renderModulesTab()}
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          {renderAdvancedTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
