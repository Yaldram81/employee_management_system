import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────
// Default badges to seed on first GET if none exist
// ─────────────────────────────────────────────────────────────
const DEFAULT_BADGES = [
  {
    slug: 'first-clock-in',
    name: 'First Clock In',
    description: 'Clocked in for the first time',
    icon: 'Zap',
    category: 'ATTENDANCE',
    tier: 'BRONZE',
    xpReward: 10,
    requirement: JSON.stringify({ type: 'clock_in', value: 1 }),
  },
  {
    slug: 'perfect-week',
    name: 'Perfect Week',
    description: '5+ on-time days in a row',
    icon: 'Star',
    category: 'ATTENDANCE',
    tier: 'SILVER',
    xpReward: 25,
    requirement: JSON.stringify({ type: 'streak', value: 5 }),
  },
  {
    slug: 'task-master',
    name: 'Task Master',
    description: 'Completed 3+ tasks',
    icon: 'Target',
    category: 'TASKS',
    tier: 'SILVER',
    xpReward: 25,
    requirement: JSON.stringify({ type: 'tasks_completed', value: 3 }),
  },
  {
    slug: 'on-fire',
    name: 'On Fire',
    description: '10+ day on-time streak',
    icon: 'Flame',
    category: 'ATTENDANCE',
    tier: 'GOLD',
    xpReward: 50,
    requirement: JSON.stringify({ type: 'streak', value: 10 }),
  },
  {
    slug: 'early-bird',
    name: 'Early Bird',
    description: 'Arrived before 9 AM',
    icon: 'Clock',
    category: 'ATTENDANCE',
    tier: 'BRONZE',
    xpReward: 10,
    requirement: JSON.stringify({ type: 'early_arrival', value: 1 }),
  },
  {
    slug: 'team-player',
    name: 'Team Player',
    description: 'Sent 5+ kudos',
    icon: 'Heart',
    category: 'ENGAGEMENT',
    tier: 'SILVER',
    xpReward: 25,
    requirement: JSON.stringify({ type: 'kudos_sent', value: 5 }),
  },
  {
    slug: 'kudos-king',
    name: 'Kudos King',
    description: 'Received 10+ kudos',
    icon: 'Crown',
    category: 'ENGAGEMENT',
    tier: 'GOLD',
    xpReward: 50,
    requirement: JSON.stringify({ type: 'kudos_received', value: 10 }),
  },
  {
    slug: 'speedster',
    name: 'Speedster',
    description: 'Completed a task within 1 day',
    icon: 'Zap',
    category: 'TASKS',
    tier: 'BRONZE',
    xpReward: 15,
    requirement: JSON.stringify({ type: 'task_speed', value: 1 }),
  },
  {
    slug: 'marathon-runner',
    name: 'Marathon Runner',
    description: '30+ day on-time streak',
    icon: 'Trophy',
    category: 'ATTENDANCE',
    tier: 'PLATINUM',
    xpReward: 100,
    requirement: JSON.stringify({ type: 'streak', value: 30 }),
  },
  {
    slug: 'centurion',
    name: 'Centurion',
    description: 'Completed 100 tasks',
    icon: 'Shield',
    category: 'TASKS',
    tier: 'DIAMOND',
    xpReward: 200,
    requirement: JSON.stringify({ type: 'tasks_completed', value: 100 }),
  },
];

// ─────────────────────────────────────────────────────────────
// Level title helper
// ─────────────────────────────────────────────────────────────
function getLevelTitle(level: number): string {
  if (level <= 1) return 'Newcomer';
  if (level <= 3) return 'Rising Star';
  if (level <= 5) return 'Achiever';
  if (level <= 7) return 'Champion';
  if (level <= 9) return 'Legend';
  return 'Icon';
}

// ─────────────────────────────────────────────────────────────
// Seed default badges if none exist
// ─────────────────────────────────────────────────────────────
async function seedDefaultBadges(): Promise<void> {
  const existingCount = await db.badge.count();
  if (existingCount === 0) {
    await db.badge.createMany({
      data: DEFAULT_BADGES.map((b) => ({
        ...b,
        isSecret: false,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// GET — Fetch gamification data for a user
// ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { status: 'error', message: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, departmentId: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { status: 'error', message: 'User not found' },
        { status: 404 }
      );
    }

    // Seed default badges if none exist
    await seedDefaultBadges();

    // Fetch all badges
    const badges = await db.badge.findMany({
      where: { isActive: true },
      orderBy: [{ tier: 'asc' }, { xpReward: 'asc' }],
    });

    // Fetch user's earned badges
    const userBadges = await db.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });

    // Fetch kudos received
    const kudosReceived = await db.kudos.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Fetch kudos sent
    const kudosSent = await db.kudos.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Fetch streak records
    const streaks = await db.streakRecord.findMany({
      where: { userId },
    });

    // Fetch challenges (active + upcoming) with user progress
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const challenges = await db.teamChallenge.findMany({
      where: {
        status: { in: ['ACTIVE', 'UPCOMING'] },
        endDate: { gte: todayStr },
      },
      include: {
        department: { select: { id: true, name: true } },
        members: {
          where: { userId },
          select: { id: true, progress: true, completedAt: true, rank: true },
        },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
    });

    // ─── Compute Total XP ───
    // Badge XP
    const badgeXP = userBadges.reduce((sum, ub) => sum + (ub.badge.xpReward || 0), 0);

    // Kudos received XP
    const kudosXPResult = await db.kudos.aggregate({
      where: { toUserId: userId },
      _sum: { xpAmount: true },
    });
    const kudosXP = kudosXPResult._sum.xpAmount || 0;

    const totalXP = badgeXP + kudosXP;

    // ─── Compute Level ───
    const levelNumber = Math.floor(totalXP / 100) + 1;
    const levelTitle = getLevelTitle(levelNumber);
    const nextLevelXP = levelNumber * 100;
    const currentLevelBaseXP = (levelNumber - 1) * 100;
    const progressInLevel = totalXP - currentLevelBaseXP;
    const progressPercent = Math.min(Math.round((progressInLevel / 100) * 100), 100);

    const level = {
      number: levelNumber,
      title: levelTitle,
      totalXP,
      nextLevelXP,
      progress: progressPercent,
    };

    // ─── Compute Leaderboard (same department, top 10 by XP) ───
    let leaderboard: Array<{
      userId: string;
      name: string;
      avatarUrl: string | null;
      totalXP: number;
      level: number;
      badgeCount: number;
    }> = [];

    if (user.departmentId) {
      // Get all users in the same department
      const deptUsers = await db.user.findMany({
        where: { departmentId: user.departmentId, isActive: true },
        select: { id: true, name: true, avatarUrl: true },
      });

      const deptUserIds = deptUsers.map((u) => u.id);

      // Badge XP per user
      const deptUserBadges = await db.userBadge.findMany({
        where: { userId: { in: deptUserIds } },
        include: { badge: { select: { xpReward: true } } },
      });

      const badgeXPMap = new Map<string, number>();
      for (const ub of deptUserBadges) {
        const current = badgeXPMap.get(ub.userId) || 0;
        badgeXPMap.set(ub.userId, current + (ub.badge.xpReward || 0));
      }

      // Kudos received XP per user
      const deptKudos = await db.kudos.findMany({
        where: { toUserId: { in: deptUserIds } },
        select: { toUserId: true, xpAmount: true },
      });

      const kudosXPMap = new Map<string, number>();
      for (const k of deptKudos) {
        const current = kudosXPMap.get(k.toUserId) || 0;
        kudosXPMap.set(k.toUserId, current + (k.xpAmount || 0));
      }

      // Badge count per user
      const badgeCountMap = new Map<string, number>();
      for (const ub of deptUserBadges) {
        const current = badgeCountMap.get(ub.userId) || 0;
        badgeCountMap.set(ub.userId, current + 1);
      }

      // Build leaderboard
      leaderboard = deptUsers
        .map((u) => {
          const xp = (badgeXPMap.get(u.id) || 0) + (kudosXPMap.get(u.id) || 0);
          return {
            userId: u.id,
            name: u.name,
            avatarUrl: u.avatarUrl,
            totalXP: xp,
            level: Math.floor(xp / 100) + 1,
            badgeCount: badgeCountMap.get(u.id) || 0,
          };
        })
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, 10);
    }

    // Format challenges to include user progress
    const formattedChallenges = challenges.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      metric: c.metric,
      targetValue: c.targetValue,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      reward: c.reward,
      department: c.department,
      userProgress: c.members.length > 0 ? c.members[0] : null,
    }));

    return NextResponse.json({
      data: {
        badges,
        userBadges,
        kudosReceived,
        kudosSent,
        streaks,
        challenges: formattedChallenges,
        leaderboard,
        level,
        totalXP,
      },
    });
  } catch (error) {
    console.error('Gamification GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch gamification data' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST — Actions: send-kudos, claim-badge, update-streak, pin-badge
// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  return requireAuth(request, async (authUser) => {
    try {
      const body = await request.json();
      const { action } = body;

      switch (action) {
        case 'send-kudos': {
          return await handleSendKudos(body, authUser.userId);
        }
        case 'claim-badge': {
          return await handleClaimBadge(body, authUser.userId);
        }
        case 'update-streak': {
          return await handleUpdateStreak(body, authUser.userId);
        }
        case 'pin-badge': {
          return await handlePinBadge(body, authUser.userId);
        }
        default:
          return NextResponse.json(
            { status: 'error', message: `Unknown action: ${action}. Valid actions: send-kudos, claim-badge, update-streak, pin-badge` },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Gamification POST error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to process gamification action' },
        { status: 500 }
      );
    }
  });
}

// ─── Send Kudos ─────────────────────────────────────────────
async function handleSendKudos(
  body: { fromUserId?: string; toUserId?: string; message?: string; category?: string },
  authenticatedUserId: string
) {
  const { fromUserId, toUserId, message, category } = body;

  if (!toUserId || !message) {
    return NextResponse.json(
      { status: 'error', message: 'toUserId and message are required' },
      { status: 400 }
    );
  }

  // Use authenticated user as sender (ignore fromUserId from body for security)
  const senderId = authenticatedUserId;

  if (senderId === toUserId) {
    return NextResponse.json(
      { status: 'error', message: 'Cannot send kudos to yourself' },
      { status: 400 }
    );
  }

  // Verify recipient exists
  const recipient = await db.user.findUnique({ where: { id: toUserId } });
  if (!recipient) {
    return NextResponse.json(
      { status: 'error', message: 'Recipient user not found' },
      { status: 404 }
    );
  }

  const validCategories = ['THANKS', 'TEAMWORK', 'INNOVATION', 'LEADERSHIP', 'GO_ABOVE_AND_BEYOND'];
  const kudosCategory = validCategories.includes(category || '') ? category! : 'THANKS';

  // XP amount based on category
  const xpByCategory: Record<string, number> = {
    THANKS: 5,
    TEAMWORK: 10,
    INNOVATION: 15,
    LEADERSHIP: 15,
    GO_ABOVE_AND_BEYOND: 20,
  };
  const xpAmount = xpByCategory[kudosCategory] || 5;

  const kudos = await db.kudos.create({
    data: {
      fromUserId: senderId,
      toUserId,
      message,
      category: kudosCategory,
      xpAmount,
    },
    include: {
      fromUser: { select: { id: true, name: true, avatarUrl: true } },
      toUser: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(
    {
      status: 'success',
      message: 'Kudos sent successfully',
      data: kudos,
    },
    { status: 201 }
  );
}

// ─── Claim Badge ─────────────────────────────────────────────
async function handleClaimBadge(
  body: { userId?: string; badgeSlug?: string },
  authenticatedUserId: string
) {
  const { badgeSlug } = body;
  const userId = authenticatedUserId;

  if (!badgeSlug) {
    return NextResponse.json(
      { status: 'error', message: 'badgeSlug is required' },
      { status: 400 }
    );
  }

  // Find the badge by slug
  const badge = await db.badge.findUnique({ where: { slug: badgeSlug } });
  if (!badge) {
    return NextResponse.json(
      { status: 'error', message: `Badge with slug "${badgeSlug}" not found` },
      { status: 404 }
    );
  }

  if (!badge.isActive) {
    return NextResponse.json(
      { status: 'error', message: 'This badge is no longer active' },
      { status: 400 }
    );
  }

  // Check if user already has this badge
  const existing = await db.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });

  if (existing) {
    return NextResponse.json(
      { status: 'error', message: 'Badge already earned by this user' },
      { status: 409 }
    );
  }

  // Award the badge
  const userBadge = await db.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
    },
    include: { badge: true },
  });

  return NextResponse.json(
    {
      status: 'success',
      message: 'Badge claimed successfully',
      data: userBadge,
    },
    { status: 201 }
  );
}

// ─── Update Streak ─────────────────────────────────────────────
async function handleUpdateStreak(
  body: { userId?: string; type?: string; date?: string },
  authenticatedUserId: string
) {
  const { type, date } = body;
  const userId = authenticatedUserId;

  const validTypes = ['ON_TIME', 'TASK_COMPLETION', 'DAILY_LOGIN'];
  const streakType = validTypes.includes(type || '') ? type! : 'ON_TIME';

  const streakDate = date || new Date().toISOString().split('T')[0];

  // Find or create the streak record
  let streak = await db.streakRecord.findUnique({
    where: { userId_type: { userId, type: streakType } },
  });

  if (!streak) {
    // Create new streak
    streak = await db.streakRecord.create({
      data: {
        userId,
        type: streakType,
        currentStreak: 1,
        longestStreak: 1,
        lastDate: streakDate,
        milestones: JSON.stringify([1]),
      },
    });
  } else {
    // Check if the date is consecutive (1 day after lastDate)
    const lastDate = new Date(streak.lastDate);
    const currentDate = new Date(streakDate);
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let newCurrentStreak = streak.currentStreak;
    let newLongestStreak = streak.longestStreak;
    let newMilestones: number[] = JSON.parse(streak.milestones || '[]');

    if (diffDays === 1) {
      // Consecutive day — increment streak
      newCurrentStreak += 1;
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);

      // Add milestone if reached
      const milestoneValues = [5, 10, 15, 20, 30, 50, 100];
      for (const m of milestoneValues) {
        if (newCurrentStreak >= m && !newMilestones.includes(m)) {
          newMilestones.push(m);
        }
      }
    } else if (diffDays > 1) {
      // Gap — reset streak
      newCurrentStreak = 1;
      newMilestones = newMilestones.length > 0 ? newMilestones : [1];
    }
    // If diffDays === 0, same day — no change

    streak = await db.streakRecord.update({
      where: { id: streak.id },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastDate: streakDate,
        milestones: JSON.stringify(newMilestones),
      },
    });
  }

  return NextResponse.json({
    status: 'success',
    message: 'Streak updated successfully',
    data: streak,
  });
}

// ─── Pin/Unpin Badge ─────────────────────────────────────────
async function handlePinBadge(
  body: { userBadgeId?: string; isPinned?: boolean },
  authenticatedUserId: string
) {
  const { userBadgeId, isPinned } = body;

  if (!userBadgeId) {
    return NextResponse.json(
      { status: 'error', message: 'userBadgeId is required' },
      { status: 400 }
    );
  }

  if (isPinned === undefined || isPinned === null) {
    return NextResponse.json(
      { status: 'error', message: 'isPinned is required' },
      { status: 400 }
    );
  }

  // Find the user badge
  const userBadge = await db.userBadge.findUnique({
    where: { id: userBadgeId },
  });

  if (!userBadge) {
    return NextResponse.json(
      { status: 'error', message: 'User badge not found' },
      { status: 404 }
    );
  }

  // Verify ownership
  if (userBadge.userId !== authenticatedUserId) {
    return NextResponse.json(
      { status: 'error', message: 'You can only pin your own badges' },
      { status: 403 }
    );
  }

  const updated = await db.userBadge.update({
    where: { id: userBadgeId },
    data: { isPinned: Boolean(isPinned) },
    include: { badge: true },
  });

  return NextResponse.json({
    status: 'success',
    message: isPinned ? 'Badge pinned successfully' : 'Badge unpinned successfully',
    data: updated,
  });
}
