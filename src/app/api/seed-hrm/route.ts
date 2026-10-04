import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// POST /api/seed-hrm - Seed all HRM tables with demo data
export async function POST() {
  try {
    // Get existing departments and users
    const departments = await db.department.findMany();
    const users = await db.user.findMany({ include: { department: true } });

    if (departments.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'No departments found. Please seed departments first.' },
        { status: 400 }
      );
    }

    if (users.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'No users found. Please seed users first.' },
        { status: 400 }
      );
    }

    // Clear existing HRM data (in reverse dependency order)
    await db.trainingEnrollment.deleteMany();
    await db.onboardingTask.deleteMany();
    await db.onboardingPlan.deleteMany();
    await db.candidate.deleteMany();
    await db.jobPosting.deleteMany();
    await db.performanceReview.deleteMany();
    await db.lifecycleEvent.deleteMany();
    await db.trainingProgram.deleteMany();

    const deptIds = departments.map((d) => d.id);
    const userIds = users.map((u) => u.id);

    // ─────────────────────────────────────────────
    // 1. Create 8 Job Postings
    // ─────────────────────────────────────────────
    const jobPostingsData = [
      { title: 'Senior Frontend Developer', departmentId: deptIds[0] || null, type: 'FULL_TIME', status: 'OPEN', salaryMin: 18000, salaryMax: 25000, location: 'On-site', experience: '5+ years', skills: JSON.stringify(['React', 'TypeScript', 'Next.js', 'Tailwind CSS']), description: 'Lead frontend development for our enterprise platform', postedDate: getPastDate(5), closingDate: getPastDate(-25), applicantCount: 12 },
      { title: 'UI/UX Designer', departmentId: deptIds[1] || null, type: 'FULL_TIME', status: 'OPEN', salaryMin: 14000, salaryMax: 20000, location: 'Hybrid', experience: '3+ years', skills: JSON.stringify(['Figma', 'Design Systems', 'User Research', 'Prototyping']), description: 'Create beautiful and intuitive user experiences', postedDate: getPastDate(3), closingDate: getPastDate(-20), applicantCount: 8 },
      { title: 'DevOps Engineer', departmentId: deptIds[0] || null, type: 'FULL_TIME', status: 'OPEN', salaryMin: 20000, salaryMax: 28000, location: 'Remote', experience: '4+ years', skills: JSON.stringify(['AWS', 'Docker', 'Kubernetes', 'CI/CD']), description: 'Build and maintain cloud infrastructure', postedDate: getPastDate(10), closingDate: getPastDate(-15), applicantCount: 6 },
      { title: 'Marketing Specialist', departmentId: deptIds[Math.min(2, deptIds.length - 1)] || null, type: 'FULL_TIME', status: 'OPEN', salaryMin: 10000, salaryMax: 15000, location: 'On-site', experience: '2+ years', skills: JSON.stringify(['SEO', 'Content Strategy', 'Analytics', 'Social Media']), description: 'Drive marketing campaigns and brand awareness', postedDate: getPastDate(7), closingDate: getPastDate(-30), applicantCount: 15 },
      { title: 'HR Business Partner', departmentId: deptIds[Math.min(3, deptIds.length - 1)] || null, type: 'FULL_TIME', status: 'OPEN', salaryMin: 16000, salaryMax: 22000, location: 'On-site', experience: '5+ years', skills: JSON.stringify(['Employee Relations', 'Talent Management', 'HRIS', 'Compliance']), description: 'Strategic HR partner for business units', postedDate: getPastDate(14), closingDate: getPastDate(-10), applicantCount: 4 },
      { title: 'Backend Developer (Intern)', departmentId: deptIds[0] || null, type: 'INTERNSHIP', status: 'DRAFT', salaryMin: 4000, salaryMax: 6000, location: 'On-site', experience: 'Student', skills: JSON.stringify(['Node.js', 'Python', 'SQL', 'REST APIs']), description: 'Summer internship program for backend development', postedDate: getPastDate(1), closingDate: getPastDate(-45), applicantCount: 0 },
      { title: 'Financial Analyst', departmentId: deptIds[Math.min(4, deptIds.length - 1)] || null, type: 'FULL_TIME', status: 'OPEN', salaryMin: 15000, salaryMax: 21000, location: 'Hybrid', experience: '3+ years', skills: JSON.stringify(['Financial Modeling', 'Excel', 'SAP', 'Reporting']), description: 'Financial planning and analysis', postedDate: getPastDate(20), closingDate: getPastDate(-5), applicantCount: 3 },
      { title: 'Product Manager', departmentId: deptIds[0] || null, type: 'FULL_TIME', status: 'FILLED', salaryMin: 22000, salaryMax: 30000, location: 'Hybrid', experience: '6+ years', skills: JSON.stringify(['Product Strategy', 'Agile', 'Data Analysis', 'Roadmapping']), description: 'Lead product vision and strategy', postedDate: getPastDate(30), closingDate: getPastDate(2), applicantCount: 9 },
    ];

    const createdJobs = [];
    for (const jobData of jobPostingsData) {
      const job = await db.jobPosting.create({ data: jobData });
      createdJobs.push(job);
    }

    // ─────────────────────────────────────────────
    // 2. Create 12 Candidates at various stages
    // ─────────────────────────────────────────────
    const candidatesData = [
      { name: 'David Chen', email: 'david.chen@email.com', phone: '+1-555-1001', jobPostingId: createdJobs[0].id, stage: 'APPLIED', rating: 4, source: 'LINKEDIN', appliedDate: getPastDate(5), notes: null },
      { name: 'Maria Garcia', email: 'maria.g@email.com', phone: '+1-555-1112', jobPostingId: createdJobs[1].id, stage: 'SCREENING', rating: 3, source: 'REFERRAL', appliedDate: getPastDate(4), notes: null },
      { name: 'Ahmed Hassan', email: 'ahmed.h@email.com', phone: '+1-555-1223', jobPostingId: createdJobs[2].id, stage: 'INTERVIEW', rating: 5, source: 'WEBSITE', appliedDate: getPastDate(8), notes: 'Strong technical background, good culture fit', interviewDate: getPastDate(-2) },
      { name: 'Sarah Kim', email: 'sarah.k@email.com', phone: '+1-555-1334', jobPostingId: createdJobs[3].id, stage: 'ASSESSMENT', rating: 4, source: 'JOB_BOARD', appliedDate: getPastDate(6), notes: null },
      { name: 'Tom Wilson', email: 'tom.w@email.com', phone: '+1-555-1445', jobPostingId: createdJobs[4].id, stage: 'OFFER', rating: 4, source: 'AGENCY', appliedDate: getPastDate(12), notes: null, offerAmount: 20000 },
      { name: 'Priya Patel', email: 'priya.p@email.com', phone: '+1-555-1556', jobPostingId: createdJobs[0].id, stage: 'HIRED', rating: 5, source: 'LINKEDIN', appliedDate: getPastDate(15), notes: 'Excellent portfolio, referred by VP' },
      { name: 'Alex Johnson', email: 'alex.j@email.com', phone: '+1-555-1667', jobPostingId: createdJobs[5].id, stage: 'REJECTED', rating: 2, source: 'REFERRAL', appliedDate: getPastDate(3), notes: null, rejectedReason: 'Insufficient experience' },
      { name: 'Lisa Wang', email: 'lisa.w@email.com', phone: '+1-555-1778', jobPostingId: createdJobs[6].id, stage: 'APPLIED', rating: 3, source: 'WEBSITE', appliedDate: getPastDate(2), notes: null },
      { name: 'James Brown', email: 'james.b@email.com', phone: '+1-555-1889', jobPostingId: createdJobs[7].id, stage: 'SCREENING', rating: 4, source: 'JOB_BOARD', appliedDate: getPastDate(18), notes: null },
      { name: 'Emma Davis', email: 'emma.d@email.com', phone: '+1-555-1990', jobPostingId: createdJobs[1].id, stage: 'INTERVIEW', rating: 4, source: 'OTHER', appliedDate: getPastDate(7), notes: null, interviewDate: getPastDate(-1) },
      { name: 'Ryan Murphy', email: 'ryan.m@email.com', phone: '+1-555-2001', jobPostingId: createdJobs[2].id, stage: 'APPLIED', rating: 3, source: 'LINKEDIN', appliedDate: getPastDate(1), notes: null },
      { name: 'Fatima Al-Rashid', email: 'fatima.a@email.com', phone: '+1-555-2112', jobPostingId: createdJobs[3].id, stage: 'SCREENING', rating: 5, source: 'REFERRAL', appliedDate: getPastDate(9), notes: null },
    ];

    for (const candData of candidatesData) {
      await db.candidate.create({ data: candData });
    }

    // ─────────────────────────────────────────────
    // 3. Create 7 Training Programs
    // ─────────────────────────────────────────────
    const trainingProgramsData = [
      { title: 'Advanced React Patterns', description: 'Deep dive into advanced React patterns and performance optimization', category: 'TECHNICAL', format: 'ONLINE', duration: '4 weeks', enrollmentCount: 12, maxEnrollment: 20, rating: 4.5, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(7), endDate: getPastDate(-21), instructor: 'Sarah Chen' },
      { title: 'Leadership Excellence Program', description: 'Develop leadership skills for aspiring managers', category: 'LEADERSHIP', format: 'HYBRID', duration: '8 weeks', enrollmentCount: 8, maxEnrollment: 15, rating: 4.8, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(14), endDate: getPastDate(-42), instructor: 'External Coach' },
      { title: 'Workplace Safety & Compliance', description: 'Annual safety and regulatory compliance training', category: 'COMPLIANCE', format: 'ONLINE', duration: '2 days', enrollmentCount: 45, maxEnrollment: 100, rating: 3.8, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(3), endDate: getPastDate(-4), instructor: 'HR Department' },
      { title: 'Effective Communication Skills', description: 'Improve interpersonal communication and presentation skills', category: 'SOFT_SKILLS', format: 'IN_PERSON', duration: '3 days', enrollmentCount: 15, maxEnrollment: 25, rating: 4.2, status: 'UPCOMING', hasCertification: false, startDate: getPastDate(-10), instructor: 'Communication Lab' },
      { title: 'Cloud Architecture Certification', description: 'AWS Solutions Architect certification prep course', category: 'TECHNICAL', format: 'SELF_PACED', duration: '12 weeks', enrollmentCount: 6, maxEnrollment: 10, rating: 4.9, status: 'ACTIVE', hasCertification: true, startDate: getPastDate(21), endDate: getPastDate(-63), instructor: 'Cloud Academy' },
      { title: 'Fire Safety Drill', description: 'Annual fire safety and emergency evacuation procedures', category: 'SAFETY', format: 'IN_PERSON', duration: '1 day', enrollmentCount: 50, rating: 3.5, status: 'COMPLETED', hasCertification: false, startDate: getPastDate(30), endDate: getPastDate(29), instructor: 'Safety Officer' },
      { title: 'New Hire Orientation', description: 'Comprehensive onboarding training for new employees', category: 'ONBOARDING', format: 'HYBRID', duration: '1 week', enrollmentCount: 3, maxEnrollment: 20, rating: 4.0, status: 'ACTIVE', hasCertification: false, startDate: getPastDate(5), endDate: getPastDate(-2), instructor: 'HR Team' },
    ];

    const createdPrograms = [];
    for (const progData of trainingProgramsData) {
      const program = await db.trainingProgram.create({ data: progData });
      createdPrograms.push(program);
    }

    // ─────────────────────────────────────────────
    // 4. Create Enrollment Records
    // ─────────────────────────────────────────────
    const enrollmentPairs: { programIndex: number; userIndex: number; status: string; score?: number }[] = [
      { programIndex: 0, userIndex: 0, status: 'COMPLETED', score: 92 },
      { programIndex: 0, userIndex: 1, status: 'IN_PROGRESS' },
      { programIndex: 1, userIndex: 0, status: 'IN_PROGRESS' },
      { programIndex: 1, userIndex: 2, status: 'COMPLETED', score: 88 },
      { programIndex: 2, userIndex: 0, status: 'COMPLETED', score: 95 },
      { programIndex: 2, userIndex: 1, status: 'COMPLETED', score: 85 },
      { programIndex: 2, userIndex: 2, status: 'COMPLETED', score: 90 },
      { programIndex: 4, userIndex: 3, status: 'IN_PROGRESS' },
      { programIndex: 4, userIndex: 4, status: 'ENROLLED' },
      { programIndex: 6, userIndex: 5, status: 'IN_PROGRESS' },
    ];

    for (const enrollment of enrollmentPairs) {
      const program = createdPrograms[enrollment.programIndex];
      const userId = userIds[enrollment.userIndex];
      if (!program || !userId) continue;

      const data: Record<string, unknown> = {
        trainingProgramId: program.id,
        userId,
        status: enrollment.status,
      };
      if (enrollment.score !== undefined) {
        data.score = enrollment.score;
        data.completedAt = new Date();
      }

      try {
        await db.trainingEnrollment.create({ data });
      } catch {
        // Skip if unique constraint violation (already enrolled)
      }
    }

    // ─────────────────────────────────────────────
    // 5. Create 3 Onboarding Plans with Tasks
    // ─────────────────────────────────────────────
    const onboardingPlansData = [
      {
        userId: userIds[4] || null,
        employeeName: users[4]?.name || 'Michael Brown',
        email: users[4]?.email || null,
        departmentId: deptIds[Math.min(1, deptIds.length - 1)] || null,
        startDate: getPastDate(14),
        endDate: getPastDate(-14),
        progress: 75,
        status: 'IN_PROGRESS',
        buddyId: userIds[1] || null,
        mentorId: userIds[0] || null,
        tasks: [
          { title: 'Complete HR documentation', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1 },
          { title: 'Set up development environment', category: 'SETUP', isCompleted: true, dueDay: 2 },
          { title: 'Company culture orientation', category: 'INTRODUCTION', isCompleted: true, dueDay: 3 },
          { title: 'Design system walkthrough', category: 'TRAINING', isCompleted: true, dueDay: 5 },
          { title: 'Meet cross-functional team', category: 'INTRODUCTION', isCompleted: false, dueDay: 7 },
          { title: 'First project assignment', category: 'TRAINING', isCompleted: false, dueDay: 10 },
          { title: '30-day performance review', category: 'REVIEW', isCompleted: false, dueDay: 30 },
        ],
      },
      {
        userId: userIds[5] || null,
        employeeName: users[5]?.name || 'Lisa Taylor',
        email: users[5]?.email || null,
        departmentId: deptIds[Math.min(2, deptIds.length - 1)] || null,
        startDate: getPastDate(7),
        endDate: getPastDate(-21),
        progress: 40,
        status: 'IN_PROGRESS',
        buddyId: userIds[3] || null,
        mentorId: userIds[1] || null,
        tasks: [
          { title: 'Complete HR documentation', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1 },
          { title: 'Set up marketing tools', category: 'SETUP', isCompleted: true, dueDay: 2 },
          { title: 'Brand guidelines training', category: 'TRAINING', isCompleted: false, dueDay: 5 },
          { title: 'Content strategy overview', category: 'TRAINING', isCompleted: false, dueDay: 7 },
          { title: '30-day performance review', category: 'REVIEW', isCompleted: false, dueDay: 30 },
        ],
      },
      {
        userId: null,
        employeeName: 'Pending Hire — DevOps',
        email: 'devops@new.com',
        departmentId: deptIds[0] || null,
        startDate: getPastDate(-7),
        endDate: null,
        progress: 0,
        status: 'NOT_STARTED',
        buddyId: null,
        mentorId: null,
        tasks: [
          { title: 'Complete HR documentation', category: 'DOCUMENTATION', isCompleted: false, dueDay: 1 },
          { title: 'Set up development environment', category: 'SETUP', isCompleted: false, dueDay: 2 },
          { title: 'Security training', category: 'TRAINING', isCompleted: false, dueDay: 5 },
          { title: 'Meet engineering team', category: 'INTRODUCTION', isCompleted: false, dueDay: 3 },
        ],
      },
    ];

    for (const planData of onboardingPlansData) {
      const { tasks, ...planFields } = planData;
      await db.onboardingPlan.create({
        data: {
          ...planFields,
          tasks: {
            create: tasks.map((t) => ({
              title: t.title,
              category: t.category,
              isCompleted: t.isCompleted,
              dueDay: t.dueDay,
              completedAt: t.isCompleted ? new Date() : null,
            })),
          },
        },
      });
    }

    // ─────────────────────────────────────────────
    // 6. Create 7 Performance Reviews
    // ─────────────────────────────────────────────
    const reviewsData = [
      { userId: userIds[2] || '', cycleName: 'Q1 2026 Review', status: 'COMPLETED', rating: 4, goalScore: 85, competencyScore: 88, reviewerId: userIds[1] || null, dueDate: getPastDate(10), completedAt: new Date(getPastDate(8)), selfAssessment: JSON.stringify({ accomplishments: 'Delivered 3 major features', challenges: 'Time management' }), managerFeedback: JSON.stringify({ comments: 'Strong performer', recommendation: 'Promote' }), strengths: JSON.stringify(['Problem solving', 'Team collaboration', 'Technical skills']), improvements: JSON.stringify(['Time management', 'Documentation']), goals: JSON.stringify(['Lead a project', 'Mentor junior devs']) },
      { userId: userIds[3] || '', cycleName: 'Q1 2026 Review', status: 'MANAGER_REVIEW', rating: 4.5, goalScore: 92, competencyScore: 90, reviewerId: userIds[1] || null, dueDate: getPastDate(-5) },
      { userId: userIds[4] || '', cycleName: 'Q1 2026 Review', status: 'SELF_ASSESSMENT', rating: 0, reviewerId: null, dueDate: getPastDate(-3) },
      { userId: userIds[5] || '', cycleName: 'Q1 2026 Review', status: 'CALIBRATION', rating: 3.5, goalScore: 78, competencyScore: 82, reviewerId: userIds[0] || null, dueDate: getPastDate(-1) },
      { userId: userIds[1] || '', cycleName: 'Q1 2026 Review', status: 'COMPLETED', rating: 4.8, goalScore: 95, competencyScore: 93, reviewerId: userIds[0] || null, dueDate: getPastDate(10), completedAt: new Date(getPastDate(7)), strengths: JSON.stringify(['Technical leadership', 'Mentoring', 'Innovation']), improvements: JSON.stringify(['Delegation']), goals: JSON.stringify(['Build team capacity', 'Drive architecture decisions']) },
      { userId: userIds[2] || '', cycleName: 'Q2 2026 Review', status: 'NOT_STARTED', rating: 0, reviewerId: null, dueDate: getPastDate(-30) },
      { userId: userIds[3] || '', cycleName: 'Q2 2026 Review', status: 'NOT_STARTED', rating: 0, reviewerId: null, dueDate: getPastDate(-30) },
    ];

    for (const reviewData of reviewsData) {
      if (!reviewData.userId) continue;
      await db.performanceReview.create({ data: reviewData });
    }

    // ─────────────────────────────────────────────
    // 7. Create 7 Lifecycle Events
    // ─────────────────────────────────────────────
    const eventsData = [
      { userId: userIds[4] || null, employeeName: users[4]?.name || 'Michael Brown', email: users[4]?.email || null, departmentId: deptIds[Math.min(1, deptIds.length - 1)] || null, type: 'HIRE', status: 'COMPLETED', effectiveDate: getPastDate(14), details: 'New hire as UI Designer', toValue: 'UI Designer', approvedById: userIds[0] || null, approvedAt: new Date(getPastDate(15)) },
      { userId: userIds[5] || null, employeeName: users[5]?.name || 'Lisa Taylor', email: users[5]?.email || null, departmentId: deptIds[Math.min(2, deptIds.length - 1)] || null, type: 'HIRE', status: 'COMPLETED', effectiveDate: getPastDate(7), details: 'New hire as Marketing Specialist', toValue: 'Marketing Specialist', approvedById: userIds[0] || null, approvedAt: new Date(getPastDate(8)) },
      { userId: userIds[2] || null, employeeName: users[2]?.name || 'James Wilson', email: users[2]?.email || null, departmentId: deptIds[0] || null, type: 'PROMOTION', status: 'PENDING', effectiveDate: getPastDate(-7), details: 'Promotion to Senior Developer', fromValue: 'Developer', toValue: 'Senior Developer' },
      { userId: userIds[3] || null, employeeName: users[3]?.name || 'Emily Park', email: users[3]?.email || null, departmentId: deptIds[0] || null, type: 'TRANSFER', status: 'PENDING', effectiveDate: getPastDate(-14), details: 'Transfer to Backend Team', fromValue: 'Frontend Team', toValue: 'Backend Team' },
      { userId: null, employeeName: 'Robert Martinez', email: 'robert.m@former.com', departmentId: deptIds[Math.min(4, deptIds.length - 1)] || null, type: 'RESIGNATION', status: 'APPROVED', effectiveDate: getPastDate(5), details: 'Resigned for personal reasons', approvedById: userIds[0] || null, approvedAt: new Date(getPastDate(4)) },
      { userId: userIds[1] || null, employeeName: users[1]?.name || 'Sarah Chen', email: users[1]?.email || null, departmentId: deptIds[0] || null, type: 'PROMOTION', status: 'COMPLETED', effectiveDate: getPastDate(60), details: 'Promoted to Engineering Manager', fromValue: 'Senior Developer', toValue: 'Engineering Manager', approvedById: userIds[0] || null, approvedAt: new Date(getPastDate(62)) },
      { userId: null, employeeName: 'Pending — DevOps Engineer', email: 'devops@pending.com', departmentId: deptIds[0] || null, type: 'HIRE', status: 'PENDING', effectiveDate: getPastDate(-7), details: 'Offer accepted, pending onboarding', toValue: 'DevOps Engineer' },
    ];

    for (const eventData of eventsData) {
      await db.lifecycleEvent.create({ data: eventData });
    }

    // Get counts for response
    const counts = {
      jobPostings: await db.jobPosting.count(),
      candidates: await db.candidate.count(),
      trainingPrograms: await db.trainingProgram.count(),
      trainingEnrollments: await db.trainingEnrollment.count(),
      onboardingPlans: await db.onboardingPlan.count(),
      onboardingTasks: await db.onboardingTask.count(),
      performanceReviews: await db.performanceReview.count(),
      lifecycleEvents: await db.lifecycleEvent.count(),
    };

    return NextResponse.json({
      status: 'success',
      message: 'HRM data seeded successfully',
      data: counts,
    });
  } catch (error) {
    console.error('Seed HRM error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to seed HRM data' },
      { status: 500 }
    );
  }
}

// GET /api/seed-hrm - Check if HRM data has been seeded
export async function GET() {
  try {
    const counts = {
      jobPostings: await db.jobPosting.count(),
      candidates: await db.candidate.count(),
      trainingPrograms: await db.trainingProgram.count(),
      trainingEnrollments: await db.trainingEnrollment.count(),
      onboardingPlans: await db.onboardingPlan.count(),
      onboardingTasks: await db.onboardingTask.count(),
      performanceReviews: await db.performanceReview.count(),
      lifecycleEvents: await db.lifecycleEvent.count(),
    };

    const isSeeded = Object.values(counts).some((count) => count > 0);

    return NextResponse.json({
      status: 'success',
      data: { isSeeded, counts },
    });
  } catch (error) {
    console.error('Seed HRM GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to check seed status' },
      { status: 500 }
    );
  }
}
