import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateGeminiContent } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Gather employee data for AI context
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { department: true, shift: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // Attendance data
    const attendance = await db.attendance.findMany({
      where: { userId, date: { gte: currentMonth + '-01' } },
      orderBy: { date: 'desc' },
    });

    // Late count this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const thisWeekAttendance = attendance.filter(a => a.date >= weekStartStr);
    const lateThisWeek = thisWeekAttendance.filter(a => a.status === 'LATE').length;
    const lateThreshold = (user.shift?.gracePeriod || 15);
    const lateBy10MinThisWeek = thisWeekAttendance.filter(a => {
      if (a.status !== 'LATE' && a.status !== 'PRESENT') return false;
      const clockIn = a.firstIn;
      if (!clockIn) return false;
      const shiftStart = user.shift?.startTime || '09:00';
      const [sH, sM] = shiftStart.split(':').map(Number);
      const [cH, cM] = clockIn.split(':').map(Number);
      const lateMinutes = (cH * 60 + cM) - (sH * 60 + sM + lateThreshold);
      return lateMinutes > 10;
    }).length;

    // Tasks data
    const tasks = await db.task.findMany({
      where: { assigneeId: userId },
    });
    const todoTasks = tasks.filter(t => t.status === 'TODO');
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'DONE');
    const todayDueTasks = tasks.filter(t => t.dueDate === today && t.status !== 'DONE');

    // Leaves data
    const leaves = await db.leave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const pendingLeaves = leaves.filter(l => l.status === 'PENDING');
    const approvedLeaves = leaves.filter(l => l.status === 'APPROVED');

    // Leave balance
    const leaveBalances = await db.leaveBalance.findMany({
      where: { userId, year: new Date().getFullYear() },
    });

    // Requests data
    const requests = await db.request.findMany({
      where: { userId, status: 'PENDING' },
    });

    // Complaints data
    const complaints = await db.complaint.findMany({
      where: { userId, status: { in: ['OPEN', 'INVESTIGATING', 'IN_PROGRESS'] } },
    });

    // Notifications
    const unreadNotifications = await db.notification.count({
      where: { userId, isRead: false },
    });

    // Compute predictive analytics
    const monthsElapsed = new Date().getMonth() + 1;
    const leaveUsageRate: Record<string, { used: number; total: number; projectedYearEnd: number; exhaustionMonth: string | null }> = {};
    for (const lb of leaveBalances) {
      const type = lb.leaveType.toLowerCase();
      const monthlyRate = monthsElapsed > 0 ? lb.used / monthsElapsed : 0;
      const projectedYearEnd = Math.round(monthlyRate * 12);
      const remaining = lb.total - lb.used;
      let exhaustionMonth: string | null = null;
      if (monthlyRate > 0 && remaining > 0) {
        const monthsUntilExhaustion = Math.floor(remaining / monthlyRate);
        if (monthsUntilExhaustion <= 12 - monthsElapsed) {
          const exhaustDate = new Date();
          exhaustDate.setMonth(exhaustDate.getMonth() + monthsUntilExhaustion);
          exhaustionMonth = exhaustDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
      }
      leaveUsageRate[type] = { used: lb.used, total: lb.total, projectedYearEnd, exhaustionMonth };
    }

    // On-time streak calculation
    const sortedAttendance = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    let onTimeStreak = 0;
    const shiftStart = user.shift?.startTime || '09:00';
    const gracePeriod = user.shift?.gracePeriod || 15;
    for (const record of sortedAttendance) {
      if (record.status === 'ABSENT' || record.status === 'HOLIDAY' || record.status === 'WEEKEND') break;
      const clockIn = record.firstIn;
      if (record.status === 'LATE') break;
      if (clockIn) {
        const [sH, sM] = shiftStart.split(':').map(Number);
        const [cH, cM] = clockIn.split(':').map(Number);
        const lateMinutes = (cH * 60 + cM) - (sH * 60 + sM + gracePeriod);
        if (lateMinutes > 0) break;
      }
      onTimeStreak++;
    }

    const monthPresentCount = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const monthAttendanceRate = attendance.length > 0 ? Math.round((monthPresentCount / attendance.length) * 100) : 100;

    // Build context for AI
    const employeeContext = {
      name: user.name,
      role: user.role,
      department: user.department?.name || 'Unassigned',
      today: today,
      attendance: {
        thisMonth: {
          present: attendance.filter(a => a.status === 'PRESENT').length,
          late: attendance.filter(a => a.status === 'LATE').length,
          absent: attendance.filter(a => a.status === 'ABSENT').length,
        },
        lateThisWeek,
        lateBy10MinThisWeek,
        onTimeStreak,
      },
      tasks: {
        total: tasks.length,
        todo: todoTasks.length,
        inProgress: inProgressTasks.length,
        done: tasks.filter(t => t.status === 'DONE').length,
        overdue: overdueTasks.length,
        dueToday: todayDueTasks.length,
        dueTodayTitles: todayDueTasks.map(t => t.title),
      },
      leaves: {
        pending: pendingLeaves.length,
        approvedUpcoming: approvedLeaves.filter(l => l.startDate >= today).length,
        balances: leaveUsageRate,
      },
      requests: { pending: requests.length },
      complaints: { open: complaints.length },
      notifications: { unread: unreadNotifications },
    };

    // Generate AI insights using Google Gemini
    let briefingText = '';
    let insightsText = '';

    try {
      // Call 1: Daily Briefing via Google Gemini
      const briefingPrompt = `You are an AI assistant for an employee management system. Generate a concise, friendly daily briefing for ${user.name}.

Current data: ${JSON.stringify(employeeContext, null, 2)}

Generate a daily briefing with these sections:
1. A personalized greeting with a 1-sentence summary of their day ahead
2. "Today's Focus" - List the most important items they need to act on today (tasks due, pending approvals, etc.)
3. "Quick Stats" - 3-4 key numbers for today in a compact format

Keep it brief, actionable, and encouraging. Use bullet points. Don't use markdown headers, just use emojis as section markers.
Response format:
🌅 [greeting summary]
📋 Today's Focus:
• [item 1]
• [item 2]
📊 Quick Stats: [stat1] · [stat2] · [stat3]`;

      briefingText = (await generateGeminiContent({
        prompt: briefingPrompt,
        systemInstruction: 'You are a helpful workplace AI assistant that gives concise, friendly daily briefings. Be brief and actionable.',
      })) || '';

      // Call 2: Predictive Alerts + Smart Suggestions via Google Gemini
      const insightsPrompt = `You are an AI workplace analytics assistant. Analyze this employee's data and generate predictive alerts and smart suggestions.

Employee data: ${JSON.stringify(employeeContext, null, 2)}

Generate TWO sections:

🔮 PREDICTIVE ALERTS (things that WILL happen if no action is taken):
- Based on leave usage rate, predict when leaves will be exhausted
- Based on attendance pattern, predict streak risk
- Based on task velocity, predict deadline risk
- Maximum 3 alerts, each with: alert text + recommended action
- Only include alerts that are ACTUALLY relevant (don't warn about things that are fine)

💡 SMART SUGGESTIONS (actionable recommendations):
- Based on attendance patterns (late arrivals, streak status)
- Based on task management (overdue, blocked)
- Based on work-life balance (leave usage, overtime)
- Maximum 3 suggestions, each with: suggestion text + action to take
- Only suggest things the employee can actually act on

Be specific with numbers and dates. Don't be generic.
Format each alert/suggestion as a single line starting with an emoji, followed by the text, then → and the action.`;

      insightsText = (await generateGeminiContent({
        prompt: insightsPrompt,
        systemInstruction: 'You are a workplace analytics AI. Give specific, data-driven predictions and actionable suggestions. Be direct and concise.',
      })) || '';
    } catch (aiError) {
      console.warn('[Gemini AI] Live generation unavailable, using computed insights:', (aiError as Error)?.message || aiError);
    }

    // If Gemini key is not configured or offline, provide a clean, structured briefing
    if (!briefingText) {
      const firstName = user.name?.split(' ')[0] || user.name;
      const totalPending = todayDueTasks.length + overdueTasks.length;
      const focusItems: string[] = [];
      if (overdueTasks.length > 0) focusItems.push(`• Address ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} requiring immediate action`);
      if (todayDueTasks.length > 0) focusItems.push(`• Complete ${todayDueTasks.length} milestone task${todayDueTasks.length > 1 ? 's' : ''} scheduled for today`);
      if (pendingLeaves.length > 0) focusItems.push(`• Track ${pendingLeaves.length} pending leave request${pendingLeaves.length > 1 ? 's' : ''} with your supervisor`);
      if (requests.length > 0) focusItems.push(`• Monitor ${requests.length} open department request${requests.length > 1 ? 's' : ''} in pipeline`);
      if (focusItems.length === 0) {
        focusItems.push(`• Review team backlog and upcoming milestones`);
        focusItems.push(`• Maintain your current on-time attendance streak (${onTimeStreak} days)`);
      }

      briefingText = [
        totalPending > 0
          ? `🌅 Good day, ${firstName}! You have ${totalPending} priority item${totalPending > 1 ? 's' : ''} requiring your attention today.`
          : `🌅 Good day, ${firstName}! All your task deliverables are on schedule with clear priorities today.`,
        "📋 Today's Focus:",
        ...focusItems.slice(0, 3),
        `📊 Quick Stats: ${inProgressTasks.length} in progress · ${monthAttendanceRate}% attendance · ${onTimeStreak}d streak`,
      ].join('\n');
    }

    // Parse alerts and suggestions from AI response
    const alerts: Array<{ text: string; action: string; severity: 'warning' | 'danger' | 'info' }> = [];
    const suggestions: Array<{ text: string; action: string; type: 'attendance' | 'tasks' | 'balance' }> = [];

    // Also add computed alerts (faster than AI, always accurate)
    for (const [type, data] of Object.entries(leaveUsageRate)) {
      if (data.exhaustionMonth) {
        alerts.push({
          text: `Your ${type} leaves will be exhausted by ${data.exhaustionMonth} at current usage rate (${data.used}/${data.total} used)`,
          action: `Conserve ${type} leaves or request additional quota`,
          severity: data.total - data.used <= 2 ? 'danger' : 'warning',
        });
      }
    }

    if (lateBy10MinThisWeek >= 3) {
      alerts.push({
        text: `You've been 10+ min late ${lateBy10MinThisWeek} times this week — your ${onTimeStreak}-day on-time streak is at risk`,
        action: 'Set an earlier alarm or adjust your morning routine',
        severity: 'danger',
      });
    }

    if (overdueTasks.length > 0) {
      alerts.push({
        text: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} that need immediate attention`,
        action: 'Focus on completing overdue tasks first',
        severity: overdueTasks.length > 2 ? 'danger' : 'warning',
      });
    }

    // Add computed suggestions
    if (onTimeStreak >= 5 && lateBy10MinThisWeek === 0) {
      suggestions.push({
        text: `Great ${onTimeStreak}-day on-time streak! Keep it up to earn the "Perfect Week" badge`,
        action: 'Maintain your routine',
        type: 'attendance',
      });
    }

    if (pendingLeaves.length > 0) {
      suggestions.push({
        text: `You have ${pendingLeaves.length} pending leave request${pendingLeaves.length > 1 ? 's' : ''} — follow up with your manager`,
        action: 'Check leave status',
        type: 'balance',
      });
    }

    if (todoTasks.length > inProgressTasks.length && todoTasks.length > 3) {
      suggestions.push({
        text: `${todoTasks.length} tasks in backlog — consider prioritizing and starting the most important ones`,
        action: 'Review and prioritize task list',
        type: 'tasks',
      });
    }

    // Build priority inbox items
    const priorityItems: Array<{
      id: string;
      type: 'task' | 'leave' | 'request' | 'complaint' | 'notification';
      title: string;
      description: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      dueDate?: string;
      actionUrl: string;
      actionLabel: string;
      createdAt: string;
    }> = [];

    // Overdue tasks first
    for (const task of overdueTasks) {
      priorityItems.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        description: `Overdue — was due ${task.dueDate}`,
        priority: 'urgent',
        dueDate: task.dueDate || undefined,
        actionUrl: 'tasks',
        actionLabel: 'View Task',
        createdAt: task.createdAt.toISOString(),
      });
    }

    // Tasks due today
    for (const task of todayDueTasks) {
      if (!overdueTasks.find(t => t.id === task.id)) {
        priorityItems.push({
          id: `task-today-${task.id}`,
          type: 'task',
          title: task.title,
          description: 'Due today',
          priority: 'high',
          dueDate: task.dueDate || undefined,
          actionUrl: 'tasks',
          actionLabel: 'View Task',
          createdAt: task.createdAt.toISOString(),
        });
      }
    }

    // Pending leaves
    for (const leave of pendingLeaves) {
      priorityItems.push({
        id: `leave-${leave.id}`,
        type: 'leave',
        title: `${leave.type} leave pending`,
        description: `${leave.startDate} to ${leave.endDate}`,
        priority: 'medium',
        actionUrl: 'leaves',
        actionLabel: 'Check Status',
        createdAt: leave.createdAt.toISOString(),
      });
    }

    // Pending requests
    for (const req of requests.slice(0, 5)) {
      priorityItems.push({
        id: `request-${req.id}`,
        type: 'request',
        title: `${req.type} request pending`,
        description: req.title || req.description || 'Awaiting review',
        priority: req.priority === 'URGENT' ? 'urgent' : req.priority === 'HIGH' ? 'high' : 'medium',
        dueDate: req.dueDate || undefined,
        actionUrl: 'requests',
        actionLabel: 'View Request',
        createdAt: req.createdAt.toISOString(),
      });
    }

    // Open complaints
    for (const comp of complaints.slice(0, 3)) {
      priorityItems.push({
        id: `complaint-${comp.id}`,
        type: 'complaint',
        title: comp.subject,
        description: `Status: ${comp.status}`,
        priority: comp.priority === 'CRITICAL' ? 'urgent' : comp.priority === 'HIGH' ? 'high' : 'medium',
        actionUrl: 'complaints',
        actionLabel: 'View Complaint',
        createdAt: comp.createdAt.toISOString(),
      });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    priorityItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      data: {
        briefing: briefingText,
        aiAlerts: insightsText,
        alerts: alerts.slice(0, 5),
        suggestions: suggestions.slice(0, 5),
        priorityInbox: priorityItems.slice(0, 10),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('AI Insights error:', error);
    return NextResponse.json({ error: 'Failed to generate insights', details: (error as Error)?.message, stack: (error as Error)?.stack }, { status: 500 });
  }
}
