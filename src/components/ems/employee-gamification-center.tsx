'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEMSStore } from '@/lib/store';
import { useApiQuery, useApiMutation } from '@/lib/hooks/use-api-query';
import { toast } from 'sonner';
import { GlassCard } from './glass-card';
import { fadeIn, stagger, timeAgo, getInitials, AnimatedProgressRing } from './shared';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy, Star, Flame, Target, Calendar, Zap, Crown, Shield, Heart,
  Clock, Award, TrendingUp, Users, Lock, Pin, PinOff, Send,
  ArrowUp, ArrowDown, Minus, Medal, Sparkles, Gift, CheckCircle2,
  MessageSquare, ThumbsUp, Lightbulb, UserCheck, Rocket,
  ChevronRight, Timer, PartyPopper, X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ─── Data Types ─────────────────────────────────────────────────
interface BadgeData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  xpReward: number;
  isSecret: boolean;
}

interface UserBadgeData {
  id: string;
  badgeId: string;
  earnedAt: string;
  isPinned: boolean;
  badge: BadgeData;
}

interface KudosData {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  category: string;
  xpAmount: number;
  createdAt: string;
  fromUser?: { name: string; avatarUrl?: string };
  toUser?: { name: string; avatarUrl?: string };
}

interface StreakData {
  id: string;
  type: string;
  currentStreak: number;
  longestStreak: number;
  lastDate: string;
  milestones: number[];
}

interface ChallengeData {
  id: string;
  title: string;
  description: string;
  type: string;
  metric: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  status: string;
  reward?: string;
  members?: { userId: string; progress: number; rank?: number }[];
  userProgress?: number;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalXP: number;
  level: number;
  avatar?: string;
}

interface LevelInfo {
  number: number;
  title: string;
  totalXP: number;
  nextLevelXP: number;
  progress: number;
}

type TabKey = 'overview' | 'badges' | 'leaderboard' | 'challenges' | 'kudos';

// ─── Config Maps ────────────────────────────────────────────────
const TIER_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  BRONZE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
  SILVER: { bg: 'bg-gray-400/10', text: 'text-gray-300', border: 'border-gray-400/30', glow: 'shadow-gray-400/20' },
  GOLD: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/20' },
  PLATINUM: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
  DIAMOND: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
};

const BADGE_CATEGORY_ICONS: Record<string, React.ElementType> = {
  ATTENDANCE: Clock,
  TASKS: Target,
  ENGAGEMENT: Heart,
  MILESTONE: Trophy,
  SPECIAL: Sparkles,
};

const KUDOS_CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string; xp: number }> = {
  THANKS: { icon: ThumbsUp, color: 'emerald', label: 'Thanks', xp: 5 },
  TEAMWORK: { icon: Users, color: 'cyan', label: 'Teamwork', xp: 10 },
  INNOVATION: { icon: Lightbulb, color: 'amber', label: 'Innovation', xp: 15 },
  LEADERSHIP: { icon: UserCheck, color: 'purple', label: 'Leadership', xp: 15 },
  GO_ABOVE_AND_BEYOND: { icon: Rocket, color: 'rose', label: 'Above & Beyond', xp: 20 },
};

const KUDOS_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

const LEVEL_TITLES: Record<number, string> = {
  1: 'Newcomer',
  2: 'Rising Star',
  3: 'Rising Star',
  4: 'Achiever',
  5: 'Achiever',
  6: 'Champion',
  7: 'Champion',
  8: 'Legend',
  9: 'Legend',
  10: 'Icon',
};

function getLevelTitle(level: number): string {
  if (level >= 10) return 'Icon';
  return LEVEL_TITLES[level] || 'Newcomer';
}

const BADGE_ICON_MAP: Record<string, React.ElementType> = {
  Zap, Star, Target, Flame, Clock, Heart, Crown, Shield, Trophy, Sparkles, Award, Gift,
};

const ALL_CATEGORIES = ['ALL', 'ATTENDANCE', 'TASKS', 'ENGAGEMENT', 'MILESTONE', 'SPECIAL'] as const;

// ─── Animated Counter Hook ──────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// AnimatedProgressRing imported from ./shared

// ─── Badge Icon Resolver ────────────────────────────────────────
function BadgeIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = BADGE_ICON_MAP[iconName] || Award;
  return <Icon className={className} />;
}

// ─── Loading Skeleton ───────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {['overview', 'badges', 'leaderboard', 'challenges', 'kudos'].map((tab) => (
          <Skeleton key={tab} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function EmployeeGamificationCenter() {
  const { user, users } = useEMSStore();
  const userId = user?.id || '';

  // ── State ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // ── React Query data fetching ─────────────────────────────────
  const { data: gamificationData, isLoading: loading, error: queryError, refetch: fetchData } = useApiQuery<{
    badges: BadgeData[]; userBadges: UserBadgeData[]; kudosReceived: KudosData[]; kudosSent: KudosData[];
    streaks: StreakData[]; challenges: ChallengeData[]; leaderboard: LeaderboardEntry[]; level: LevelInfo;
  }>({ endpoint: `/gamification?userId=${userId}`, enabled: !!userId });

  const error = queryError?.message || null;

  // Derive data from query response
  const allBadges = gamificationData?.badges || [];
  const userBadges = gamificationData?.userBadges || [];
  const kudosReceived = gamificationData?.kudosReceived || [];
  const kudosSent = gamificationData?.kudosSent || [];
  const streaks = gamificationData?.streaks || [];
  const challenges = gamificationData?.challenges || [];
  const leaderboard = gamificationData?.leaderboard || [];
  const levelInfo = gamificationData?.level || { number: 1, title: 'Newcomer', totalXP: 0, nextLevelXP: 100, progress: 0 };

  // Badge tab
  const [badgeFilter, setBadgeFilter] = useState<string>('ALL');
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);

  // Leaderboard tab
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'month' | 'all'>('month');

  // Kudos tab
  const [kudosTo, setKudosTo] = useState('');
  const [kudosCategory, setKudosCategory] = useState('THANKS');
  const [kudosMessage, setKudosMessage] = useState('');
  const [sendingKudos, setSendingKudos] = useState(false);

  // ── Derived data ──────────────────────────────────────────────
  const earnedBadgeIds = useMemo(() => new Set(userBadges.map(ub => ub.badgeId)), [userBadges]);
  const pinnedCount = useMemo(() => userBadges.filter(ub => ub.isPinned).length, [userBadges]);

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'ALL') return allBadges;
    return allBadges.filter(b => b.category === badgeFilter);
  }, [allBadges, badgeFilter]);

  const streakMap = useMemo(() => {
    const map: Record<string, StreakData> = {};
    for (const s of streaks) map[s.type] = s;
    return map;
  }, [streaks]);

  const activeChallenges = useMemo(() => challenges.filter(c => c.status === 'ACTIVE'), [challenges]);
  const upcomingChallenges = useMemo(() => challenges.filter(c => c.status === 'UPCOMING'), [challenges]);
  const completedChallenges = useMemo(() => challenges.filter(c => c.status === 'COMPLETED'), [challenges]);

  const animatedXP = useAnimatedCounter(levelInfo.totalXP);

  // Department colleagues for kudos dropdown
  const colleagues = useMemo(() => {
    return users.filter(u => u.id !== userId && u.isActive !== false);
  }, [users, userId]);

  // Kudos stats
  const kudosStats = useMemo(() => {
    const totalSent = kudosSent.length;
    const totalReceived = kudosReceived.length;
    const categoryCount: Record<string, number> = {};
    for (const k of kudosReceived) {
      categoryCount[k.category] = (categoryCount[k.category] || 0) + 1;
    }
    const mostCommon = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
    return { totalSent, totalReceived, mostCommonCategory: mostCommon ? mostCommon[0] : null };
  }, [kudosSent, kudosReceived]);

  // Current user's rank
  const myRank = useMemo(() => {
    const idx = leaderboard.findIndex(e => e.userId === userId);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, userId]);

  // ── Recent activity feed ──────────────────────────────────────
  const recentActivity = useMemo(() => {
    const items: Array<{ id: string; type: string; text: string; subtext: string; time: string; icon: React.ElementType; color: string }> = [];

    userBadges.slice(0, 3).forEach(ub => {
      items.push({
        id: `badge-${ub.id}`, type: 'badge',
        text: `Earned: ${ub.badge.name}`, subtext: `+${ub.badge.xpReward} XP`,
        time: ub.earnedAt, icon: Award, color: 'text-amber-400',
      });
    });

    kudosReceived.slice(0, 3).forEach(k => {
      items.push({
        id: `kudos-${k.id}`, type: 'kudos',
        text: `Kudos from ${k.fromUser?.name || 'Someone'}`, subtext: `+${k.xpAmount} XP`,
        time: k.createdAt, icon: Heart, color: 'text-rose-400',
      });
    });

    streaks.filter(s => s.currentStreak >= 5).forEach(s => {
      items.push({
        id: `streak-${s.id}`, type: 'streak',
        text: `${s.currentStreak}-day ${s.type.replace('_', ' ').toLowerCase()} streak!`, subtext: `Longest: ${s.longestStreak}`,
        time: s.lastDate, icon: Flame, color: 'text-orange-400',
      });
    });

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return items.slice(0, 5);
  }, [userBadges, kudosReceived, streaks]);

  // ── Actions ───────────────────────────────────────────────────
  const pinBadgeMutation = useApiMutation({ endpoint: '/api/gamification', method: 'POST', invalidateKeys: [`/gamification?userId=${userId}`] });

  const handlePinBadge = useCallback(async (userBadgeId: string, isPinned: boolean) => {
    if (!isPinned && pinnedCount >= 3) {
      toast.error('You can only pin up to 3 badges. Unpin one first.');
      return;
    }
    try {
      await pinBadgeMutation.mutateAsync({ action: 'pin-badge', userBadgeId, isPinned: !isPinned });
      toast.success(isPinned ? 'Badge unpinned' : 'Badge pinned!');
    } catch {
      toast.error('Failed to update badge pin');
    }
  }, [pinnedCount, pinBadgeMutation]);

  const sendKudosMutation = useApiMutation({ endpoint: '/api/gamification', method: 'POST', invalidateKeys: [`/gamification?userId=${userId}`] });

  const handleSendKudos = useCallback(async () => {
    if (!kudosTo || !kudosMessage.trim()) {
      toast.error('Please select a colleague and write a message');
      return;
    }
    setSendingKudos(true);
    try {
      await sendKudosMutation.mutateAsync({
        action: 'send-kudos',
        toUserId: kudosTo,
        message: kudosMessage.trim(),
        category: kudosCategory,
      });
      toast.success('Kudos sent! 🎉');
      setKudosTo('');
      setKudosMessage('');
      setKudosCategory('THANKS');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send kudos');
    } finally {
      setSendingKudos(false);
    }
  }, [kudosTo, kudosMessage, kudosCategory, sendKudosMutation]);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e'],
    });
  }, []);

  const openBadgeDetail = useCallback((badge: BadgeData) => {
    setSelectedBadge(badge);
    setBadgeDialogOpen(true);
    if (earnedBadgeIds.has(badge.id)) {
      fireConfetti();
    }
  }, [earnedBadgeIds, fireConfetti]);

  // ── XP Preview for kudos ──────────────────────────────────────
  const xpPreview = KUDOS_CATEGORY_CONFIG[kudosCategory]?.xp || 5;

  // ── Time remaining for challenges ─────────────────────────────
  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // ─── RENDER ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <X className="h-12 w-12 text-rose-400" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* ═══ Header ═══ */}
      <motion.div {...fadeIn} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            Gamification Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track your progress, earn badges, and climb the leaderboard</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />Refresh
        </Button>
      </motion.div>

      {/* ═══ Tab Navigation ═══ */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] h-auto p-1 overflow-x-auto flex-nowrap">
          {[
            { key: 'overview' as TabKey, label: 'Overview', icon: TrendingUp },
            { key: 'badges' as TabKey, label: 'Badges', icon: Award },
            { key: 'leaderboard' as TabKey, label: 'Leaderboard', icon: Trophy },
            { key: 'challenges' as TabKey, label: 'Challenges', icon: Target },
            { key: 'kudos' as TabKey, label: 'Kudos', icon: Heart },
          ].map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ═══ Tab Content ═══ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'badges' && <BadgesTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
          {activeTab === 'challenges' && <ChallengesTab />}
          {activeTab === 'kudos' && <KudosTab />}
        </motion.div>
      </AnimatePresence>

      {/* ═══ Badge Detail Dialog ═══ */}
      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-black/[0.1] dark:border-white/[0.1] max-w-md">
          {selectedBadge && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BadgeIcon iconName={selectedBadge.icon} className="h-5 w-5" />
                  {selectedBadge.isSecret && !earnedBadgeIds.has(selectedBadge.id) ? '???' : selectedBadge.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedBadge.isSecret && !earnedBadgeIds.has(selectedBadge.id)
                    ? 'This badge is secret. Keep earning XP to discover it!'
                    : selectedBadge.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-center py-4">
                  <div className={`relative p-6 rounded-2xl ${TIER_COLORS[selectedBadge.tier]?.bg || 'bg-black/[0.03] dark:bg-white/[0.05]'} border ${TIER_COLORS[selectedBadge.tier]?.border || 'border-black/[0.1] dark:border-white/[0.1]'} ${earnedBadgeIds.has(selectedBadge.id) ? 'shadow-lg ' + (TIER_COLORS[selectedBadge.tier]?.glow || '') : 'opacity-40 grayscale'}`}>
                    <BadgeIcon iconName={selectedBadge.icon} className={`h-16 w-16 ${TIER_COLORS[selectedBadge.tier]?.text || 'text-muted-foreground'}`} />
                    {earnedBadgeIds.has(selectedBadge.id) && (
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] p-3 text-center">
                    <p className="text-xs text-muted-foreground">Tier</p>
                    <p className={`font-semibold ${TIER_COLORS[selectedBadge.tier]?.text || ''}`}>{selectedBadge.tier}</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] p-3 text-center">
                    <p className="text-xs text-muted-foreground">XP Reward</p>
                    <p className="font-semibold text-amber-400">+{selectedBadge.xpReward}</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] p-3 text-center">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-semibold">{selectedBadge.category}</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.05] p-3 text-center">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className={`font-semibold ${earnedBadgeIds.has(selectedBadge.id) ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                      {earnedBadgeIds.has(selectedBadge.id) ? 'Earned ✓' : 'Locked'}
                    </p>
                  </div>
                </div>
                {earnedBadgeIds.has(selectedBadge.id) && (() => {
                  const ub = userBadges.find(u => u.badgeId === selectedBadge.id);
                  return ub ? (
                    <div className="flex items-center justify-between rounded-lg bg-black/[0.03] dark:bg-white/[0.05] p-3">
                      <span className="text-xs text-muted-foreground">Earned {timeAgo(ub.earnedAt)}</span>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handlePinBadge(ub.id, ub.isPinned)}
                        className={`gap-1 ${ub.isPinned ? 'text-amber-400' : 'text-muted-foreground'}`}
                      >
                        {ub.isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                        {ub.isPinned ? 'Pinned' : 'Pin'}
                      </Button>
                    </div>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW TAB
  // ═══════════════════════════════════════════════════════════════
  function OverviewTab() {
    return (
      <div className="space-y-6">
        {/* ── Level & XP Hero Card ── */}
        <GlassCard glow="emerald" className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Circular Progress */}
            <div className="relative flex-shrink-0">
              <AnimatedProgressRing value={levelInfo.progress} size={140} strokeWidth={12} color="#10b981" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-3xl font-bold text-emerald-400"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {levelInfo.number}
                </motion.span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</span>
              </div>
            </div>

            {/* Level Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h2 className="text-xl font-bold">{levelInfo.title}</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="text-emerald-400 font-semibold">{animatedXP}</span> Total XP
                </p>
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto md:mx-0">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to Level {levelInfo.number + 1}</span>
                  <span>{levelInfo.progress}%</span>
                </div>
                <Progress value={levelInfo.progress} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {levelInfo.nextLevelXP - levelInfo.totalXP} XP needed for next level
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 min-w-0 flex-shrink-0">
              {[
                { label: 'Badges', value: userBadges.length, icon: Award, color: 'text-amber-400' },
                { label: 'Kudos', value: kudosReceived.length, icon: Heart, color: 'text-rose-400' },
                { label: 'Challenges', value: activeChallenges.length, icon: Target, color: 'text-cyan-400' },
                { label: 'Rank', value: myRank ? `#${myRank}` : '--', icon: Trophy, color: 'text-purple-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-3 text-center min-w-[80px]">
                  <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* ── Streak Counters Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { type: 'ON_TIME', label: 'On-Time Streak', icon: Flame, color: 'orange' as const, emoji: '🔥' },
            { type: 'TASK_COMPLETION', label: 'Task Streak', icon: Target, color: 'cyan' as const, emoji: '🎯' },
            { type: 'DAILY_LOGIN', label: 'Login Streak', icon: Calendar, color: 'emerald' as const, emoji: '📅' },
          ].map(({ type, label, icon: Icon, color, emoji }) => {
            const streak = streakMap[type];
            const current = streak?.currentStreak || 0;
            const longest = streak?.longestStreak || 0;
            const milestones = streak?.milestones || [];

            const colorClasses = {
              orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'emerald' as const },
              cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'cyan' as const },
              emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'emerald' as const },
            }[color];

            return (
              <GlassCard key={type} glow={colorClasses.glow} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${colorClasses.bg} ${colorClasses.border} border`}>
                    <Icon className={`h-5 w-5 ${colorClasses.text}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    {current > 0 && <span className="text-xs">{emoji}</span>}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{current}</span>
                  <span className="text-xs text-muted-foreground">/ {longest} longest</span>
                </div>
                {milestones.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {milestones.map((m) => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] text-muted-foreground">
                        {m}★
                      </span>
                    ))}
                  </div>
                )}
                {current === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Start your streak today!</p>
                )}
              </GlassCard>
            );
          })}
        </div>

        {/* ── Quick Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Badges Earned', value: userBadges.length, icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Kudos Received', value: kudosReceived.length, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            { label: 'Active Challenges', value: activeChallenges.length, icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Current Rank', value: myRank ? `#${myRank}` : 'N/A', icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <motion.div key={label} {...fadeIn} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Recent Activity Feed ── */}
        {recentActivity.length > 0 && (
          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <motion.div key={item.id} {...fadeIn} className="flex items-center gap-3 py-2 border-b border-black/[0.06] dark:border-white/[0.05] last:border-0">
                  <div className={`p-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05] ${item.color}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.subtext}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(item.time)}</span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // BADGES TAB
  // ═══════════════════════════════════════════════════════════════
  function BadgesTab() {
    return (
      <div className="space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={badgeFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBadgeFilter(cat)}
              className={badgeFilter === cat ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : ''}
            >
              {cat === 'ALL' ? 'All' : cat}
              {cat !== 'ALL' && BADGE_CATEGORY_ICONS[cat] && (
                <BadgeIcon iconName={BADGE_CATEGORY_ICONS[cat].displayName || cat} className="h-3 w-3 ml-1" />
              )}
            </Button>
          ))}
        </div>

        {/* Badge Grid */}
        <motion.div {...stagger.container} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredBadges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const isSecret = badge.isSecret && !isEarned;
            const userBadge = userBadges.find(ub => ub.badgeId === badge.id);
            const tierStyle = TIER_COLORS[badge.tier] || TIER_COLORS.BRONZE;

            return (
              <motion.div key={badge.id} {...stagger.item}>
                <GlassCard
                  hover
                  onClick={() => openBadgeDetail(badge)}
                  className={`p-4 text-center cursor-pointer relative group ${
                    isEarned ? `${tierStyle.bg} ${tierStyle.border}` : 'opacity-60'
                  }`}
                >
                  {/* Pin indicator */}
                  {userBadge?.isPinned && (
                    <div className="absolute top-2 right-2">
                      <Pin className="h-3 w-3 text-amber-400" />
                    </div>
                  )}

                  {/* Badge Icon */}
                  <div className={`mx-auto mb-3 relative p-4 rounded-xl inline-flex ${
                    isEarned ? `${tierStyle.bg} shadow-lg ${tierStyle.glow}` : 'bg-black/[0.03] dark:bg-white/[0.05]'
                  } ${!isEarned ? 'grayscale' : ''}`}>
                    {isSecret ? (
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <BadgeIcon iconName={badge.icon} className={`h-8 w-8 ${isEarned ? tierStyle.text : 'text-muted-foreground/50'}`} />
                    )}

                    {/* Earned check */}
                    {isEarned && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* Lock overlay for unearned */}
                    {!isEarned && !isSecret && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Badge Info */}
                  <p className="text-sm font-medium truncate">
                    {isSecret ? '???' : badge.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {isSecret ? 'Secret Badge' : badge.description}
                  </p>

                  {/* Tier & XP */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${tierStyle.text} ${tierStyle.border}`}>
                      {badge.tier}
                    </Badge>
                    <span className="text-[10px] text-amber-400">+{badge.xpReward} XP</span>
                  </div>

                  {/* Earned date */}
                  {isEarned && userBadge && (
                    <p className="text-[9px] text-muted-foreground mt-1.5">
                      Earned {timeAgo(userBadge.earnedAt)}
                    </p>
                  )}

                  {/* Glow effect on hover for earned badges */}
                  {isEarned && (
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                      background: `radial-gradient(ellipse at center, ${tierStyle.glow.replace('shadow-', '').replace('/20', '/10')}, transparent 70%)`,
                    }} />
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredBadges.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No badges found in this category</p>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LEADERBOARD TAB
  // ═══════════════════════════════════════════════════════════════
  function LeaderboardTab() {
    return (
      <div className="space-y-6">
        {/* Time Period Filter */}
        <div className="flex gap-2">
          {[
            { key: 'week' as const, label: 'This Week' },
            { key: 'month' as const, label: 'This Month' },
            { key: 'all' as const, label: 'All Time' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={leaderboardPeriod === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLeaderboardPeriod(key)}
              className={leaderboardPeriod === key ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Leaderboard */}
        <GlassCard className="p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Department Leaderboard
          </h3>
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.userId === userId;
              const rankChange = 0; // Placeholder for animated rank changes

              return (
                <motion.div
                  key={entry.userId}
                  {...fadeIn}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isMe ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-black/[0.01] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {rank === 1 ? <span className="text-xl">🥇</span> :
                     rank === 2 ? <span className="text-xl">🥈</span> :
                     rank === 3 ? <span className="text-xl">🥉</span> :
                     <span className="text-sm font-bold text-muted-foreground">{rank}</span>}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={entry.avatar} />
                    <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs">
                      {getInitials(entry.userName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & Level */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.userName}
                      {isMe && <span className="text-emerald-400 ml-1">(You)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Lvl {entry.level} • {getLevelTitle(entry.level)}</p>
                  </div>

                  {/* Rank Change Indicator */}
                  <div className="flex-shrink-0">
                    {rankChange > 0 ? <ArrowUp className="h-3 w-3 text-emerald-400" /> :
                     rankChange < 0 ? <ArrowDown className="h-3 w-3 text-rose-400" /> :
                     <Minus className="h-3 w-3 text-muted-foreground/30" />}
                  </div>

                  {/* XP */}
                  <div className="text-right flex-shrink-0 min-w-[80px]">
                    <p className="text-sm font-bold text-amber-400">{entry.totalXP}</p>
                    <p className="text-[9px] text-muted-foreground">XP</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No leaderboard data available</p>
            </div>
          )}
        </GlassCard>

        {/* Your Ranking Card */}
        {myRank && (
          <GlassCard glow="emerald" className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Medal className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Your Ranking</p>
                <p className="text-2xl font-bold text-emerald-400">#{myRank}</p>
              </div>
              {myRank > 1 && leaderboard[myRank - 2] && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Next rank</p>
                  <p className="text-sm font-medium">{leaderboard[myRank - 2].userName}</p>
                  <p className="text-xs text-amber-400">{leaderboard[myRank - 2].totalXP - levelInfo.totalXP} XP ahead</p>
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // CHALLENGES TAB
  // ═══════════════════════════════════════════════════════════════
  function ChallengesTab() {
    return (
      <div className="space-y-6">
        {/* ── Special Highlighted Challenge ── */}
        <GlassCard glow="amber" className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <PartyPopper className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Most On-Time Team This Month</h3>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">Featured</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                The team with the highest on-time attendance rate this month wins bonus XP for all members!
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>500 XP per member</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  <span>Ends this month</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ── Active Challenges ── */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-400" />
            Active Challenges
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
          {activeChallenges.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active challenges right now</p>
            </div>
          )}
        </div>

        {/* ── Upcoming Challenges ── */}
        {upcomingChallenges.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Upcoming Challenges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingChallenges.map((challenge) => (
                <GlassCard key={challenge.id} className="p-4 opacity-70">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                      {challenge.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Starts {challenge.startDate}</span>
                  </div>
                  <p className="text-sm font-medium">{challenge.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ── Completed Challenges ── */}
        {completedChallenges.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Completed Challenges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedChallenges.map((challenge) => (
                <GlassCard key={challenge.id} className="p-4 opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium">{challenge.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{challenge.description}</p>
                  {challenge.reward && (
                    <p className="text-xs text-amber-400 mt-1">Reward: {challenge.reward}</p>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function ChallengeCard({ challenge }: { challenge: ChallengeData }) {
    const progress = challenge.userProgress ?? 0;
    const progressPct = Math.min(100, (progress / challenge.targetValue) * 100);
    const memberCount = challenge.members?.length || 0;

    return (
      <GlassCard glow="cyan" className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Target className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                {challenge.type}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                <Timer className="h-3 w-3 inline mr-0.5" />
                {getTimeRemaining(challenge.endDate)}
              </span>
            </div>
            <p className="text-sm font-medium">{challenge.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>

            {/* Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{Math.round(progressPct)}% complete</span>
                <span>{progress}/{challenge.targetValue}</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />{memberCount} participants
                </span>
                {challenge.reward && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Gift className="h-3 w-3" />{challenge.reward}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // KUDOS TAB
  // ═══════════════════════════════════════════════════════════════
  function KudosTab() {
    return (
      <div className="space-y-6">
        {/* ── Send Kudos Form ── */}
        <GlassCard glow="rose" className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-rose-400" />
            Send Kudos
          </h3>
          <div className="space-y-4">
            {/* Colleague Selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Select Colleague</label>
              <Select value={kudosTo} onValueChange={setKudosTo}>
                <SelectTrigger className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1]">
                  <SelectValue placeholder="Choose a colleague..." />
                </SelectTrigger>
                <SelectContent>
                  {colleagues.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-emerald-500/20 text-emerald-400">
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(KUDOS_CATEGORY_CONFIG).map(([key, config]) => {
                  const colorStyle = KUDOS_COLOR_MAP[config.color];
                  const isSelected = kudosCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setKudosCategory(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? `${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`
                          : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] text-muted-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      <config.icon className="h-3.5 w-3.5" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Message</label>
              <Textarea
                value={kudosMessage}
                onChange={(e) => setKudosMessage(e.target.value)}
                placeholder="Write something appreciative..."
                className="bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.1] dark:border-white/[0.1] min-h-[80px] resize-none"
                maxLength={280}
              />
              <p className="text-[10px] text-muted-foreground mt-1">{kudosMessage.length}/280</p>
            </div>

            {/* XP Preview & Send */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">
                  Recipient will earn <span className="text-amber-400 font-semibold">+{xpPreview} XP</span>
                </span>
              </div>
              <Button
                onClick={handleSendKudos}
                disabled={sendingKudos || !kudosTo || !kudosMessage.trim()}
                className="gap-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white"
              >
                {sendingKudos ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.15] dark:border-white/[0.3] border-t-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Kudos
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* ── Kudos Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sent', value: kudosStats.totalSent, icon: Send, color: 'text-cyan-400' },
            { label: 'Received', value: kudosStats.totalReceived, icon: Heart, color: 'text-rose-400' },
            { label: 'Top Category', value: kudosStats.mostCommonCategory || 'N/A', icon: Star, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] p-3 text-center">
              <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
              <p className="text-sm font-bold">{value}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Kudos Wall ── */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-400" />
            Kudos Wall
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1" style={{ scrollbarGutter: 'stable' }}>
            {kudosReceived.map((kudos) => {
              const catConfig = KUDOS_CATEGORY_CONFIG[kudos.category] || KUDOS_CATEGORY_CONFIG.THANKS;
              const colorStyle = KUDOS_COLOR_MAP[catConfig.color] || KUDOS_COLOR_MAP.emerald;
              const CatIcon = catConfig.icon;

              return (
                <motion.div key={kudos.id} {...fadeIn}>
                  <GlassCard className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-rose-500/20 text-rose-400 text-xs">
                          {kudos.fromUser?.name ? getInitials(kudos.fromUser.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{kudos.fromUser?.name || 'Someone'}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(kudos.createdAt)}</span>
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} border mb-2`}>
                          <CatIcon className="h-3 w-3" />
                          {catConfig.label}
                        </div>
                        <p className="text-sm text-muted-foreground">{kudos.message}</p>
                        <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs">
                          <Sparkles className="h-3 w-3" />
                          +{kudos.xpAmount} XP
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {kudosReceived.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No kudos received yet. Keep up the great work!</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}
