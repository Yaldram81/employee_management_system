import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Generate comprehensive HRM demo data (kept as fallback for seeding)
function generateHRMData(departments: { id: string; name: string }[], users: { id: string; name: string; email: string }[]) {
  const deptMap: Record<string, string> = {};
  departments.forEach((d) => { deptMap[d.id] = d.name; });

  // Job Postings
  const jobPostings = [
    { id: 'jp1', title: 'Senior Frontend Developer', departmentId: departments[0]?.id || '', departmentName: deptMap[departments[0]?.id] || 'Engineering', type: 'FULL_TIME', status: 'OPEN', salaryMin: 18000, salaryMax: 25000, location: 'On-site', experience: '5+ years', skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'], description: 'Lead frontend development for our enterprise platform', postedDate: getPastDate(5), closingDate: getPastDate(-25), applicantCount: 12, createdAt: getPastDate(5) },
    { id: 'jp2', title: 'UI/UX Designer', departmentId: departments[1]?.id || '', departmentName: deptMap[departments[1]?.id] || 'Design', type: 'FULL_TIME', status: 'OPEN', salaryMin: 14000, salaryMax: 20000, location: 'Hybrid', experience: '3+ years', skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'], description: 'Create beautiful and intuitive user experiences', postedDate: getPastDate(3), closingDate: getPastDate(-20), applicantCount: 8, createdAt: getPastDate(3) },
    { id: 'jp3', title: 'DevOps Engineer', departmentId: departments[0]?.id || '', departmentName: deptMap[departments[0]?.id] || 'Engineering', type: 'FULL_TIME', status: 'OPEN', salaryMin: 20000, salaryMax: 28000, location: 'Remote', experience: '4+ years', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'], description: 'Build and maintain cloud infrastructure', postedDate: getPastDate(10), closingDate: getPastDate(-15), applicantCount: 6, createdAt: getPastDate(10) },
    { id: 'jp4', title: 'Marketing Specialist', departmentId: departments[2]?.id || '', departmentName: deptMap[departments[2]?.id] || 'Marketing', type: 'FULL_TIME', status: 'OPEN', salaryMin: 10000, salaryMax: 15000, location: 'On-site', experience: '2+ years', skills: ['SEO', 'Content Strategy', 'Analytics', 'Social Media'], description: 'Drive marketing campaigns and brand awareness', postedDate: getPastDate(7), closingDate: getPastDate(-30), applicantCount: 15, createdAt: getPastDate(7) },
    { id: 'jp5', title: 'HR Business Partner', departmentId: departments[3]?.id || '', departmentName: deptMap[departments[3]?.id] || 'HR', type: 'FULL_TIME', status: 'OPEN', salaryMin: 16000, salaryMax: 22000, location: 'On-site', experience: '5+ years', skills: ['Employee Relations', 'Talent Management', 'HRIS', 'Compliance'], description: 'Strategic HR partner for business units', postedDate: getPastDate(14), closingDate: getPastDate(-10), applicantCount: 4, createdAt: getPastDate(14) },
    { id: 'jp6', title: 'Backend Developer (Intern)', departmentId: departments[0]?.id || '', departmentName: deptMap[departments[0]?.id] || 'Engineering', type: 'INTERNSHIP', status: 'DRAFT', salaryMin: 4000, salaryMax: 6000, location: 'On-site', experience: 'Student', skills: ['Node.js', 'Python', 'SQL', 'REST APIs'], description: 'Summer internship program for backend development', postedDate: getPastDate(1), closingDate: getPastDate(-45), applicantCount: 0, createdAt: getPastDate(1) },
    { id: 'jp7', title: 'Financial Analyst', departmentId: departments[4]?.id || '', departmentName: deptMap[departments[4]?.id] || 'Finance', type: 'FULL_TIME', status: 'OPEN', salaryMin: 15000, salaryMax: 21000, location: 'Hybrid', experience: '3+ years', skills: ['Financial Modeling', 'Excel', 'SAP', 'Reporting'], description: 'Financial planning and analysis', postedDate: getPastDate(20), closingDate: getPastDate(-5), applicantCount: 3, createdAt: getPastDate(20) },
    { id: 'jp8', title: 'Product Manager', departmentId: departments[0]?.id || '', departmentName: deptMap[departments[0]?.id] || 'Engineering', type: 'FULL_TIME', status: 'FILLED', salaryMin: 22000, salaryMax: 30000, location: 'Hybrid', experience: '6+ years', skills: ['Product Strategy', 'Agile', 'Data Analysis', 'Roadmapping'], description: 'Lead product vision and strategy', postedDate: getPastDate(30), closingDate: getPastDate(2), applicantCount: 9, createdAt: getPastDate(30) },
  ];

  // Candidates
  const candidateNames = [
    { name: 'David Chen', email: 'david.chen@email.com', source: 'LINKEDIN' },
    { name: 'Maria Garcia', email: 'maria.g@email.com', source: 'REFERRAL' },
    { name: 'Ahmed Hassan', email: 'ahmed.h@email.com', source: 'WEBSITE' },
    { name: 'Sarah Kim', email: 'sarah.k@email.com', source: 'JOB_BOARD' },
    { name: 'Tom Wilson', email: 'tom.w@email.com', source: 'AGENCY' },
    { name: 'Priya Patel', email: 'priya.p@email.com', source: 'LINKEDIN' },
    { name: 'Alex Johnson', email: 'alex.j@email.com', source: 'REFERRAL' },
    { name: 'Lisa Wang', email: 'lisa.w@email.com', source: 'WEBSITE' },
    { name: 'James Brown', email: 'james.b@email.com', source: 'JOB_BOARD' },
    { name: 'Emma Davis', email: 'emma.d@email.com', source: 'OTHER' },
    { name: 'Ryan Murphy', email: 'ryan.m@email.com', source: 'LINKEDIN' },
    { name: 'Fatima Al-Rashid', email: 'fatima.a@email.com', source: 'REFERRAL' },
  ];

  const candidates = candidateNames.map((c, i) => ({
    id: `cand-${i + 1}`,
    name: c.name,
    email: c.email,
    phone: `+1-555-${String(1000 + i * 111).slice(-4)}`,
    jobPostingId: jobPostings[i % jobPostings.length].id,
    jobTitle: jobPostings[i % jobPostings.length].title,
    stage: (['APPLIED', 'SCREENING', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'HIRED', 'REJECTED'] as const)[i % 7],
    rating: Math.min(5, Math.max(1, 3 + Math.floor(Math.random() * 3))),
    source: c.source,
    appliedDate: getPastDate(Math.floor(Math.random() * 20) + 1),
    notes: i === 2 ? 'Strong technical background, good culture fit' : i === 5 ? 'Excellent portfolio, referred by VP' : undefined,
  }));

  // Training Programs
  const trainingPrograms = [
    { id: 'tp1', title: 'Advanced React Patterns', description: 'Deep dive into advanced React patterns and performance optimization', category: 'TECHNICAL', format: 'ONLINE', duration: '4 weeks', enrollmentCount: 12, maxEnrollment: 20, rating: 4.5, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(7), endDate: getPastDate(-21), instructor: 'Sarah Chen', createdAt: getPastDate(14) },
    { id: 'tp2', title: 'Leadership Excellence Program', description: 'Develop leadership skills for aspiring managers', category: 'LEADERSHIP', format: 'HYBRID', duration: '8 weeks', enrollmentCount: 8, maxEnrollment: 15, rating: 4.8, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(14), endDate: getPastDate(-42), instructor: 'External Coach', createdAt: getPastDate(20) },
    { id: 'tp3', title: 'Workplace Safety & Compliance', description: 'Annual safety and regulatory compliance training', category: 'COMPLIANCE', format: 'ONLINE', duration: '2 days', enrollmentCount: 45, maxEnrollment: 100, rating: 3.8, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(3), endDate: getPastDate(-4), instructor: 'HR Department', createdAt: getPastDate(10) },
    { id: 'tp4', title: 'Effective Communication Skills', description: 'Improve interpersonal communication and presentation skills', category: 'SOFT_SKILLS', format: 'IN_PERSON', duration: '3 days', enrollmentCount: 15, maxEnrollment: 25, rating: 4.2, status: 'UPCOMING', hasCertification: false, startDate: getPastDate(-10), instructor: 'Communication Lab', createdAt: getPastDate(5) },
    { id: 'tp5', title: 'Cloud Architecture Certification', description: 'AWS Solutions Architect certification prep course', category: 'TECHNICAL', format: 'SELF_PACED', duration: '12 weeks', enrollmentCount: 6, maxEnrollment: 10, rating: 4.9, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(21), endDate: getPastDate(-63), instructor: 'Cloud Academy', createdAt: getPastDate(30) },
    { id: 'tp6', title: 'Fire Safety Drill', description: 'Annual fire safety and emergency evacuation procedures', category: 'SAFETY', format: 'IN_PERSON', duration: '1 day', enrollmentCount: 50, rating: 3.5, status: 'COMPLETED', hasCertification: false, startDate: getPastDate(30), endDate: getPastDate(29), instructor: 'Safety Officer', createdAt: getPastDate(35) },
    { id: 'tp7', title: 'New Hire Orientation', description: 'Comprehensive onboarding training for new employees', category: 'ONBOARDING', format: 'HYBRID', duration: '1 week', enrollmentCount: 3, maxEnrollment: 20, rating: 4.0, status: 'ACTIVE', hasCertification: false, startDate: getPastDate(5), endDate: getPastDate(-2), instructor: 'HR Team', createdAt: getPastDate(10) },
  ];

  // Onboarding Plans
  const onboardingPlans = [
    {
      id: 'ob1', userId: users[4]?.id || '', employeeName: users[4]?.name || 'Michael Brown', email: users[4]?.email || '', departmentName: 'Design',
      startDate: getPastDate(14), endDate: getPastDate(-14), progress: 75, status: 'IN_PROGRESS',
      buddyId: users[1]?.id, buddyName: users[1]?.name || 'Sarah Chen',
      mentorId: users[0]?.id, mentorName: users[0]?.name || 'Alex Morgan',
      tasks: [
        { id: 'obt1', title: 'Complete HR documentation', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1 },
        { id: 'obt2', title: 'Set up development environment', category: 'SETUP', isCompleted: true, dueDay: 2 },
        { id: 'obt3', title: 'Company culture orientation', category: 'INTRODUCTION', isCompleted: true, dueDay: 3 },
        { id: 'obt4', title: 'Design system walkthrough', category: 'TRAINING', isCompleted: true, dueDay: 5 },
        { id: 'obt5', title: 'Meet cross-functional team', category: 'INTRODUCTION', isCompleted: false, dueDay: 7 },
        { id: 'obt6', title: 'First project assignment', category: 'TRAINING', isCompleted: false, dueDay: 10 },
        { id: 'obt7', title: '30-day performance review', category: 'REVIEW', isCompleted: false, dueDay: 30 },
      ],
      createdAt: getPastDate(14),
    },
    {
      id: 'ob2', userId: users[5]?.id || '', employeeName: users[5]?.name || 'Lisa Taylor', email: users[5]?.email || '', departmentName: 'Marketing',
      startDate: getPastDate(7), endDate: getPastDate(-21), progress: 40, status: 'IN_PROGRESS',
      buddyId: users[3]?.id, buddyName: users[3]?.name || 'Emily Park',
      mentorId: users[1]?.id, mentorName: users[1]?.name || 'Sarah Chen',
      tasks: [
        { id: 'obt8', title: 'Complete HR documentation', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1 },
        { id: 'obt9', title: 'Set up marketing tools', category: 'SETUP', isCompleted: true, dueDay: 2 },
        { id: 'obt10', title: 'Brand guidelines training', category: 'TRAINING', isCompleted: false, dueDay: 5 },
        { id: 'obt11', title: 'Content strategy overview', category: 'TRAINING', isCompleted: false, dueDay: 7 },
        { id: 'obt12', title: '30-day performance review', category: 'REVIEW', isCompleted: false, dueDay: 30 },
      ],
      createdAt: getPastDate(7),
    },
    {
      id: 'ob3', employeeName: 'Pending Hire — DevOps', email: 'devops@new.com', departmentName: 'Engineering',
      startDate: getPastDate(-7), progress: 0, status: 'NOT_STARTED',
      tasks: [
        { id: 'obt13', title: 'Complete HR documentation', category: 'DOCUMENTATION', isCompleted: false, dueDay: 1 },
        { id: 'obt14', title: 'Set up development environment', category: 'SETUP', isCompleted: false, dueDay: 2 },
        { id: 'obt15', title: 'Security training', category: 'TRAINING', isCompleted: false, dueDay: 5 },
        { id: 'obt16', title: 'Meet engineering team', category: 'INTRODUCTION', isCompleted: false, dueDay: 3 },
      ],
      createdAt: getPastDate(2),
    },
  ];

  // Performance Reviews
  const performanceReviews = [
    { id: 'pr1', userId: users[2]?.id || '', userName: users[2]?.name || 'James Wilson', userEmail: users[2]?.email || '', userDepartment: 'Engineering', cycleName: 'Q1 2026 Review', status: 'COMPLETED', rating: 4, goalScore: 85, competencyScore: 88, reviewerId: users[1]?.id, reviewerName: users[1]?.name || 'Sarah Chen', dueDate: getPastDate(10), completedAt: getPastDate(8), createdAt: getPastDate(30) },
    { id: 'pr2', userId: users[3]?.id || '', userName: users[3]?.name || 'Emily Park', userEmail: users[3]?.email || '', userDepartment: 'Engineering', cycleName: 'Q1 2026 Review', status: 'MANAGER_REVIEW', rating: 4.5, goalScore: 92, competencyScore: 90, reviewerId: users[1]?.id, reviewerName: users[1]?.name || 'Sarah Chen', dueDate: getPastDate(-5), createdAt: getPastDate(30) },
    { id: 'pr3', userId: users[4]?.id || '', userName: users[4]?.name || 'Michael Brown', userEmail: users[4]?.email || '', userDepartment: 'Design', cycleName: 'Q1 2026 Review', status: 'SELF_ASSESSMENT', rating: 0, dueDate: getPastDate(-3), createdAt: getPastDate(30) },
    { id: 'pr4', userId: users[5]?.id || '', userName: users[5]?.name || 'Lisa Taylor', userEmail: users[5]?.email || '', userDepartment: 'Marketing', cycleName: 'Q1 2026 Review', status: 'CALIBRATION', rating: 3.5, goalScore: 78, competencyScore: 82, reviewerId: users[0]?.id, reviewerName: users[0]?.name || 'Alex Morgan', dueDate: getPastDate(-1), createdAt: getPastDate(30) },
    { id: 'pr5', userId: users[1]?.id || '', userName: users[1]?.name || 'Sarah Chen', userEmail: users[1]?.email || '', userDepartment: 'Engineering', cycleName: 'Q1 2026 Review', status: 'COMPLETED', rating: 4.8, goalScore: 95, competencyScore: 93, reviewerId: users[0]?.id, reviewerName: users[0]?.name || 'Alex Morgan', dueDate: getPastDate(10), completedAt: getPastDate(7), createdAt: getPastDate(30) },
    { id: 'pr6', userId: users[2]?.id || '', userName: users[2]?.name || 'James Wilson', userEmail: users[2]?.email || '', userDepartment: 'Engineering', cycleName: 'Q2 2026 Review', status: 'NOT_STARTED', rating: 0, dueDate: getPastDate(-30), createdAt: getPastDate(5) },
    { id: 'pr7', userId: users[3]?.id || '', userName: users[3]?.name || 'Emily Park', userEmail: users[3]?.email || '', userDepartment: 'Engineering', cycleName: 'Q2 2026 Review', status: 'NOT_STARTED', rating: 0, dueDate: getPastDate(-30), createdAt: getPastDate(5) },
  ];

  // Lifecycle Events
  const lifecycleEvents = [
    { id: 'le1', userId: users[4]?.id || '', employeeName: users[4]?.name || 'Michael Brown', email: users[4]?.email || '', userDepartment: 'Design', type: 'HIRE', status: 'COMPLETED', effectiveDate: getPastDate(14), details: 'New hire as UI Designer', toValue: 'UI Designer', approvedById: users[0]?.id, approvedByName: users[0]?.name || 'Alex Morgan', approvedAt: getPastDate(15), createdAt: getPastDate(20) },
    { id: 'le2', userId: users[5]?.id || '', employeeName: users[5]?.name || 'Lisa Taylor', email: users[5]?.email || '', userDepartment: 'Marketing', type: 'HIRE', status: 'COMPLETED', effectiveDate: getPastDate(7), details: 'New hire as Marketing Specialist', toValue: 'Marketing Specialist', approvedById: users[0]?.id, approvedByName: users[0]?.name || 'Alex Morgan', approvedAt: getPastDate(8), createdAt: getPastDate(12) },
    { id: 'le3', userId: users[2]?.id || '', employeeName: users[2]?.name || 'James Wilson', email: users[2]?.email || '', userDepartment: 'Engineering', type: 'PROMOTION', status: 'PENDING', effectiveDate: getPastDate(-7), details: 'Promotion to Senior Developer', fromValue: 'Developer', toValue: 'Senior Developer', createdAt: getPastDate(3) },
    { id: 'le4', userId: users[3]?.id || '', employeeName: users[3]?.name || 'Emily Park', email: users[3]?.email || '', userDepartment: 'Engineering', type: 'TRANSFER', status: 'PENDING', effectiveDate: getPastDate(-14), details: 'Transfer to Backend Team', fromValue: 'Frontend Team', toValue: 'Backend Team', createdAt: getPastDate(5) },
    { id: 'le5', employeeName: 'Robert Martinez', email: 'robert.m@former.com', userDepartment: 'Finance', type: 'RESIGNATION', status: 'APPROVED', effectiveDate: getPastDate(5), details: 'Resigned for personal reasons', approvedById: users[0]?.id, approvedByName: users[0]?.name || 'Alex Morgan', approvedAt: getPastDate(4), createdAt: getPastDate(12) },
    { id: 'le6', userId: users[1]?.id || '', employeeName: users[1]?.name || 'Sarah Chen', email: users[1]?.email || '', userDepartment: 'Engineering', type: 'PROMOTION', status: 'COMPLETED', effectiveDate: getPastDate(60), details: 'Promoted to Engineering Manager', fromValue: 'Senior Developer', toValue: 'Engineering Manager', approvedById: users[0]?.id, approvedByName: users[0]?.name || 'Alex Morgan', approvedAt: getPastDate(62), createdAt: getPastDate(65) },
    { id: 'le7', employeeName: 'Pending — DevOps Engineer', email: 'devops@pending.com', userDepartment: 'Engineering', type: 'HIRE', status: 'PENDING', effectiveDate: getPastDate(-7), details: 'Offer accepted, pending onboarding', toValue: 'DevOps Engineer', createdAt: getPastDate(2) },
  ];

  return { jobPostings, candidates, onboardingPlans, trainingPrograms, performanceReviews, lifecycleEvents };
}

// GET /api/hrm - Read all HRM data from database
export async function GET() {
  try {
    const [
      jobPostings,
      candidates,
      trainingPrograms,
      onboardingPlans,
      performanceReviews,
      lifecycleEvents,
    ] = await Promise.all([
      db.jobPosting.findMany({
        include: {
          department: { select: { id: true, name: true, color: true } },
          _count: { select: { candidates: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.candidate.findMany({
        include: {
          jobPosting: {
            select: { id: true, title: true, department: { select: { id: true, name: true } }, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.trainingProgram.findMany({
        include: {
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.onboardingPlan.findMany({
        include: {
          department: { select: { id: true, name: true, color: true } },
          buddy: { select: { id: true, name: true, email: true, position: true } },
          mentor: { select: { id: true, name: true, email: true, position: true } },
          tasks: { orderBy: { dueDay: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.performanceReview.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
          reviewer: { select: { id: true, name: true, email: true, position: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.lifecycleEvent.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, position: true, department: { select: { id: true, name: true } } } },
          department: { select: { id: true, name: true, color: true } },
          approver: { select: { id: true, name: true, email: true, position: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // If no data exists in the database, fall back to generated demo data
    const hasData = jobPostings.length > 0 || candidates.length > 0 || trainingPrograms.length > 0;

    if (!hasData) {
      const departments = await db.department.findMany();
      const users = await db.user.findMany({ include: { department: true } });
      const fallbackData = generateHRMData(departments, users);
      return NextResponse.json({ status: 'success', data: fallbackData, source: 'demo' });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        jobPostings,
        candidates,
        trainingPrograms,
        onboardingPlans,
        performanceReviews,
        lifecycleEvents,
      },
      source: 'database',
    });
  } catch (error) {
    console.error('HRM API error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to load HRM data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Handle HRM actions (move candidate, approve lifecycle, etc.)
    if (action === 'move-candidate') {
      const { candidateId, stage } = body;
      if (!candidateId || !stage) {
        return NextResponse.json(
          { status: 'error', message: 'Candidate ID and stage are required' },
          { status: 400 }
        );
      }
      const candidate = await db.candidate.update({
        where: { id: candidateId },
        data: { stage },
      });
      return NextResponse.json({ status: 'success', message: `Candidate moved to ${stage}`, data: candidate });
    }

    if (action === 'approve-lifecycle') {
      const { eventId, approvedById } = body;
      if (!eventId) {
        return NextResponse.json(
          { status: 'error', message: 'Event ID is required' },
          { status: 400 }
        );
      }
      const event = await db.lifecycleEvent.update({
        where: { id: eventId },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedById: approvedById || null },
      });
      return NextResponse.json({ status: 'success', message: 'Lifecycle event approved', data: event });
    }

    if (action === 'reject-lifecycle') {
      const { eventId, approvedById } = body;
      if (!eventId) {
        return NextResponse.json(
          { status: 'error', message: 'Event ID is required' },
          { status: 400 }
        );
      }
      const event = await db.lifecycleEvent.update({
        where: { id: eventId },
        data: { status: 'REJECTED', approvedAt: new Date(), approvedById: approvedById || null },
      });
      return NextResponse.json({ status: 'success', message: 'Lifecycle event rejected', data: event });
    }

    return NextResponse.json({ status: 'success', message: 'Action completed' });
  } catch (error) {
    console.error('HRM POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to process action' },
      { status: 500 }
    );
  }
}
