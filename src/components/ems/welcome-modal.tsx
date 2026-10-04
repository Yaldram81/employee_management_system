'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEMSStore } from '@/lib/store';
import {
  Shield,
  ShieldCheck,
  Users,
  Sparkles,
  Clock,
  CalendarDays,
  ListTodo,
  Bell,
  ArrowRight,
  CheckCircle2,
  Rocket,
} from 'lucide-react';

const roleConfig: Record<string, { icon: React.ElementType; label: string; color: string; description: string }> = {
  admin: {
    icon: Shield,
    label: 'Administrator',
    color: 'text-rose-400',
    description: 'You have full access to all modules including user management, system rules, and organization settings.',
  },
  manager: {
    icon: ShieldCheck,
    label: 'Manager',
    color: 'text-amber-400',
    description: 'You can manage your team, approve requests, review attendance, and access analytics dashboards.',
  },
  employee: {
    icon: Users,
    label: 'Employee',
    color: 'text-cyan-400',
    description: 'You can clock in/out, apply for leaves, manage your tasks, and submit requests or complaints.',
  },
};

const quickTips = [
  {
    icon: Clock,
    title: 'Clock In/Out',
    description: 'Use the attendance module to track your work hours with face or PIN authentication.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: CalendarDays,
    title: 'Leave Management',
    description: 'Apply for leaves and check your leave balance from the Leave Management section.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: ListTodo,
    title: 'Task Board',
    description: 'View and manage your assigned tasks, track progress, and collaborate with your team.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Stay updated with real-time notifications for approvals, tasks, and system alerts.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
];

const WELCOME_SEEN_KEY = 'ems-welcome-seen';

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const user = useEMSStore((s) => s.user);
  const role = user?.role || 'employee';
  const config = roleConfig[role] || roleConfig.employee;
  const RoleIcon = config.icon;

  useEffect(() => {
    // Check if this is the first login for this user
    const seenKey = `${WELCOME_SEEN_KEY}-${user?.id}`;
    const hasSeen = localStorage.getItem(seenKey);
    if (!hasSeen && user?.id) {
      // Small delay so the dashboard has time to load
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const handleDismiss = () => {
    const seenKey = `${WELCOME_SEEN_KEY}-${user?.id}`;
    localStorage.setItem(seenKey, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (currentTip < quickTips.length - 1) {
      setCurrentTip((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.06) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(6,182,212,0.04) 0%, transparent 50%)',
          }} />
        </div>

        <div className="relative">
          <DialogHeader>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="mx-auto mb-3 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20"
            >
              <Rocket className="h-8 w-8 text-emerald-400" />
            </motion.div>

            <DialogTitle className="text-center text-xl">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Welcome to EMS!
              </motion.span>
            </DialogTitle>

            <DialogDescription className="text-center text-sm" asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <span>Hello, <span className="font-medium text-foreground">{user?.name?.split(' ')[0] || 'there'}</span>!</span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <RoleIcon className={`h-3.5 w-3.5 ${config.color}`} />
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
                <span className="block text-muted-foreground/80 text-xs leading-relaxed mt-2 px-2">{config.description}</span>
              </motion.div>
            </DialogDescription>
          </DialogHeader>

          {/* Quick Start Tips */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 space-y-2"
          >
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              Quick Start Tips
            </p>

            <AnimatePresence mode="wait">
              {quickTips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: i <= currentTip ? 1 : 0.3, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                    i === currentTip ? 'bg-white/5 border border-white/10' : ''
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg ${tip.bg} shrink-0`}>
                    <tip.icon className={`h-4 w-4 ${tip.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{tip.title}</p>
                      {i < currentTip && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{tip.description}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {quickTips.map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentTip ? 'w-6 bg-emerald-400' : i < currentTip ? 'w-1.5 bg-emerald-400/50' : 'w-1.5 bg-white/10'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip tour
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs"
            >
              {currentTip < quickTips.length - 1 ? (
                <>
                  Next tip
                  <ArrowRight className="h-3 w-3" />
                </>
              ) : (
                <>
                  Get Started
                  <Rocket className="h-3 w-3" />
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
