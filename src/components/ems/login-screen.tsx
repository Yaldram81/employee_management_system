'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEMSStore } from '@/lib/store';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  LogIn,
  Shield,
  Users,
  UserCheck,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Download,
  Code2,
  Archive,
  Sparkles,
  Keyboard,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  HelpCircle,
  Copy,
  Check,
  Radio,
  Zap,
  ChevronRight,
  ShieldAlert,
  Server,
  FileText,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Typing animation hook
function useTypingEffect(text: string, speed = 50, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let i = 0;
    const start = () => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
        timeout = setTimeout(start, speed);
      } else {
        setDone(true);
      }
    };
    timeout = setTimeout(start, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

// Floating particles with varied depths
function FloatingParticles() {
  const particleStyles = [
    { left: '8%', top: '12%', size: 3, opacity: 0.2, animDur: '14s', animDelay: '0s', color: 'bg-emerald-400' },
    { left: '88%', top: '16%', size: 4, opacity: 0.15, animDur: '18s', animDelay: '2s', color: 'bg-cyan-400' },
    { left: '42%', top: '24%', size: 2, opacity: 0.25, animDur: '12s', animDelay: '1s', color: 'bg-emerald-400' },
    { left: '72%', top: '38%', size: 3, opacity: 0.2, animDur: '16s', animDelay: '3s', color: 'bg-teal-300' },
    { left: '18%', top: '48%', size: 5, opacity: 0.12, animDur: '20s', animDelay: '0.5s', color: 'bg-cyan-400' },
    { left: '92%', top: '58%', size: 2, opacity: 0.3, animDur: '13s', animDelay: '4s', color: 'bg-emerald-400' },
    { left: '32%', top: '64%', size: 4, opacity: 0.15, animDur: '17s', animDelay: '1.5s', color: 'bg-emerald-300' },
    { left: '64%', top: '74%', size: 3, opacity: 0.2, animDur: '15s', animDelay: '2.5s', color: 'bg-cyan-300' },
    { left: '12%', top: '84%', size: 2, opacity: 0.25, animDur: '11s', animDelay: '3.5s', color: 'bg-emerald-400' },
    { left: '80%', top: '90%', size: 4, opacity: 0.15, animDur: '19s', animDelay: '1s', color: 'bg-cyan-400' },
    { left: '52%', top: '8%', size: 3, opacity: 0.2, animDur: '14s', animDelay: '5s', color: 'bg-emerald-400' },
    { left: '22%', top: '32%', size: 2, opacity: 0.3, animDur: '12s', animDelay: '2s', color: 'bg-teal-400' },
    { left: '68%', top: '52%', size: 5, opacity: 0.1, animDur: '21s', animDelay: '0.8s', color: 'bg-cyan-300' },
    { left: '96%', top: '42%', size: 3, opacity: 0.2, animDur: '16s', animDelay: '3.2s', color: 'bg-emerald-400' },
    { left: '6%', top: '68%', size: 4, opacity: 0.15, animDur: '18s', animDelay: '4.5s', color: 'bg-teal-400' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particleStyles.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${p.color}`}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `ems-float ${p.animDur} ease-in-out ${p.animDelay} infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes ems-float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(8px); }
          50% { transform: translateY(-35px) translateX(-5px); opacity: 0.35; }
          75% { transform: translateY(-15px) translateX(10px); }
        }
      `}</style>
    </div>
  );
}

// Glowing ambient blur orbs
function FloatingOrbs() {
  const orbs = [
    { left: '15%', top: '20%', size: 320, color: 'rgba(16, 185, 129, 0.12)', blur: 90, dur: '25s', delay: '0s' },
    { left: '75%', top: '15%', size: 360, color: 'rgba(6, 182, 212, 0.1)', blur: 100, dur: '30s', delay: '3s' },
    { left: '40%', top: '65%', size: 280, color: 'rgba(16, 185, 129, 0.08)', blur: 80, dur: '22s', delay: '6s' },
    { left: '85%', top: '70%', size: 240, color: 'rgba(147, 51, 234, 0.07)', blur: 70, dur: '28s', delay: '2s' },
    { left: '5%', top: '75%', size: 220, color: 'rgba(6, 182, 212, 0.08)', blur: 75, dur: '26s', delay: '5s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: `blur(${orb.blur}px)`,
            animation: `float-gentle ${orb.dur} ease-in-out ${orb.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

const demoRoles = [
  {
    role: 'admin',
    name: 'Alex Morgan',
    email: 'admin@ems.com',
    password: 'admin123',
    icon: Shield,
    label: 'Admin Workstation',
    tag: 'Full Access',
    color: 'rose',
    accentBorder: 'border-rose-500/30 hover:border-rose-500/60',
    accentBg: 'bg-rose-500/10 hover:bg-rose-500/15',
    accentText: 'text-rose-400',
    description: 'Master control: user provisioning, payroll engine, rules & security settings',
    features: ['User Management & Access Control', 'Payroll & Salary Rule Automation', 'Audit Logging & System Config'],
    shortcut: 'Alt + 1',
  },
  {
    role: 'manager',
    name: 'Sarah Chen',
    email: 'manager@ems.com',
    password: 'manager123',
    icon: UserCheck,
    label: 'Manager Portal',
    tag: 'Team Oversight',
    color: 'amber',
    accentBorder: 'border-amber-500/30 hover:border-amber-500/60',
    accentBg: 'bg-amber-500/10 hover:bg-amber-500/15',
    accentText: 'text-amber-400',
    description: 'Team operations: shift approvals, leave requests, performance metrics',
    features: ['Leave & Shift Approval Queue', 'Live Team Attendance Monitor', 'Department Task Assignments'],
    shortcut: 'Alt + 2',
  },
  {
    role: 'employee',
    name: 'James Wilson',
    email: 'james@ems.com',
    password: 'emp123',
    icon: Users,
    label: 'Employee Workspace',
    tag: 'Self-Service',
    color: 'cyan',
    accentBorder: 'border-cyan-500/30 hover:border-cyan-500/60',
    accentBg: 'bg-cyan-500/10 hover:bg-cyan-500/15',
    accentText: 'text-cyan-400',
    description: 'Personal hub: 1-click punch in/out, leave balance, payslips & tasks',
    features: ['Geofence-Verified Clock In/Out', 'Leave Request & Quota Dashboard', 'Personal Task Board & Payslips'],
    shortcut: 'Alt + 3',
  },
];

const capabilities = [
  {
    icon: Shield,
    title: 'Zero-Trust RBAC Isolation',
    desc: 'Cryptographic session tokens and strictly decoupled role permissions ensure total tenant safety.',
    badge: 'Enterprise Security',
  },
  {
    icon: Clock,
    title: 'Precision Attendance & Geofencing',
    desc: 'Simulated biometric & GPS boundary tracking with automatic overtime, late penalties, and shifts.',
    badge: 'Real-time Telemetry',
  },
  {
    icon: Briefcase,
    title: 'End-to-End Payroll Engine',
    desc: 'Automated salary components, deduction computation, payslip PDF rendering and direct compliance.',
    badge: 'Automated Finance',
  },
];

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'roles'>('direct');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const login = useEMSStore((s) => s.login);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Live real-time clock for enterprise operations header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Remember email via localStorage
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('ems_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {
      // localStorage may fail in restricted sandboxes
    }
  }, []);

  const { displayed: typedSubtitle } = useTypingEffect('Workforce Operations & Governance Platform', 40, 500);

  // Fire celebratory confetti on successful login
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#f59e0b', '#ec4899'],
      });
    } catch {
      // Confetti fallback
    }
  };

  const handleLogin = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        toast.error('Please enter both your corporate email and password');
        return;
      }

      setLoading(true);
      try {
        const success = await login(trimmedEmail, password);
        if (success) {
          triggerConfetti();
          toast.success('Authentication verified! Launching workspace...');
          try {
            if (rememberMe) {
              localStorage.setItem('ems_saved_email', trimmedEmail);
            } else {
              localStorage.removeItem('ems_saved_email');
            }
          } catch {
            // Ignore storage errors
          }
          router.push('/dashboard');
        } else {
          toast.error('Invalid credentials. Check your email/password or use demo roles.');
        }
      } catch {
        toast.error('Authentication service unreachable. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [email, password, rememberMe, login, router]
  );

  const handleDemoLogin = useCallback(
    async (role: string) => {
      const demo = demoRoles.find((d) => d.role === role);
      if (!demo) return;
      setEmail(demo.email);
      setPassword(demo.password);
      setLoading(true);
      try {
        const success = await login(demo.email, demo.password);
        if (success) {
          triggerConfetti();
          toast.success(`Welcome, ${demo.name}! Starting ${demo.label} session.`);
          router.push('/dashboard');
        } else {
          toast.error('Demo authentication failed. Database may be initializing.');
        }
      } catch {
        toast.error('Connection error while logging into demo session.');
      } finally {
        setLoading(false);
      }
    },
    [login, router]
  );

  const handleAutofill = useCallback((role: string) => {
    const demo = demoRoles.find((d) => d.role === role);
    if (!demo) return;
    setEmail(demo.email);
    setPassword(demo.password);
    setActiveTab('direct');
    toast.info(`Populated credentials for ${demo.name} (${demo.label}). Click Sign In to enter.`);
  }, []);

  const handleCopyCredentials = useCallback((demo: (typeof demoRoles)[0]) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(`${demo.email} / ${demo.password}`);
      setCopiedRole(demo.role);
      toast.success(`Copied ${demo.name}'s credentials to clipboard!`);
      setTimeout(() => setCopiedRole(null), 2000);
    }
  }, []);

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your corporate email address');
      return;
    }
    setResetSent(true);
    toast.success(`Password reset dispatch signal sent to ${resetEmail}`);
    setTimeout(() => {
      setForgotPasswordOpen(false);
      setResetSent(false);
      setResetEmail('');
    }, 2500);
  };

  const handleDownloadProject = useCallback(async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/download-project');
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'ems-project-source.zip';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Complete project repository downloaded successfully!');
    } catch {
      toast.error('Failed to package project. Please try again later.');
    } finally {
      setDownloading(false);
    }
  }, []);

  // Keyboard shortcuts handler: Enter to submit, Alt+1/2/3 for quick demo roles, Alt+T for theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check Caps Lock
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        setCapsLockActive(true);
      } else {
        setCapsLockActive(false);
      }

      // Alt + 1/2/3 for instant demo logins
      if ((e.altKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        handleDemoLogin('admin');
      } else if ((e.altKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        handleDemoLogin('manager');
      } else if ((e.altKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault();
        handleDemoLogin('employee');
      } else if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.getModifierState) {
        setCapsLockActive(e.getModifierState('CapsLock'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleDemoLogin, setTheme, theme]);

  const isValidEmail = (str: string) => /\S+@\S+\.\S+/.test(str);

  return (
    <div className="min-h-screen animated-gradient flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Mesh Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 15% 15%, rgba(16, 185, 129, 0.12) 0%, transparent 45%), radial-gradient(ellipse at 85% 20%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 85%, rgba(245, 158, 11, 0.06) 0%, transparent 45%), radial-gradient(ellipse at 85% 85%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
          }}
        />
      </div>

      <FloatingOrbs />
      <FloatingParticles />

      {/* Subtle Grid Accent Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />

      {/* Top Floating Control Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 sm:py-3 px-2 z-30 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-sm text-foreground">EMS Enterprise</span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v2.4
            </span>
          </div>
        </div>

        {/* Right tools: Clock, Online Status, Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {currentTime && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-tint-light border border-border/40 text-[11px] text-muted-foreground font-mono">
              <Clock className="h-3 w-3 text-emerald-400" />
              <span>{currentTime}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-tint-light border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden xs:inline">Systems Operational</span>
          </div>

          {mounted && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 rounded-full border-border/40 glass-tint-light hover:border-emerald-500/40 text-muted-foreground hover:text-foreground transition-all"
              title="Toggle theme (Alt+T)"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-cyan-500" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Dual-Pane / Responsive Presentation Card */}
      <main className="w-full max-w-6xl relative z-10 my-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ─── Left Hero Showcase (Visible on lg+, condensed on mobile) ─── */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <GlassCard className="p-5 sm:p-6 lg:p-7 h-full flex flex-col justify-between relative overflow-hidden" glow="cyan">
              {/* Decorative background glow */}
              <div
                className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              <div className="space-y-4 sm:space-y-5">
                {/* Branding Badge & Title */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Next-Generation Enterprise Suite</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-extrabold tracking-tight text-foreground leading-snug">
                    Transforming modern{' '}
                    <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
                      workforce operations.
                    </span>
                  </h1>

                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                    {typedSubtitle}
                    <span className="inline-block w-[2px] h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle" />
                  </p>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-card/40 border border-border/50 text-center">
                    <div className="text-base sm:text-lg font-bold text-foreground">1,250+</div>
                    <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Staff Online</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card/40 border border-border/50 text-center">
                    <div className="text-base sm:text-lg font-bold text-emerald-400">99.98%</div>
                    <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Sync Uptime</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card/40 border border-border/50 text-center">
                    <div className="text-base sm:text-lg font-bold text-cyan-400">SOC-2</div>
                    <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Type II Ready</div>
                  </div>
                </div>

                {/* Feature Highlights Accordion-like cards */}
                <div className="space-y-2 pt-0.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Core Platform Capabilities
                  </div>
                  <div className="space-y-2">
                    {capabilities.map((cap, i) => {
                      const Icon = cap.icon;
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card/30 hover:bg-card/60 border border-border/40 transition-all duration-200"
                        >
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-foreground">{cap.title}</span>
                              <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                                {cap.badge}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{cap.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Testimonial / Compliance Assurance */}
              <div className="pt-3.5 mt-3.5 border-t border-border/40">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>256-Bit Hardware Encrypted Sessions</span>
                  </div>
                  <span className="opacity-50">ISO 27001 · GDPR</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ─── Right Authentication Terminal ─── */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <GlassCard className="p-5 sm:p-6 lg:p-7" glow="emerald">
              
              {/* Header inside form */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-emerald-400" />
                    Access Gateway
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Authenticate to access your designated role portal
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 border border-border/40">
                    <Radio className="h-2.5 w-2.5 text-emerald-400 animate-pulse" />
                    Live Server
                  </span>
                </div>
              </div>

              {/* Segmented Mode Switcher */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'direct' | 'roles')}
                className="w-full mb-5"
              >
                <TabsList className="grid grid-cols-2 w-full h-10 p-1 bg-muted/70 border border-border/40">
                  <TabsTrigger
                    value="direct"
                    className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    Direct Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="roles"
                    className="text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-1.5"
                  >
                    <Zap className="h-3 w-3 text-amber-400" />
                    Demo Role Launch
                  </TabsTrigger>
                </TabsList>

                {/* ─── Tab 1: Direct Form Credentials ─── */}
                <TabsContent value="direct" className="space-y-4 pt-2">
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="ems-email-input" className="font-medium text-foreground/90">
                          Corporate Email
                        </label>
                        {email && isValidEmail(email) && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                            <Check className="h-3 w-3" /> Valid format
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="ems-email-input"
                          type="email"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 px-3.5 pr-9 glass-tint-light border-border/60 focus:border-emerald-500/60 text-sm transition-all"
                          autoComplete="email"
                          required
                        />
                        {email && (
                          <button
                            type="button"
                            onClick={() => setEmail('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1"
                            title="Clear email"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="ems-password-input" className="font-medium text-foreground/90">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setForgotPasswordOpen(true)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="ems-password-input"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 px-3.5 pr-10 glass-tint-light border-border/60 focus:border-emerald-500/60 text-sm transition-all"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-1 transition-colors"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Caps Lock Warning Notification */}
                      <AnimatePresence>
                        {capsLockActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>Caps Lock is ON — passwords are case sensitive</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Remember me and shortcut label */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-border/60 text-emerald-500 focus:ring-emerald-500/30 h-3.5 w-3.5 accent-emerald-500 cursor-pointer"
                        />
                        <span>Remember email on this machine</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">
                        Enter ↵ to sign in
                      </span>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium text-sm shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all duration-300 btn-press active:scale-[0.98] mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          <span>Sign In to Workspace</span>
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* ─── Tab 2: 1-Click Role Workstation Launchers ─── */}
                <TabsContent value="roles" className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground leading-normal mb-1">
                    Select a pre-configured workstation role to instantly test permissions and features:
                  </p>

                  <div className="space-y-2.5">
                    {demoRoles.map((demo) => {
                      const Icon = demo.icon;
                      const isCopied = copiedRole === demo.role;

                      return (
                        <div
                          key={demo.role}
                          className={`p-3 rounded-xl border ${demo.accentBorder} ${demo.accentBg} transition-all duration-200 group relative`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg bg-background/50 border border-border/40 ${demo.accentText}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-foreground">{demo.name}</span>
                                  <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${demo.accentText} bg-background/60`}>
                                    {demo.tag}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">{demo.email}</div>
                              </div>
                            </div>

                            <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground/60 px-1.5 py-0.5 rounded bg-background/40">
                              {demo.shortcut}
                            </span>
                          </div>

                          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2.5">
                            {demo.description}
                          </p>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDemoLogin(demo.role)}
                              disabled={loading}
                              className={`flex-1 h-8 text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-all`}
                            >
                              <Zap className="h-3 w-3 mr-1 text-emerald-400" />
                              Instant Launch
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAutofill(demo.role)}
                              className="h-8 px-2.5 text-xs border-border/50 hover:bg-background/60 text-muted-foreground hover:text-foreground"
                              title="Fill credentials into form"
                            >
                              Fill Form
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyCredentials(demo)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Copy email & password"
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Bottom Quick Switcher Pills (when on Direct tab) */}
              {activeTab === 'direct' && (
                <div className="pt-4 border-t border-border/40 mt-4">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Lock className="h-3 w-3 text-muted-foreground/70" /> Quick Demo Autologin:
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('roles')}
                      className="text-emerald-400 hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      Compare Roles <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {demoRoles.map((demo) => {
                      const Icon = demo.icon;
                      return (
                        <button
                          key={demo.role}
                          type="button"
                          onClick={() => handleDemoLogin(demo.role)}
                          disabled={loading}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${demo.accentBorder} ${demo.accentBg} ${demo.accentText} hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="truncate">{demo.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Download Project Source Code Button */}
              <div className="mt-5 pt-4 border-t border-border/30">
                <Button
                  variant="outline"
                  onClick={handleDownloadProject}
                  disabled={downloading}
                  className="w-full h-auto py-2.5 border-dashed border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 text-foreground transition-all duration-300 btn-press group"
                >
                  {downloading ? (
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span>Packaging Source Archive...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full text-xs">
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <div className="font-semibold text-foreground">Download Complete Source Code</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Next.js 16 · Prisma · TypeScript · Tailwind
                          </div>
                        </div>
                      </div>
                      <Download className="h-3.5 w-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                    </div>
                  )}
                </Button>
              </div>

              {/* Security Audit & Isolation Tag */}
              <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground/60 text-center">
                <Eye className="h-3 w-3 text-emerald-400/80" />
                <span>Multi-tenant architecture · Each role accesses strictly isolated record views</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Footer information */}
      <footer className="w-full max-w-6xl mt-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/60 z-20">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} EMS Enterprise Operations</span>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Server className="h-3 w-3 text-emerald-400" /> High Availability Cluster
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Keyboard className="h-3 w-3" /> Shortcuts: Alt+1 (Admin) &middot; Alt+2 (Manager) &middot; Alt+3 (Staff)
          </span>
        </div>
      </footer>

      {/* Forgot Password / Credential Assistance Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <HelpCircle className="h-5 w-5 text-emerald-400" />
              Corporate Credential Recovery
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              For security compliance, enter your company-issued email address or use built-in sandbox keys.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Registered Corporate Email</label>
                <Input
                  type="email"
                  placeholder="e.g. yourname@ems.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={resetSent}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                {resetSent ? 'Dispatching Recovery Instructions...' : 'Send Password Reset Link'}
              </Button>
            </form>

            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or Sandbox Pre-configured Passwords</span>
              </div>
            </div>

            {/* Quick Helper Credentials */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">Admin Account</div>
                  <div className="text-[11px] text-muted-foreground font-mono">admin@ems.com / admin123</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEmail('admin@ems.com');
                    setPassword('admin123');
                    setForgotPasswordOpen(false);
                    toast.success('Admin credentials placed in login form!');
                  }}
                  className="h-7 text-[11px]"
                >
                  Use This
                </Button>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground">Manager Account</div>
                  <div className="text-[11px] text-muted-foreground font-mono">manager@ems.com / manager123</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEmail('manager@ems.com');
                    setPassword('manager123');
                    setForgotPasswordOpen(false);
                    toast.success('Manager credentials placed in login form!');
                  }}
                  className="h-7 text-[11px]"
                >
                  Use This
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
