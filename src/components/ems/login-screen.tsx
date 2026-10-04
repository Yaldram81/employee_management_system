'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from './glass-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEMSStore } from '@/lib/store';
import { toast } from 'sonner';
import { LogIn, Shield, Users, UserCheck, Loader2, Lock, Eye, Download, Code2, Archive, Sparkles, Keyboard } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

// Typing animation hook
function useTypingEffect(text: string, speed = 50, startDelay = 800) {
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

// Floating particle component — pure CSS animations, no hydration mismatch
function FloatingParticles() {
  const particleStyles = [
    { left: '12%', top: '8%', size: 3, opacity: 0.2, animDur: '14s', animDelay: '0s' },
    { left: '85%', top: '15%', size: 4, opacity: 0.15, animDur: '18s', animDelay: '2s' },
    { left: '45%', top: '22%', size: 2, opacity: 0.25, animDur: '12s', animDelay: '1s' },
    { left: '70%', top: '35%', size: 3, opacity: 0.2, animDur: '16s', animDelay: '3s' },
    { left: '20%', top: '45%', size: 5, opacity: 0.1, animDur: '20s', animDelay: '0.5s' },
    { left: '90%', top: '55%', size: 2, opacity: 0.3, animDur: '13s', animDelay: '4s' },
    { left: '35%', top: '60%', size: 4, opacity: 0.15, animDur: '17s', animDelay: '1.5s' },
    { left: '60%', top: '70%', size: 3, opacity: 0.2, animDur: '15s', animDelay: '2.5s' },
    { left: '10%', top: '80%', size: 2, opacity: 0.25, animDur: '11s', animDelay: '3.5s' },
    { left: '78%', top: '88%', size: 4, opacity: 0.15, animDur: '19s', animDelay: '1s' },
    { left: '50%', top: '5%', size: 3, opacity: 0.2, animDur: '14s', animDelay: '5s' },
    { left: '25%', top: '30%', size: 2, opacity: 0.3, animDur: '12s', animDelay: '2s' },
    { left: '65%', top: '50%', size: 5, opacity: 0.1, animDur: '21s', animDelay: '0.8s' },
    { left: '95%', top: '40%', size: 3, opacity: 0.2, animDur: '16s', animDelay: '3.2s' },
    { left: '5%', top: '65%', size: 4, opacity: 0.15, animDur: '18s', animDelay: '4.5s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particleStyles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-emerald-400"
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

// Floating orbs — large blurred colored circles behind the card
function FloatingOrbs() {
  const orbs = [
    { left: '20%', top: '25%', size: 280, color: 'rgba(16, 185, 129, 0.08)', blur: 80, dur: '25s', delay: '0s' },
    { left: '70%', top: '20%', size: 320, color: 'rgba(6, 182, 212, 0.07)', blur: 90, dur: '30s', delay: '3s' },
    { left: '40%', top: '65%', size: 240, color: 'rgba(245, 158, 11, 0.05)', blur: 70, dur: '22s', delay: '6s' },
    { left: '80%', top: '70%', size: 200, color: 'rgba(16, 185, 129, 0.06)', blur: 60, dur: '28s', delay: '2s' },
    { left: '10%', top: '75%', size: 180, color: 'rgba(6, 182, 212, 0.05)', blur: 65, dur: '26s', delay: '5s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
    email: 'admin@ems.com',
    password: 'admin123',
    icon: Shield,
    label: 'Admin',
    color: 'rose',
    description: 'Full access to all modules',
    features: ['User Management', 'Rules Engine', 'System Settings'],
  },
  {
    role: 'manager',
    email: 'manager@ems.com',
    password: 'manager123',
    icon: UserCheck,
    label: 'Manager',
    color: 'amber',
    features: ['Team Overview', 'Approve/Reject', 'Analytics'],
    description: 'Manage team & approvals',
  },
  {
    role: 'employee',
    email: 'james@ems.com',
    password: 'emp123',
    icon: Users,
    label: 'Employee',
    color: 'cyan',
    description: 'Personal workspace only',
    features: ['Clock In/Out', 'Apply Leave', 'My Tasks'],
  },
];

const colorClasses: Record<string, { hover: string; text: string; border: string; bg: string; dot: string; gradientBorder: string }> = {
  rose: { hover: 'hover:bg-rose-500/10', text: 'hover:text-rose-400', border: 'hover:border-rose-500/30', bg: 'bg-rose-500/10', dot: 'bg-rose-400', gradientBorder: 'hover:shadow-[0_0_12px_rgba(244,63,94,0.15),inset_0_0_12px_rgba(244,63,94,0.05)]' },
  amber: { hover: 'hover:bg-amber-500/10', text: 'hover:text-amber-400', border: 'hover:border-amber-500/30', bg: 'bg-amber-500/10', dot: 'bg-amber-400', gradientBorder: 'hover:shadow-[0_0_12px_rgba(245,158,11,0.15),inset_0_0_12px_rgba(245,158,11,0.05)]' },
  cyan: { hover: 'hover:bg-cyan-500/10', text: 'hover:text-cyan-400', border: 'hover:border-cyan-500/30', bg: 'bg-cyan-500/10', dot: 'bg-cyan-400', gradientBorder: 'hover:shadow-[0_0_12px_rgba(6,182,212,0.15),inset_0_0_12px_rgba(6,182,212,0.05)]' },
};

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const login = useEMSStore((s) => s.login);

  // Show keyboard hint after a delay
  useEffect(() => {
    const timer = setTimeout(() => setShowKeyboardHint(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const { displayed: typedSubtitle, done: typingDone } = useTypingEffect('Employee Management System', 45, 1000);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Welcome back!');
      } else {
        toast.error('Invalid credentials');
      }
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

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

      toast.success('Source code downloaded successfully!');
    } catch {
      toast.error('Failed to download project. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, []);

  const handleDemoLogin = useCallback(async (role: string) => {
    const demo = demoRoles.find(d => d.role === role);
    if (!demo) return;
    setEmail(demo.email);
    setPassword(demo.password);
    setLoading(true);
    try {
      const success = await login(demo.email, demo.password);
      if (success) {
        toast.success(`Entering ${demo.label} session`);
      } else {
        toast.error('Demo login failed - backend may not be ready');
      }
    } catch {
      toast.error('Connection error - backend may not be ready');
    } finally {
      setLoading(false);
    }
  }, [login]);

  // Handle Enter key to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && email && password && !loading) {
        handleLogin(new Event('submit') as any);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [email, password, loading, handleLogin]);

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient Mesh Background — overlapping radial gradients */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 60% 80%, rgba(245, 158, 11, 0.04) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 70%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 90% 60%, rgba(6, 182, 212, 0.04) 0%, transparent 50%)' }} />
      </div>

      <FloatingOrbs />
      <FloatingParticles />

      {/* Animated gradient wave overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(6,182,212,0.08) 25%, rgba(16,185,129,0.03) 50%, rgba(6,182,212,0.06) 75%, rgba(16,185,129,0.05) 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradient-wave 12s ease infinite',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="p-6 sm:p-10" glow="emerald">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 mb-5 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Shield className="h-10 w-10 text-emerald-400" />
            </div>
            {/* Shimmer effect on title */}
            <div className="relative inline-block">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                EMS
              </h1>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent bg-clip-text"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: 1 }}
                style={{ backgroundSize: '200% 100%' }}
              />
            </div>
            {/* Typing animation subtitle */}
            <p className="text-sm text-muted-foreground mt-2 tracking-wide h-5">
              {typedSubtitle}
              <span
                className="inline-block w-[2px] h-4 bg-emerald-400 ml-0.5 align-middle"
                style={{
                  animation: typingDone ? 'blink-cursor 1s step-end infinite' : 'none',
                  opacity: typingDone ? 1 : 0,
                }}
              />
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">Sign in to access your workspace</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className={`relative rounded-lg transition-all duration-300 ${focusedField === 'email' ? 'shadow-[0_0_16px_rgba(16,185,129,0.15)]' : ''}`}>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="h-12 glass-tint-light border-glass-medium focus:border-emerald-500/50 text-base transition-all duration-300"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className={`relative rounded-lg transition-all duration-300 ${focusedField === 'password' ? 'shadow-[0_0_16px_rgba(16,185,129,0.15)]' : ''}`}>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="h-12 glass-tint-light border-glass-medium focus:border-emerald-500/50 text-base transition-all duration-300"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="relative">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium text-base shadow-[0_0_20px_rgba(16,185,129,0.2)] btn-press active:scale-[0.97] transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                {/* Keyboard shortcut hint */}
                <AnimatePresence>
                  {showKeyboardHint && email && password && !loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-muted-foreground/50"
                    >
                      <Keyboard className="h-2.5 w-2.5" />
                      Press Enter to sign in
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-glass-medium" />
              </div>
              <div className="relative flex justify-center text-xs uppercase gap-1.5 items-center">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="bg-transparent px-3 text-muted-foreground">Isolated Role Sessions</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              {demoRoles.map((demo) => {
                const cls = colorClasses[demo.color];
                const Icon = demo.icon;
                return (
                  <HoverCard key={demo.role} openDelay={300} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDemoLogin(demo.role)}
                        className={`border-glass-medium ${cls.hover} ${cls.text} ${cls.border} ${cls.gradientBorder} h-auto py-3 flex flex-col items-center gap-1 btn-press active:scale-[0.96] transition-all duration-300`}
                        disabled={loading}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{demo.label}</span>
                        <span className="text-[9px] opacity-60 leading-tight">{demo.description}</span>
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-popover/95 backdrop-blur-md border-border/50 text-xs w-52 p-3" side="bottom">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Icon className={`h-3.5 w-3.5 ${cls.dot === 'bg-rose-400' ? 'text-rose-400' : cls.dot === 'bg-amber-400' ? 'text-amber-400' : 'text-cyan-400'}`} />
                          {demo.label} Demo Credentials
                        </div>
                        <div className="space-y-0.5 text-muted-foreground">
                          <p><span className="text-muted-foreground/60">Email:</span> {demo.email}</p>
                          <p><span className="text-muted-foreground/60">Pass:</span> {demo.password}</p>
                        </div>
                        <div className="pt-1 border-t border-border/30">
                          <p className="text-[10px] text-muted-foreground/50">Features: {demo.features.join(', ')}</p>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-muted-foreground/50">
              <Eye className="h-3 w-3" />
              Each role sees only its authorized data — sessions are fully isolated
            </div>
          </motion.div>

          {/* Download Project Button — prominent with gradient border animation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="mt-6"
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-glass-subtle" />
              </div>
            </div>
            <div className="relative group/download mt-4 rounded-lg">
              {/* Animated gradient border */}
              <div
                className="absolute -inset-[1px] rounded-lg opacity-0 group-hover/download:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(90deg, rgba(16,185,129,0.4), rgba(6,182,212,0.4), rgba(245,158,11,0.3), rgba(16,185,129,0.4))',
                  backgroundSize: '200% 100%',
                  animation: 'gradient-border-flow 3s ease infinite',
                }}
              />
              <Button
                variant="ghost"
                onClick={handleDownloadProject}
                disabled={downloading}
                className="relative w-full h-auto py-3 border border-dashed border-emerald-500/20 hover:border-transparent bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 transition-all duration-300 btn-press active:scale-[0.97] rounded-lg"
              >
                {downloading ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs font-medium">Packaging Source Code...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-2">
                      <Archive className="h-5 w-5 group-hover/download:scale-110 transition-transform" />
                      <Download className="h-4 w-4 group-hover/download:translate-y-0.5 transition-transform" />
                    </div>
                    <span className="text-xs font-medium">Download Project Source Code</span>
                    <span className="text-[9px] opacity-50 flex items-center gap-1">
                      <Code2 className="h-2.5 w-2.5" />
                      Next.js 16 · TypeScript · Prisma · Tailwind
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </motion.div>
        </GlassCard>
      </motion.div>

      {/* "Powered by AI" Badge — more prominent */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-4 right-4 z-20"
      >
        <div className="relative group/ai">
          {/* Animated glow behind badge */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 blur-sm opacity-60 group-hover/ai:opacity-100 transition-opacity duration-500"
            style={{ animation: 'badge-glow 3s ease-in-out infinite' }}
          />
          <div className="relative flex items-center gap-2 px-4 py-2 rounded-full glass-tint-strong border border-emerald-500/20 backdrop-blur-md text-xs font-medium">
            <Sparkles
              className="h-4 w-4 text-emerald-400"
              style={{ animation: 'sparkle 2s ease-in-out infinite' }}
            />
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">Powered by AI</span>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes blink-cursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes gradient-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gradient-wave {
          0% { background-position: 0% 50%; }
          25% { background-position: 100% 0%; }
          50% { background-position: 100% 100%; }
          75% { background-position: 0% 100%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes badge-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
