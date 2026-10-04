import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────────

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateHuman(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getNextDayOfWeek(from: Date, dayOfWeek: number): Date {
  // dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat
  const result = new Date(from);
  const currentDay = result.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7; // at least 1 day ahead
  result.setDate(result.getDate() + daysUntil);
  return result;
}

function resolveRelativeDate(token: string, baseDate: Date): string | null {
  const lower = token.toLowerCase().trim();

  // "tomorrow"
  if (lower === 'tomorrow') {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return formatDateISO(d);
  }

  // "today"
  if (lower === 'today') {
    return formatDateISO(baseDate);
  }

  // "next monday/tuesday/..."
  const dayNames: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
    sun: 0, mon: 1, tue: 2, tues: 2, wed: 3,
    thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
  };

  const nextDayMatch = lower.match(/^next\s+(\w+)$/);
  if (nextDayMatch && dayNames[nextDayMatch[1]] !== undefined) {
    return formatDateISO(getNextDayOfWeek(baseDate, dayNames[nextDayMatch[1]]));
  }

  // "monday", "friday", etc. (upcoming instance)
  if (dayNames[lower] !== undefined) {
    return formatDateISO(getNextDayOfWeek(baseDate, dayNames[lower]));
  }

  // "next week" → next Monday
  if (lower === 'next week') {
    return formatDateISO(getNextDayOfWeek(baseDate, 1)); // Monday
  }

  // ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
    return lower;
  }

  // "in N days/weeks"
  const inMatch = lower.match(/^in\s+(\d+)\s+(day|days|week|weeks)$/);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2].startsWith('week') ? 7 : 1;
    const d = new Date(baseDate);
    d.setDate(d.getDate() + n * unit);
    return formatDateISO(d);
  }

  return null;
}

function getNextWeekEnd(baseDate: Date): string {
  // Next Friday
  return formatDateISO(getNextDayOfWeek(baseDate, 5));
}

// ─────────────────────────────────────────────────────────────
// Leave Type Mapping
// ─────────────────────────────────────────────────────────────

const leaveTypeMap: Record<string, string> = {
  sick: 'sick',
  casual: 'casual',
  vacation: 'vacation',
  annual: 'vacation',
  personal: 'casual',
  maternity: 'maternity',
  paternity: 'paternity',
  unpaid: 'unpaid',
  half: 'casual',
};

function resolveLeaveType(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, type] of Object.entries(leaveTypeMap)) {
    if (lower.includes(keyword)) return type;
  }
  return 'casual'; // default
}

// ─────────────────────────────────────────────────────────────
// Intent Parsing
// ─────────────────────────────────────────────────────────────

interface ParsedIntent {
  intent: string;
  params: Record<string, unknown>;
  confidence: number;
  rawMatch: string;
}

function parseCommand(command: string, baseDate: Date): ParsedIntent | null {
  const c = command.toLowerCase().trim();

  // ─── 1. LEAVE COMMANDS ────────────────────────────────

  // "apply leave [type] [date]" / "apply for leave"
  const applyLeaveMatch = c.match(
    /(?:apply\s+(?:for\s+)?(?:a\s+)?leave|request\s+(?:a\s+)?leave|take\s+(?:a\s+)?leave|submit\s+leave|i\s+(?:want|need|would\s+like)\s+(?:to\s+)?(?:apply|take|request)\s+(?:a\s+)?leave)/
  );
  if (applyLeaveMatch) {
    const leaveType = resolveLeaveType(c);
    const startDate = extractDateFromText(c, baseDate);
    const endDate = extractEndDateFromText(c, baseDate);
    const reason = extractReasonFromText(command);

    return {
      intent: 'apply-leave',
      params: {
        startDate: startDate || formatDateISO(baseDate),
        endDate: endDate || startDate || formatDateISO(baseDate),
        type: leaveType,
        reason: reason || '',
      },
      confidence: 0.9,
      rawMatch: applyLeaveMatch[0],
    };
  }

  // "apply sick leave on friday" / "request vacation next week"
  const applyTypeLeaveMatch = c.match(
    /(?:apply|request|take|submit)\s+(?:a\s+)?(\w+\s+)?leave\s+(?:on\s+|for\s+|starting\s+|from\s+)?(.+)/
  );
  if (applyTypeLeaveMatch && !applyLeaveMatch) {
    const leaveType = resolveLeaveType(applyTypeLeaveMatch[1] || c);
    const dateText = applyTypeLeaveMatch[2];
    const startDate = resolveRelativeDate(dateText, baseDate) || formatDateISO(baseDate);

    return {
      intent: 'apply-leave',
      params: {
        startDate,
        endDate: startDate,
        type: leaveType,
        reason: '',
      },
      confidence: 0.85,
      rawMatch: applyTypeLeaveMatch[0],
    };
  }

  // "take a day off tomorrow" / "take day off on friday"
  const dayOffMatch = c.match(
    /take\s+(?:a\s+)?(?:day|few\s+days|couple\s+days)\s+off(?:\s+(?:on|starting|from|next|this)\s+(.+))?/
  );
  if (dayOffMatch) {
    const dateText = dayOffMatch[1] || 'tomorrow';
    const startDate = resolveRelativeDate(dateText, baseDate) || formatDateISO(baseDate);

    return {
      intent: 'apply-leave',
      params: {
        startDate,
        endDate: startDate,
        type: 'casual',
        reason: '',
      },
      confidence: 0.88,
      rawMatch: dayOffMatch[0],
    };
  }

  // "request vacation next week"
  const vacationMatch = c.match(
    /request\s+(?:a\s+)?(?:vacation|annual\s+leave|holiday)(?:\s+(.+))?/
  );
  if (vacationMatch) {
    const dateText = vacationMatch[1] || 'next week';
    const startDate = resolveRelativeDate(dateText, baseDate) || formatDateISO(getNextDayOfWeek(baseDate, 1));
    const endDate = dateText.includes('week')
      ? getNextWeekEnd(baseDate)
      : startDate;

    return {
      intent: 'apply-leave',
      params: {
        startDate,
        endDate,
        type: 'vacation',
        reason: '',
      },
      confidence: 0.85,
      rawMatch: vacationMatch[0],
    };
  }

  // ─── 2. ATTENDANCE COMMANDS ───────────────────────────

  // "clock in" / "punch in"
  if (/^(?:clock|punch|check)\s+in/i.test(c)) {
    return {
      intent: 'clock-in',
      params: {},
      confidence: 0.95,
      rawMatch: c.match(/^(?:clock|punch|check)\s+in/i)?.[0] || c,
    };
  }

  // "clock out" / "punch out"
  if (/^(?:clock|punch|check)\s+out/i.test(c)) {
    return {
      intent: 'clock-out',
      params: {},
      confidence: 0.95,
      rawMatch: c.match(/^(?:clock|punch|check)\s+out/i)?.[0] || c,
    };
  }

  // "check my attendance" / "show attendance"
  if (/(?:check|show|view|open)\s+(?:my\s+)?attendance/i.test(c)) {
    return {
      intent: 'navigate',
      params: { view: 'attendance' },
      confidence: 0.85,
      rawMatch: c.match(/(?:check|show|view|open)\s+(?:my\s+)?attendance/i)?.[0] || c,
    };
  }

  // ─── 3. TASK COMMANDS ─────────────────────────────────

  // "create task <title>"
  const createTaskMatch = c.match(
    /(?:create|add|new)\s+(?:a\s+)?task\s+(.+)/i
  );
  if (createTaskMatch) {
    return {
      intent: 'create-task',
      params: { title: command.match(/(?:create|add|new)\s+(?:a\s+)?task\s+(.+)/i)?.[1] || createTaskMatch[1] },
      confidence: 0.9,
      rawMatch: createTaskMatch[0],
    };
  }

  // "mark task done/complete"
  const markTaskMatch = c.match(
    /mark\s+(?:task\s+)?(?:as\s+)?(done|complete|finished|closed|in\s+progress|todo|blocked)/i
  );
  if (markTaskMatch) {
    const statusRaw = markTaskMatch[1].toLowerCase();
    const statusMap: Record<string, string> = {
      done: 'DONE', complete: 'DONE', finished: 'DONE', closed: 'DONE',
      'in progress': 'IN_PROGRESS', todo: 'TODO', blocked: 'BLOCKED',
    };
    return {
      intent: 'update-task',
      params: { status: statusMap[statusRaw] || statusRaw.toUpperCase() },
      confidence: 0.85,
      rawMatch: markTaskMatch[0],
    };
  }

  // "show my tasks" / "show tasks"
  if (/(?:show|view|see|display|list)\s+(?:my\s+)?tasks?/i.test(c) && !/overdue/i.test(c)) {
    return {
      intent: 'navigate',
      params: { view: 'tasks' },
      confidence: 0.88,
      rawMatch: c.match(/(?:show|view|see|display|list)\s+(?:my\s+)?tasks?/i)?.[0] || c,
    };
  }

  // "show overdue tasks"
  if (/(?:show|view|see|display|list)\s+(?:my\s+)?overdue\s+tasks?/i.test(c)) {
    return {
      intent: 'navigate',
      params: { view: 'tasks', filter: 'overdue' },
      confidence: 0.88,
      rawMatch: c.match(/(?:show|view|see|display|list)\s+(?:my\s+)?overdue\s+tasks?/i)?.[0] || c,
    };
  }

  // ─── 4. REQUEST/COMPLAINT COMMANDS ────────────────────

  // "submit expense request $500"
  const expenseMatch = c.match(
    /(?:submit|file|create|raise|make)\s+(?:an?\s+)?(?:expense|reimbursement)\s+(?:request\s+)?(?:for\s+)?\$?(\d+(?:\.\d{2})?)/i
  );
  if (expenseMatch) {
    return {
      intent: 'submit-request',
      params: { type: 'expense', amount: parseFloat(expenseMatch[1]) },
      confidence: 0.9,
      rawMatch: expenseMatch[0],
    };
  }

  // "submit request" (generic)
  const submitReqMatch = c.match(
    /(?:submit|file|create|raise|make)\s+(?:an?\s+)?(\w+\s+)?request(?:\s+(?:for\s+)?(.+))?/i
  );
  if (submitReqMatch) {
    const reqTypeRaw = submitReqMatch[1]?.trim() || '';
    const reqTypeMap: Record<string, string> = {
      expense: 'EXPENSE', asset: 'ASSET', shift: 'SHIFT_SWAP',
      training: 'TRAINING', equipment: 'EQUIPMENT', travel: 'TRAVEL',
      it: 'IT_SUPPORT', 'it support': 'IT_SUPPORT',
      leave: 'LEAVE',
    };
    const reqType = reqTypeMap[reqTypeRaw.toLowerCase()] || reqTypeRaw.toUpperCase() || 'GENERAL';

    return {
      intent: 'submit-request',
      params: { type: reqType, description: submitReqMatch[2] || '' },
      confidence: 0.82,
      rawMatch: submitReqMatch[0],
    };
  }

  // "file complaint about AC" / "submit complaint"
  const complaintMatch = c.match(
    /(?:file|submit|raise|log|make|register|lodge)\s+(?:a\s+)?complaint(?:\s+(?:about|regarding|on|for)\s+(.+))?/i
  );
  if (complaintMatch) {
    return {
      intent: 'file-complaint',
      params: { subject: complaintMatch[1]?.trim() || 'General complaint' },
      confidence: 0.9,
      rawMatch: complaintMatch[0],
    };
  }

  // "complain about X"
  const complainAboutMatch = c.match(
    /complain\s+(?:about|regarding|on)\s+(.+)/i
  );
  if (complainAboutMatch) {
    return {
      intent: 'file-complaint',
      params: { subject: complainAboutMatch[1].trim() },
      confidence: 0.85,
      rawMatch: complainAboutMatch[0],
    };
  }

  // ─── 5. PAYROLL COMMANDS ──────────────────────────────

  if (/(?:check|view|show|see|download)\s+(?:my\s+)?(?:payslip|pay\s+slip|salary\s+slip)/i.test(c)) {
    return {
      intent: 'navigate',
      params: { view: 'payroll' },
      confidence: 0.9,
      rawMatch: c.match(/(?:check|view|show|see|download)\s+(?:my\s+)?(?:payslip|pay\s+slip|salary\s+slip)/i)?.[0] || c,
    };
  }

  if (/(?:view|check|show|see)\s+(?:my\s+)?(?:salary|compensation|pay)/i.test(c)) {
    return {
      intent: 'navigate',
      params: { view: 'payroll' },
      confidence: 0.85,
      rawMatch: c.match(/(?:view|check|show|see)\s+(?:my\s+)?(?:salary|compensation|pay)/i)?.[0] || c,
    };
  }

  // ─── 6. NAVIGATION COMMANDS ───────────────────────────

  const navPatterns: Array<{ pattern: RegExp; view: string; confidence: number }> = [
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to|show\s+me)\s+(?:the\s+)?dashboard/i, view: 'dashboard', confidence: 0.92 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+)?(?:leaves?|leave\s+management)/i, view: 'leaves', confidence: 0.92 },
    { pattern: /(?:show|view|see|display)\s+(?:my\s+)?leaves?/i, view: 'leaves', confidence: 0.88 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+)?settings/i, view: 'settings', confidence: 0.92 },
    { pattern: /(?:open|go\s+to|show)\s+(?:my\s+)?profile/i, view: 'profile', confidence: 0.88 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+)?(?:tasks?|task\s+board|task\s+list)/i, view: 'tasks', confidence: 0.90 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+)?(?:complaints?|complaint\s+center)/i, view: 'complaints', confidence: 0.90 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+)?(?:requests?|request\s+center)/i, view: 'requests', confidence: 0.90 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+)?(?:payroll|salary)/i, view: 'payroll', confidence: 0.90 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+)?team/i, view: 'team', confidence: 0.88 },
    { pattern: /(?:go\s+to|open|navigate\s+to|switch\s+to)\s+(?:the\s+?)reports?/i, view: 'reports', confidence: 0.85 },
  ];

  for (const nav of navPatterns) {
    const match = c.match(nav.pattern);
    if (match) {
      return {
        intent: 'navigate',
        params: { view: nav.view },
        confidence: nav.confidence,
        rawMatch: match[0],
      };
    }
  }

  // ─── 7. NOTIFICATION COMMANDS ─────────────────────────

  if (/(?:show|view|see|check|display)\s+(?:my\s+)?notifications?/i.test(c)) {
    return {
      intent: 'navigate',
      params: { view: 'notifications' },
      confidence: 0.88,
      rawMatch: c.match(/(?:show|view|see|check|display)\s+(?:my\s+)?notifications?/i)?.[0] || c,
    };
  }

  // "approve leave" / "reject request" etc.
  const notificationActionMatch = c.match(
    /(?:approve|reject|deny|acknowledge|dismiss)\s+(?:the\s+)?(?:pending\s+)?(\w+)/i
  );
  if (notificationActionMatch) {
    const actionWord = c.match(/^(approve|reject|deny|acknowledge|dismiss)/i)?.[1]?.toLowerCase() || 'approve';
    const entityTypeRaw = notificationActionMatch[1].toLowerCase();
    const actionMap: Record<string, string> = {
      approve: 'approve', reject: 'reject', deny: 'reject',
      acknowledge: 'acknowledge', dismiss: 'dismiss',
    };
    const entityTypeMap: Record<string, string> = {
      leave: 'leave', leaves: 'leave', request: 'request', requests: 'request',
      complaint: 'complaint', complaints: 'complaint', task: 'task', tasks: 'task',
    };
    const action = actionMap[actionWord] || actionWord;
    const entityType = entityTypeMap[entityTypeRaw] || entityTypeRaw;

    return {
      intent: 'notification-action',
      params: { action, entityType },
      confidence: 0.82,
      rawMatch: notificationActionMatch[0],
    };
  }

  // ─── FUZZY MATCHING (lower confidence) ────────────────

  // Fuzzy leave
  if (/(?:leave|off|vacation|holiday|absent)/i.test(c)) {
    const leaveType = resolveLeaveType(c);
    const startDate = extractDateFromText(c, baseDate) || formatDateISO(baseDate);
    return {
      intent: 'apply-leave',
      params: {
        startDate,
        endDate: startDate,
        type: leaveType,
        reason: '',
      },
      confidence: 0.55,
      rawMatch: c.match(/(?:leave|off|vacation|holiday|absent)/i)?.[0] || c,
    };
  }

  // Fuzzy clock in
  if (/(?:clock|punch|check\s*in|sign\s*in|log\s*in|start\s*work)/i.test(c)) {
    return {
      intent: 'clock-in',
      params: {},
      confidence: 0.6,
      rawMatch: c.match(/(?:clock|punch|check\s*in|sign\s*in|log\s*in|start\s*work)/i)?.[0] || c,
    };
  }

  // Fuzzy clock out
  if (/(?:clock\s*out|punch\s*out|check\s*out|sign\s*out|log\s*out|end\s*work|finish\s*work)/i.test(c)) {
    return {
      intent: 'clock-out',
      params: {},
      confidence: 0.6,
      rawMatch: c.match(/(?:clock\s*out|punch\s*out|check\s*out|sign\s*out|log\s*out|end\s*work|finish\s*work)/i)?.[0] || c,
    };
  }

  // Fuzzy task
  if (/(?:task|todo|assignment)/i.test(c)) {
    if (/create|add|new|make/i.test(c)) {
      const titleMatch = command.match(/(?:create|add|new|make)\s+(?:a\s+)?(?:task|todo)\s+(.+)/i);
      return {
        intent: 'create-task',
        params: { title: titleMatch?.[1] || 'New Task' },
        confidence: 0.6,
        rawMatch: c.match(/(?:task|todo|assignment)/i)?.[0] || c,
      };
    }
    return {
      intent: 'navigate',
      params: { view: 'tasks' },
      confidence: 0.55,
      rawMatch: c.match(/(?:task|todo|assignment)/i)?.[0] || c,
    };
  }

  // Fuzzy complaint
  if (/(?:complaint|complain|issue|problem|grievance)/i.test(c)) {
    const subjectMatch = command.match(/(?:about|regarding|on|for)\s+(.+)/i);
    return {
      intent: 'file-complaint',
      params: { subject: subjectMatch?.[1] || '' },
      confidence: 0.55,
      rawMatch: c.match(/(?:complaint|complain|issue|problem|grievance)/i)?.[0] || c,
    };
  }

  // Fuzzy payroll
  if (/(?:salary|pay|payslip|payroll|compensation|wage)/i.test(c)) {
    return {
      intent: 'navigate',
      params: { view: 'payroll' },
      confidence: 0.55,
      rawMatch: c.match(/(?:salary|pay|payslip|payroll|compensation|wage)/i)?.[0] || c,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Text Extraction Helpers
// ─────────────────────────────────────────────────────────────

function extractDateFromText(text: string, baseDate: Date): string | null {
  // Try to find relative date tokens in the text
  const tokens = text.toLowerCase().split(/\s+/);

  // Check for "on <date>" or "for <date>" patterns
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'on' || tokens[i] === 'for' || tokens[i] === 'starting' || tokens[i] === 'from') {
      // Try to resolve the next 1-2 tokens as a date
      const candidate1 = tokens.slice(i + 1, i + 2).join(' ');
      const candidate2 = tokens.slice(i + 1, i + 3).join(' ');
      const date2 = resolveRelativeDate(candidate2, baseDate);
      if (date2) return date2;
      const date1 = resolveRelativeDate(candidate1, baseDate);
      if (date1) return date1;
    }
  }

  // Try "tomorrow" anywhere in text
  if (tokens.includes('tomorrow')) {
    return resolveRelativeDate('tomorrow', baseDate);
  }

  // Try "today" anywhere in text
  if (tokens.includes('today')) {
    return resolveRelativeDate('today', baseDate);
  }

  // Try day names
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                    'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun'];
  for (const token of tokens) {
    if (dayNames.includes(token)) {
      const result = resolveRelativeDate(token, baseDate);
      if (result) return result;
    }
  }

  // Try "next week"
  if (tokens.includes('next') && tokens.includes('week')) {
    return resolveRelativeDate('next week', baseDate);
  }

  // Try "next <day>"
  const nextIdx = tokens.indexOf('next');
  if (nextIdx >= 0 && nextIdx < tokens.length - 1) {
    const candidate = `next ${tokens[nextIdx + 1]}`;
    const result = resolveRelativeDate(candidate, baseDate);
    if (result) return result;
  }

  // Try ISO date
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  return null;
}

function extractEndDateFromText(text: string, baseDate: Date): string | null {
  const lower = text.toLowerCase();

  // "next week" implies Monday to Friday
  if (lower.includes('next week')) {
    return getNextWeekEnd(baseDate);
  }

  // "to <date>" or "until <date>" or "through <date>"
  const toMatch = lower.match(/(?:to|until|through|till)\s+(.+)/);
  if (toMatch) {
    const result = resolveRelativeDate(toMatch[1].trim(), baseDate);
    if (result) return result;
  }

  // "for N days"
  const forDaysMatch = lower.match(/for\s+(\d+)\s+days?/);
  if (forDaysMatch) {
    const startDate = extractDateFromText(text, baseDate) || formatDateISO(baseDate);
    const [y, m, d] = startDate.split('-').map(Number);
    const endDate = new Date(y, m - 1, d + parseInt(forDaysMatch[1], 10) - 1);
    return formatDateISO(endDate);
  }

  return null;
}

function extractReasonFromText(originalText: string): string | null {
  // "for <reason>" / "because <reason>" / "reason: <reason>"
  const reasonMatch = originalText.match(/(?:because|reason\s*(?:is|:)|for\s+(?!tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|in\s+\d))(.+)/i);
  if (reasonMatch) {
    return reasonMatch[1].trim().replace(/[.!?]+$/, '');
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Preview Text Generator
// ─────────────────────────────────────────────────────────────

function generatePreviewText(intent: string, params: Record<string, unknown>): string {
  switch (intent) {
    case 'apply-leave': {
      const type = (params.type as string || 'casual');
      const startDate = params.startDate as string;
      const endDate = params.endDate as string;
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      if (startDate === endDate || !endDate) {
        return `Apply ${typeLabel} leave for ${formatDateHuman(startDate)}`;
      }
      return `Apply ${typeLabel} leave from ${formatDateHuman(startDate)} to ${formatDateHuman(endDate)}`;
    }
    case 'clock-in':
      return 'Clock in for today';
    case 'clock-out':
      return 'Clock out for today';
    case 'create-task':
      return `Create task: "${params.title}"`;
    case 'update-task':
      return `Update task status to ${params.status}`;
    case 'navigate': {
      const viewLabels: Record<string, string> = {
        dashboard: 'Dashboard',
        leaves: 'Leave Management',
        attendance: 'Attendance',
        tasks: 'Task Board',
        payroll: 'Payroll',
        settings: 'Settings',
        profile: 'Profile',
        complaints: 'Complaint Center',
        requests: 'Request Center',
        notifications: 'Notifications',
        team: 'Team',
        reports: 'Reports',
      };
      const view = params.view as string;
      const label = viewLabels[view] || view;
      if (params.filter) {
        return `Go to ${label} (filtered: ${params.filter})`;
      }
      return `Go to ${label}`;
    }
    case 'submit-request':
      if (params.amount) {
        return `Submit ${params.type} request for $${params.amount}`;
      }
      return `Submit ${params.type} request`;
    case 'file-complaint':
      return `File complaint about "${params.subject}"`;
    case 'notification-action':
      return `${(params.action as string).charAt(0).toUpperCase() + (params.action as string).slice(1)} ${params.entityType}`;
    default:
      return 'Unknown action';
  }
}

// ─────────────────────────────────────────────────────────────
// Requires Confirmation Check
// ─────────────────────────────────────────────────────────────

function requiresConfirmation(intent: string): boolean {
  // State-changing or destructive actions need confirmation
  const confirmationIntents = [
    'apply-leave',
    'clock-in',
    'clock-out',
    'create-task',
    'update-task',
    'submit-request',
    'file-complaint',
    'notification-action',
  ];
  return confirmationIntents.includes(intent);
}

// ─────────────────────────────────────────────────────────────
// Suggestions Generator (context-enriched)
// ─────────────────────────────────────────────────────────────

async function generateSuggestions(
  intent: string,
  userId: string,
  _params: Record<string, unknown>
): Promise<string[]> {
  const suggestions: string[] = [];

  try {
    if (intent === 'apply-leave') {
      // Check leave balance
      const balances = await db.leaveBalance.findMany({
        where: { userId, year: new Date().getFullYear() },
      });
      for (const b of balances) {
        const remaining = b.total - b.used;
        suggestions.push(`You have ${remaining} ${b.leaveType.toLowerCase()} leaves remaining`);
      }

      // Check if manager is available (has active status)
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });
      if (user?.department?.managerId) {
        const manager = await db.user.findUnique({
          where: { id: user.department.managerId },
        });
        if (manager?.isActive) {
          suggestions.push(`Your manager (${manager.name}) is available today`);
        }
      }
    }

    if (intent === 'clock-in') {
      const today = formatDateISO(new Date());
      const existingAttendance = await db.attendance.findFirst({
        where: { userId, date: today },
      });
      if (existingAttendance?.firstIn) {
        suggestions.push('You have already clocked in today at ' + existingAttendance.firstIn);
      }
    }

    if (intent === 'navigate' && _params.view === 'tasks') {
      const taskCount = await db.task.count({
        where: { assigneeId: userId, status: { not: 'DONE' } },
      });
      if (taskCount > 0) {
        suggestions.push(`You have ${taskCount} active task${taskCount > 1 ? 's' : ''}`);
      }
    }

    if (intent === 'navigate' && _params.view === 'leaves') {
      const pendingLeaves = await db.leave.count({
        where: { userId, status: 'PENDING' },
      });
      if (pendingLeaves > 0) {
        suggestions.push(`You have ${pendingLeaves} pending leave request${pendingLeaves > 1 ? 's' : ''}`);
      }
    }

    if (intent === 'unknown') {
      // Provide helpful command suggestions
      suggestions.push(
        'Try: "apply leave tomorrow"',
        'Try: "clock in"',
        'Try: "show my tasks"',
        'Try: "check my payslip"',
        'Try: "file complaint about [issue]"',
      );
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    // Fall back to generic suggestions
    if (intent === 'unknown') {
      suggestions.push(
        'Try: "apply leave tomorrow"',
        'Try: "clock in"',
        'Try: "show my tasks"',
        'Try: "check my payslip"',
      );
    }
  }

  return suggestions.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────
// API Route Handler
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  return requireAuth(request, async () => {
    try {
      const body = await request.json();
      const { command, userId, context } = body as {
        command?: string;
        userId?: string;
        context?: Record<string, unknown>;
      };

      if (!command || typeof command !== 'string') {
        return NextResponse.json(
          {
            status: 'error',
            message: 'A "command" string is required in the request body',
          },
          { status: 400 }
        );
      }

      const trimmedCommand = command.trim();
      if (trimmedCommand.length === 0) {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Command cannot be empty',
          },
          { status: 400 }
        );
      }

      if (trimmedCommand.length > 500) {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Command too long (max 500 characters)',
          },
          { status: 400 }
        );
      }

      const baseDate = new Date();

      // Override base date from context if provided (for testing)
      if (context?.baseDate && typeof context.baseDate === 'string') {
        const parsed = new Date(context.baseDate);
        if (!isNaN(parsed.getTime())) {
          baseDate.setTime(parsed.getTime());
        }
      }

      // Parse the command
      const parsed = parseCommand(trimmedCommand, baseDate);

      let resultIntent: string;
      let resultParams: Record<string, unknown>;
      let resultConfidence: number;

      if (parsed) {
        resultIntent = parsed.intent;
        resultParams = parsed.params;
        resultConfidence = parsed.confidence;
      } else {
        resultIntent = 'unknown';
        resultParams = {};
        resultConfidence = 0;
      }

      // Generate preview text
      const previewText = generatePreviewText(resultIntent, resultParams);

      // Check if confirmation is required
      const needsConfirmation = requiresConfirmation(resultIntent);

      // Generate context-enriched suggestions
      const suggestions = await generateSuggestions(
        resultIntent,
        userId || '',
        resultParams
      );

      return NextResponse.json({
        status: 'success',
        data: {
          intent: resultIntent,
          params: resultParams,
          confidence: resultConfidence,
          suggestions,
          requiresConfirmation: needsConfirmation,
          previewText,
        },
      });
    } catch (error) {
      console.error('NLP Command parsing error:', error);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to parse command',
        },
        { status: 500 }
      );
    }
  });
}
