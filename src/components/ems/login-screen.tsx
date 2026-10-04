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
  Mail,
  Eye,
  EyeOff,
  Download,
  Sun,
  Moon,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Gentle background ambient orbs
function AmbientGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.06) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-10 right-10 w-[350px] h-[350px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />
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
    label: 'Admin',
    colorClasses: 'hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-rose-400/90',
  },
  {
    role: 'manager',
    name: 'Sarah Chen',
    email: 'manager@ems.com',
    password: 'manager123',
    icon: UserCheck,
    label: 'Manager',
    colorClasses: 'hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 text-amber-400/90',
  },
  {
    role: 'employee',
    name: 'James Wilson',
    email: 'james@ems.com',
    password: 'emp123',
    icon: Users,
    label: 'Employee',
    colorClasses: 'hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400 text-cyan-400/90',
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
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const login = useEMSStore((s) => s.login);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Restore saved email from localStorage
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('ems_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#06b6d4', '#10b981'],
      });
    } catch {
      // Ignore confetti fallback
    }
  };

  const handleLogin = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
        toast.error('Please enter both email and password');
        return;
      }

      setLoading(true);
      try {
        const success = await login(trimmedEmail, password);
        if (success) {
          triggerConfetti();
          toast.success('Welcome back!');
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
          toast.error('Invalid email or password');
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
          toast.success(`Signed in as ${demo.label}`);
          router.push('/dashboard');
        } else {
          toast.error('Demo authentication failed. Database may be initializing.');
        }
      } catch {
        toast.error('Connection error during demo sign-in.');
      } finally {
        setLoading(false);
      }
    },
    [login, router]
  );

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

      toast.success('Source code archive downloaded!');
    } catch {
      toast.error('Failed to download project archive.');
    } finally {
      setDownloading(false);
    }
  }, []);

  // Keyboard events: CapsLock detection & Enter submission
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        setCapsLockActive(true);
      } else {
        setCapsLockActive(false);
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
  }, []);

  return (
    <div className="min-h-screen animated-gradient flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <AmbientGlow />

      {/* Top minimal control bar */}
      <div className="absolute top-4 right-4 z-20">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-cyan-500" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
      </div>

      {/* Main Login Card — clean, focused, balanced */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        <GlassCard className="p-7 sm:p-8" glow="emerald">
          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-3">
              <Shield className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              EMS Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in to access your employee workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 pl-10 pr-3.5 glass-tint-light border-border/50 focus:border-emerald-500/60 text-sm transition-all"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="login-password" className="font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pl-10 pr-10 glass-tint-light border-border/50 focus:border-emerald-500/60 text-sm transition-all"
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

              {/* CapsLock Warning */}
              <AnimatePresence>
                {capsLockActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 text-[11px] text-amber-400 pt-0.5"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    <span>Caps Lock is ON</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border/60 text-emerald-500 focus:ring-emerald-500/30 h-3.5 w-3.5 accent-emerald-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Accounts Separator */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-card px-2.5 text-muted-foreground/70">
                or sign in with demo role
              </span>
            </div>
          </div>

          {/* Clean 3-button Demo Switcher */}
          <div className="grid grid-cols-3 gap-2">
            {demoRoles.map((demo) => {
              const Icon = demo.icon;
              return (
                <Button
                  key={demo.role}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin(demo.role)}
                  disabled={loading}
                  className={`h-9 text-xs font-medium border-border/50 bg-background/30 transition-all ${demo.colorClasses}`}
                  title={`Sign in as ${demo.label} (${demo.email})`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  <span>{demo.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Subtle Project Download Link */}
          <div className="mt-6 pt-4 border-t border-border/30 text-center">
            <button
              type="button"
              onClick={handleDownloadProject}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-emerald-400 transition-colors"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                  <span>Preparing zip archive...</span>
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  <span>Download project source code</span>
                </>
              )}
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-sm bg-card/95 backdrop-blur-xl border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <HelpCircle className="h-4 w-4 text-emerald-400" />
              Password Reset
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your corporate email or use the pre-configured demo credentials below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!resetEmail) {
                  toast.error('Please enter your email');
                  return;
                }
                setResetSent(true);
                toast.success(`Reset link sent to ${resetEmail}`);
                setTimeout(() => {
                  setForgotPasswordOpen(false);
                  setResetSent(false);
                  setResetEmail('');
                }, 2000);
              }}
              className="space-y-3"
            >
              <Input
                type="email"
                placeholder="name@company.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="h-9 text-xs"
                required
              />
              <Button
                type="submit"
                disabled={resetSent}
                className="w-full h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                {resetSent ? 'Link Sent!' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="pt-2 border-t border-border/40">
              <div className="text-[11px] font-medium text-foreground mb-2">Demo Credentials:</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border/40 text-[11px]">
                  <span>Admin: <span className="font-mono text-muted-foreground">admin@ems.com / admin123</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@ems.com');
                      setPassword('admin123');
                      setForgotPasswordOpen(false);
                      toast.info('Admin credentials populated');
                    }}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Fill
                  </button>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border/40 text-[11px]">
                  <span>Manager: <span className="font-mono text-muted-foreground">manager@ems.com / manager123</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('manager@ems.com');
                      setPassword('manager123');
                      setForgotPasswordOpen(false);
                      toast.info('Manager credentials populated');
                    }}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Fill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
