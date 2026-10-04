import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/* ── Tax Brackets (simplified US-style progressive) ────────── */
const TAX_BRACKETS = [
  { min: 0, max: 11000, rate: 0.10 },
  { min: 11000, max: 44725, rate: 0.12 },
  { min: 44725, max: 95375, rate: 0.22 },
  { min: 95375, max: 182050, rate: 0.24 },
  { min: 182050, max: 231250, rate: 0.32 },
  { min: 231250, max: 578125, rate: 0.35 },
  { min: 578125, max: Infinity, rate: 0.37 },
];

function calculateProgressiveTax(annualIncome: number): number {
  let tax = 0;
  for (const bracket of TAX_BRACKETS) {
    if (annualIncome <= bracket.min) break;
    const taxable = Math.min(annualIncome, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return Math.round(tax * 100) / 100;
}

/* ── Market Benchmark Data (realistic mock) ──────────────────── */
const MARKET_DATA: Record<string, { p10: number; p25: number; p50: number; p75: number; p90: number }> = {
  'Software Engineer': { p10: 72000, p25: 90000, p50: 115000, p75: 145000, p90: 180000 },
  'Senior Engineer': { p10: 105000, p25: 125000, p50: 155000, p75: 190000, p90: 230000 },
  'Product Manager': { p10: 85000, p25: 105000, p50: 130000, p75: 165000, p90: 200000 },
  'Designer': { p10: 60000, p25: 75000, p50: 95000, p75: 120000, p90: 150000 },
  'Marketing Specialist': { p10: 50000, p25: 62000, p50: 78000, p75: 95000, p90: 115000 },
  'HR Manager': { p10: 55000, p25: 68000, p50: 85000, p75: 105000, p90: 130000 },
  'Data Analyst': { p10: 58000, p25: 72000, p50: 92000, p75: 115000, p90: 140000 },
  'DevOps Engineer': { p10: 80000, p25: 100000, p50: 128000, p75: 160000, p90: 195000 },
  'QA Engineer': { p10: 55000, p25: 68000, p50: 85000, p75: 108000, p90: 130000 },
  'Sales Executive': { p10: 48000, p25: 60000, p50: 78000, p75: 100000, p90: 135000 },
  'Administrator': { p10: 40000, p25: 50000, p50: 62000, p75: 78000, p90: 95000 },
  'Executive': { p10: 120000, p25: 155000, p50: 200000, p75: 260000, p90: 350000 },
};

const DEFAULT_BENCHMARK = { p10: 50000, p25: 65000, p50: 85000, p75: 110000, p90: 140000 };

function getMarketPercentile(salary: number, benchmark: { p10: number; p25: number; p50: number; p75: number; p90: number }): number {
  if (salary <= benchmark.p10) return 5;
  if (salary <= benchmark.p25) return 10 + ((salary - benchmark.p10) / (benchmark.p25 - benchmark.p10)) * 15;
  if (salary <= benchmark.p50) return 25 + ((salary - benchmark.p25) / (benchmark.p50 - benchmark.p25)) * 25;
  if (salary <= benchmark.p75) return 50 + ((salary - benchmark.p50) / (benchmark.p75 - benchmark.p50)) * 25;
  if (salary <= benchmark.p90) return 75 + ((salary - benchmark.p75) / (benchmark.p90 - benchmark.p75)) * 15;
  return 90 + Math.min(((salary - benchmark.p90) / (benchmark.p90 * 0.5)) * 10, 10);
}

/* ── GET: Fetch investment declarations ─────────────────────── */
export async function GET(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');

      /* ── Get investment declarations ──────────── */
      if (action === 'investments') {
        const fiscalYear = searchParams.get('fiscalYear') || getCurrentFiscalYear();
        const declarations = await db.investmentDeclaration.findMany({
          where: { userId: user.userId, fiscalYear },
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { id: true, name: true } },
          },
        });

        const normalized = declarations.map(d => ({
          id: d.id,
          userId: d.userId,
          category: d.category.toLowerCase().replace(/_/g, '-'),
          description: d.description,
          amount: d.amount,
          proofUrl: d.proofUrl,
          proofName: d.proofName,
          fiscalYear: d.fiscalYear,
          status: d.status.toLowerCase(),
          reviewedBy: d.reviewedBy,
          reviewerName: (d.reviewer as any)?.name || null,
          reviewedAt: d.reviewedAt?.toISOString(),
          reviewComment: d.reviewComment,
          submittedAt: d.submittedAt.toISOString(),
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        }));

        return NextResponse.json({ status: 'success', data: normalized });
      }

      /* ── Get optimization tips ────────────────── */
      if (action === 'optimization-tips') {
        const structure = await db.salaryStructure.findFirst({
          where: { userId: user.userId, isActive: true },
        });
        const baseSalary = structure?.baseSalary || user.salary || 0;
        const annualSalary = baseSalary * 12;
        const currentTax = calculateProgressiveTax(annualSalary);
        const providentFundRate = structure?.providentFundRate || 6;
        const currentPF = baseSalary * (providentFundRate / 100);

        // Check existing investments
        const fiscalYear = getCurrentFiscalYear();
        const existingInvestments = await db.investmentDeclaration.findMany({
          where: { userId: user.userId, fiscalYear, status: { in: ['PENDING', 'APPROVED'] } },
        });
        const totalDeclared = existingInvestments.reduce((s, i) => s + i.amount, 0);

        const tips = generateOptimizationTips(annualSalary, currentTax, currentPF, totalDeclared, providentFundRate);

        return NextResponse.json({ status: 'success', data: tips });
      }

      /* ── Get market benchmarks ────────────────── */
      if (action === 'benchmarks') {
        const empUser = await db.user.findUnique({
          where: { id: user.userId },
          include: { department: { select: { name: true } } },
        });

        const position = empUser?.position || 'Employee';
        const department = empUser?.department?.name || 'General';
        const salary = empUser?.salary || 0;
        const annualSalary = salary * 12;

        // Find closest matching benchmark
        let benchmark = DEFAULT_BENCHMARK;
        let matchedPosition = position;
        for (const [key, data] of Object.entries(MARKET_DATA)) {
          if (position.toLowerCase().includes(key.toLowerCase().split(' ')[0]) ||
              key.toLowerCase().includes(position.toLowerCase().split(' ')[0])) {
            benchmark = data;
            matchedPosition = key;
            break;
          }
        }

        const percentile = getMarketPercentile(annualSalary, benchmark);

        // Also compute department averages from DB
        const deptUsers = await db.user.findMany({
          where: { departmentId: empUser?.departmentId, isActive: true },
          select: { salary: true, position: true },
        });
        const deptSalaries = deptUsers.map(u => (u.salary || 0) * 12).filter(s => s > 0);
        const deptAvg = deptSalaries.length > 0 ? deptSalaries.reduce((a, b) => a + b, 0) / deptSalaries.length : 0;

        const result = {
          position: matchedPosition,
          department,
          p10: benchmark.p10,
          p25: benchmark.p25,
          p50: benchmark.p50,
          p75: benchmark.p75,
          p90: benchmark.p90,
          yourSalary: annualSalary,
          percentile: Math.round(percentile),
          deptAvg: Math.round(deptAvg),
          deptSize: deptUsers.length,
        };

        return NextResponse.json({ status: 'success', data: result });
      }

      return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
    } catch (error) {
      console.error('Tax Simulator GET error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to fetch data' }, { status: 500 });
    }
  });
}

/* ── POST: Simulate tax, create investment declarations ─────── */
export async function POST(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { action } = body;

      /* ── What-if Tax Simulation ────────────────── */
      if (action === 'simulate') {
        const { raiseAmount, raiseType, additional401k, additionalHSA } = body;
        const structure = await db.salaryStructure.findFirst({
          where: { userId: user.userId, isActive: true },
        });

        const currentBase = structure?.baseSalary || user.salary || 0;
        const allowances = (structure?.housingAllowance || 0) + (structure?.transportAllowance || 0) +
          (structure?.medicalAllowance || 0) + (structure?.foodAllowance || 0) + (structure?.otherAllowances || 0);
        const taxRate = structure?.taxPercentage || 10;
        const insuranceRate = structure?.insuranceRate || 2.5;
        const pfRate = structure?.providentFundRate || 6;

        // Current monthly calculation
        const currentGross = currentBase + allowances;
        const currentTax = currentBase * (taxRate / 100);
        const currentInsurance = currentBase * (insuranceRate / 100);
        const currentPF = currentBase * (pfRate / 100);
        const currentDeductions = currentTax + currentInsurance + currentPF;
        const currentNet = currentGross - currentDeductions;

        // New base after raise
        const raise = raiseType === 'percent' ? currentBase * (raiseAmount / 100) : raiseAmount;
        const newBase = currentBase + raise;
        const newAllowances = allowances; // Allowances stay the same
        const newGross = newBase + newAllowances;

        // Recalculate tax with progressive system for the annual raise impact
        const annualNewTax = calculateProgressiveTax(newBase * 12);
        const monthlyNewTax = Math.round(annualNewTax / 12 * 100) / 100;
        const newInsurance = newBase * (insuranceRate / 100);

        // Additional voluntary deductions
        const additional401kMonthly = (additional401k || 0) / 12;
        const additionalHSAMonthly = (additionalHSA || 0) / 12;
        const newPF = newBase * (pfRate / 100) + additional401kMonthly;

        const newDeductions = monthlyNewTax + newInsurance + newPF + additionalHSAMonthly;
        const newNet = newGross - newDeductions;

        const result = {
          currentGross: Math.round(currentGross * 100) / 100,
          currentDeductions: Math.round(currentDeductions * 100) / 100,
          currentTax: Math.round(currentTax * 100) / 100,
          currentNet: Math.round(currentNet * 100) / 100,
          newGross: Math.round(newGross * 100) / 100,
          newDeductions: Math.round(newDeductions * 100) / 100,
          newTax: Math.round(monthlyNewTax * 100) / 100,
          newNet: Math.round(newNet * 100) / 100,
          takeHomeChange: Math.round((newNet - currentNet) * 100) / 100,
          takeHomeChangePct: currentNet > 0 ? Math.round(((newNet - currentNet) / currentNet) * 100 * 10) / 10 : 0,
          breakdown: {
            baseSalary: Math.round(newBase * 100) / 100,
            allowances: Math.round(newAllowances * 100) / 100,
            tax: Math.round(monthlyNewTax * 100) / 100,
            insurance: Math.round(newInsurance * 100) / 100,
            providentFund: Math.round(newPF * 100) / 100,
            otherDeductions: Math.round(additionalHSAMonthly * 100) / 100,
          },
        };

        return NextResponse.json({ status: 'success', data: result });
      }

      /* ── Create Investment Declaration ─────────── */
      if (action === 'create-investment') {
        const { category, description, amount, proofUrl, proofName, fiscalYear } = body;

        if (!category || !description || !amount || !fiscalYear) {
          return NextResponse.json({ status: 'error', message: 'category, description, amount, and fiscalYear are required' }, { status: 400 });
        }

        const declaration = await db.investmentDeclaration.create({
          data: {
            userId: user.userId,
            category: category.toUpperCase().replace(/-/g, '_'),
            description,
            amount,
            proofUrl: proofUrl || null,
            proofName: proofName || null,
            fiscalYear,
            status: 'PENDING',
          },
        });

        return NextResponse.json({ status: 'success', message: 'Investment declaration submitted', data: declaration }, { status: 201 });
      }

      return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
    } catch (error) {
      console.error('Tax Simulator POST error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to process request' }, { status: 500 });
    }
  });
}

/* ── PATCH: Update investment declarations ──────────────────── */
export async function PATCH(request: NextRequest) {
  return requireAuth(request, async (user) => {
    try {
      const body = await request.json();
      const { id, action } = body;

      /* ── Delete investment declaration ─────────── */
      if (action === 'delete' && id) {
        const existing = await db.investmentDeclaration.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ status: 'error', message: 'Not found' }, { status: 404 });
        if (existing.userId !== user.userId) return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 403 });
        if (existing.status === 'APPROVED') return NextResponse.json({ status: 'error', message: 'Cannot delete approved declaration' }, { status: 400 });

        await db.investmentDeclaration.delete({ where: { id } });
        return NextResponse.json({ status: 'success', message: 'Investment declaration deleted' });
      }

      /* ── Review investment declaration (admin/manager) ─── */
      if (action === 'review' && id) {
        const { status: newStatus, reviewComment } = body;
        if (!['APPROVED', 'REJECTED'].includes(newStatus)) {
          return NextResponse.json({ status: 'error', message: 'Status must be APPROVED or REJECTED' }, { status: 400 });
        }

        const declaration = await db.investmentDeclaration.update({
          where: { id },
          data: {
            status: newStatus,
            reviewedBy: user.userId,
            reviewedAt: new Date(),
            reviewComment: reviewComment || null,
          },
        });

        return NextResponse.json({ status: 'success', message: `Declaration ${newStatus.toLowerCase()}`, data: declaration });
      }

      return NextResponse.json({ status: 'error', message: 'Invalid action' }, { status: 400 });
    } catch (error) {
      console.error('Tax Simulator PATCH error:', error);
      return NextResponse.json({ status: 'error', message: 'Failed to update' }, { status: 500 });
    }
  });
}

/* ── Helpers ────────────────────────────────────────────────── */

function getCurrentFiscalYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${(year + 1).toString().slice(-2)}`;
}

function generateOptimizationTips(
  annualSalary: number,
  currentTax: number,
  currentPF: number,
  totalDeclared: number,
  pfRate: number,
): Array<{
  id: string; title: string; description: string; potentialSaving: number;
  category: string; icon: string; priority: 'high' | 'medium' | 'low'; actionLabel: string;
}> {
  const tips: Array<{
    id: string; title: string; description: string; potentialSaving: number;
    category: string; icon: string; priority: 'high' | 'medium' | 'low'; actionLabel: string;
  }> = [];

  const max401k = 23000;
  const current401kAnnual = currentPF * 12;
  const remaining401k = Math.max(max401k - current401kAnnual, 0);

  if (remaining401k > 0) {
    const savingRate = annualSalary > 95375 ? 0.22 : annualSalary > 44725 ? 0.12 : 0.10;
    tips.push({
      id: 'tip-401k',
      title: 'Maximize 401(k) Contributions',
      description: `You can contribute up to ${formatMoney(max401k)} annually. You've contributed ${formatMoney(current401kAnnual)} so far. Increasing by ${formatMoney(remaining401k)} could save you ${formatMoney(remaining401k * savingRate)} in taxes.`,
      potentialSaving: Math.round(remaining401k * savingRate),
      category: '401k',
      icon: 'PiggyBank',
      priority: 'high',
      actionLabel: 'Increase 401(k)',
    });
  }

  const hsaLimit = 4150;
  tips.push({
    id: 'tip-hsa',
    title: 'Open an HSA Account',
    description: `Contributing ${formatMoney(hsaLimit)} to a Health Savings Account is triple tax-advantaged: deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses.`,
    potentialSaving: Math.round(hsaLimit * (annualSalary > 95375 ? 0.22 : 0.12)),
    category: 'hsa',
    icon: 'Heart',
    priority: 'high',
    actionLabel: 'Set Up HSA',
  });

  if (annualSalary > 80000) {
    const iraLimit = 7000;
    tips.push({
      id: 'tip-ira',
      title: 'Contribute to Traditional IRA',
      description: `You can deduct up to ${formatMoney(iraLimit)} in Traditional IRA contributions. This reduces your taxable income directly.`,
      potentialSaving: Math.round(iraLimit * (annualSalary > 95375 ? 0.22 : 0.12)),
      category: 'ira',
      icon: 'Landmark',
      priority: 'medium',
      actionLabel: 'Open IRA',
    });
  }

  if (totalDeclared < 2500) {
    tips.push({
      id: 'tip-charity',
      title: 'Donate to Charity',
      description: `Charitable donations are tax-deductible. Consider donating ${formatMoney(2500 - totalDeclared)} to reduce your taxable income while supporting causes you care about.`,
      potentialSaving: Math.round((2500 - totalDeclared) * (annualSalary > 95375 ? 0.22 : 0.12)),
      category: 'charity',
      icon: 'HeartHandshake',
      priority: 'medium',
      actionLabel: 'Donate Now',
    });
  }

  if (annualSalary > 100000) {
    tips.push({
      id: 'tip-fsa',
      title: 'Use Flexible Spending Account',
      description: 'Contribute up to $3,200 to an FSA for healthcare expenses. This is use-it-or-lose-it, but saves on taxes for predictable medical costs.',
      potentialSaving: Math.round(3200 * 0.22),
      category: 'fsa',
      icon: 'Shield',
      priority: 'low',
      actionLabel: 'Set Up FSA',
    });
  }

  tips.push({
    id: 'tip-dependent',
    title: 'Claim Dependent Care FSA',
    description: 'If you have dependents, contribute up to $5,000 for childcare expenses. This saves on taxes while covering daycare, preschool, or after-school programs.',
    potentialSaving: Math.round(5000 * (annualSalary > 95375 ? 0.22 : 0.12)),
    category: 'dependent',
    icon: 'Baby',
    priority: 'low',
    actionLabel: 'Learn More',
  });

  return tips.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function formatMoney(amount: number): string {
  return '$' + Math.round(amount).toLocaleString();
}
