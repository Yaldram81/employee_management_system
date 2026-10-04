import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Priority weight map — higher priority tends to get approved faster */
const PRIORITY_BOOST: Record<string, number> = {
  URGENT: 8,
  HIGH: 5,
  MEDIUM: 0,
  LOW: -3,
};

/** Thresholds for amount-based approval adjustments */
const AMOUNT_TIERS: Array<{ ceiling: number; penalty: number; label: string }> = [
  { ceiling: 500, penalty: 0, label: '$500' },
  { ceiling: 1000, penalty: -3, label: '$1,000' },
  { ceiling: 2500, penalty: -7, label: '$2,500' },
  { ceiling: 5000, penalty: -12, label: '$5,000' },
  { ceiling: 10000, penalty: -18, label: '$10,000' },
  { ceiling: Infinity, penalty: -25, label: '$10,000+' },
];

/** Friendly display names for request types */
const TYPE_LABELS: Record<string, string> = {
  EXPENSE: 'Expense',
  TRAVEL: 'Travel',
  LEAVE: 'Leave',
  ASSET: 'Asset',
  SHIFT_SWAP: 'Shift swap',
  TRAINING: 'Training',
  EQUIPMENT: 'Equipment',
  IT_SUPPORT: 'IT support',
};

/** Capitalize first letter of a string */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─────────────────────────────────────────────────────────────
// GET — Predict approval likelihood for a request type
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type');
      const priority = searchParams.get('priority');
      const amountParam = searchParams.get('amount');
      const departmentId = searchParams.get('departmentId');

      // ── Validate required params ──────────────────────────────
      if (!type) {
        return NextResponse.json(
          { status: 'error', message: 'Query param "type" is required' },
          { status: 400 }
        );
      }

      const normalizedType = type.toUpperCase();

      // ── Build where clause ────────────────────────────────────
      // Look at historical requests from the same user OR same department
      const where: Record<string, unknown> = {
        type: normalizedType,
        status: { in: ['APPROVED', 'REJECTED'] }, // Only resolved requests
      };

      // Scope to user's department if provided or auto-detected
      let effectiveDeptId = departmentId || null;
      if (!effectiveDeptId) {
        const userRecord = await db.user.findUnique({
          where: { id: user.userId },
          select: { departmentId: true },
        });
        effectiveDeptId = userRecord?.departmentId ?? null;
      }

      if (effectiveDeptId) {
        where.departmentId = effectiveDeptId;
      }

      // ── Fetch historical data ─────────────────────────────────
      const historicalRequests = await db.request.findMany({
        where,
        select: {
          id: true,
          status: true,
          amount: true,
          priority: true,
          createdAt: true,
          reviewedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // ── Also fetch from the same user for personal context ────
      const personalRequests = await db.request.findMany({
        where: {
          type: normalizedType,
          userId: user.userId,
          status: { in: ['APPROVED', 'REJECTED'] },
        },
        select: {
          id: true,
          status: true,
          amount: true,
          priority: true,
          createdAt: true,
          reviewedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Combine datasets (personal may overlap with department)
      const seenIds = new Set<string>();
      const allRequests = [...personalRequests, ...historicalRequests].filter((r) => {
        if (seenIds.has(r.id)) return false;
        seenIds.add(r.id);
        return true;
      });

      const approved = allRequests.filter((r) => r.status === 'APPROVED').length;
      const rejected = allRequests.filter((r) => r.status === 'REJECTED').length;
      const totalSimilar = allRequests.length;

      // ── Base approval rate ────────────────────────────────────
      let approvalRate = totalSimilar > 0
        ? Math.round((approved / totalSimilar) * 100)
        : 50; // default 50% when no data

      // ── Average days to decision ──────────────────────────────
      const resolvedWithDates = allRequests.filter((r) => r.reviewedAt && r.createdAt);
      let avgDaysToDecision = 0;
      if (resolvedWithDates.length > 0) {
        const totalDays = resolvedWithDates.reduce((sum, r) => {
          const ms = new Date(r.reviewedAt!).getTime() - new Date(r.createdAt).getTime();
          return sum + ms / (1000 * 60 * 60 * 24);
        }, 0);
        avgDaysToDecision = Math.round((totalDays / resolvedWithDates.length) * 10) / 10;
      }

      // ── Factor in amount & priority adjustments ───────────────
      let adjustment = 0;
      const amount = amountParam ? parseFloat(amountParam) : null;
      const normalizedPriority = (priority || 'MEDIUM').toUpperCase();

      // Priority boost
      adjustment += PRIORITY_BOOST[normalizedPriority] || 0;

      // Amount penalty — higher amounts tend to have lower approval
      if (amount !== null && !isNaN(amount) && amount > 0) {
        for (const tier of AMOUNT_TIERS) {
          if (amount <= tier.ceiling) {
            adjustment += tier.penalty;
            break;
          }
        }
      }

      // ── Insufficient data handling ────────────────────────────
      const insufficientData = totalSimilar < 3;
      if (insufficientData) {
        // Blend toward a conservative default (50%) when we have limited data
        const weight = totalSimilar / 3; // 0 → 0.667
        approvalRate = Math.round(approvalRate * weight + 50 * (1 - weight));
      }

      // Apply adjustment and clamp to 0–100
      approvalRate = Math.max(0, Math.min(100, approvalRate + adjustment));

      // ── Generate contextual tip ───────────────────────────────
      const typeLabel = TYPE_LABELS[normalizedType] || capitalize(normalizedType);
      let tip = '';

      if (insufficientData) {
        tip = `Limited historical data for ${typeLabel.toLowerCase()} requests. ` +
          `The predicted rate is based on general trends — submit your request for a more accurate assessment over time.`;
      } else if (amount !== null && !isNaN(amount) && amount > 0) {
        // Find the amount tier for the tip
        const tier = AMOUNT_TIERS.find((t) => amount <= t.ceiling);
        if (tier && amount <= 500) {
          tip = `${typeLabel} requests under ${tier.label} have a ${Math.min(approvalRate + 5, 100)}% approval rate in your department.`;
        } else if (tier) {
          // Check if lower amounts do better
          const lowerAmountRequests = allRequests.filter((r) => r.amount !== null && r.amount <= (tier.ceiling * 0.5));
          const lowerApproved = lowerAmountRequests.filter((r) => r.status === 'APPROVED').length;
          if (lowerAmountRequests.length >= 2) {
            const lowerRate = Math.round((lowerApproved / lowerAmountRequests.length) * 100);
            tip = `${typeLabel} requests under ${tier.label} are approved ${lowerRate}% of the time. Consider splitting large requests if possible.`;
          } else {
            tip = `${typeLabel} requests over $500 tend to take longer to review and have lower approval rates. Ensure your justification is thorough.`;
          }
        }
      } else if (avgDaysToDecision > 0) {
        const dayWord = avgDaysToDecision === 1 ? 'day' : 'days';
        tip = `${typeLabel} requests typically take about ${avgDaysToDecision} ${dayWord} to review in your department.`;
      } else {
        tip = `${typeLabel} requests have an overall approval rate of ${approvalRate}% based on ${totalSimilar} historical requests.`;
      }

      // Priority-specific advice
      if (normalizedPriority === 'URGENT' && !insufficientData) {
        tip += ' Urgent requests are generally prioritized but still require proper justification.';
      } else if (normalizedPriority === 'LOW' && !insufficientData) {
        tip += ' Low-priority requests may experience longer review times.';
      }

      // ── Return response ───────────────────────────────────────
      return NextResponse.json({
        status: 'success',
        data: {
          approvalRate,
          totalSimilar,
          approved,
          rejected,
          avgDaysToDecision,
          tip,
        },
      });
    } catch (error) {
      console.error('Approval prediction error:', error);
      return NextResponse.json(
        { status: 'error', message: 'Failed to generate approval prediction' },
        { status: 500 }
      );
    }
  });
}
