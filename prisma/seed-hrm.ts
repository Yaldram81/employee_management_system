import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function getFutureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('🌱 Seeding HRM data (Job Postings, Candidates, Onboarding, Training)...');

  // Clean up existing HRM data
  await prisma.trainingEnrollment.deleteMany();
  await prisma.onboardingTask.deleteMany();
  await prisma.onboardingPlan.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.trainingProgram.deleteMany();

  // Get departments
  const departments = await prisma.department.findMany();
  const deptMap: Record<string, typeof departments[0]> = {};
  for (const d of departments) {
    deptMap[d.name] = d;
  }

  // Get users
  const users = await prisma.user.findMany();
  const userMap: Record<string, typeof users[0]> = {};
  for (const u of users) {
    userMap[u.email] = u;
  }

  // ═══════════════════════════════════════════════════════════════
  // JOB POSTINGS
  // ═══════════════════════════════════════════════════════════════
  console.log('💼 Creating Job Postings...');

  const jobPostings = await Promise.all([
    // Engineering jobs
    prisma.jobPosting.create({
      data: {
        title: 'Senior Full-Stack Developer',
        departmentId: deptMap['Engineering']?.id,
        type: 'FULL_TIME',
        status: 'OPEN',
        salaryMin: 80000,
        salaryMax: 120000,
        location: 'On-site',
        experience: '5+ years',
        skills: JSON.stringify(['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker']),
        description: 'We are looking for an experienced Full-Stack Developer to join our Engineering team. You will be responsible for building and maintaining scalable web applications, mentoring junior developers, and contributing to architectural decisions.\n\nKey Responsibilities:\n- Design and implement robust, scalable web applications\n- Lead code reviews and mentor junior developers\n- Collaborate with product managers and designers\n- Write clean, testable, and well-documented code\n- Participate in architectural decision-making\n\nBenefits:\n- Competitive salary and equity package\n- Health, dental, and vision insurance\n- Flexible work arrangements\n- Professional development budget\n- 20 days PTO',
        postedDate: getPastDate(15),
        closingDate: getFutureDate(30),
        applicantCount: 24,
      },
    }),

    prisma.jobPosting.create({
      data: {
        title: 'DevOps Engineer',
        departmentId: deptMap['Engineering']?.id,
        type: 'FULL_TIME',
        status: 'OPEN',
        salaryMin: 75000,
        salaryMax: 110000,
        location: 'Hybrid',
        experience: '3+ years',
        skills: JSON.stringify(['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Linux', 'Python']),
        description: 'Join our infrastructure team to build and maintain our cloud infrastructure. You will be responsible for ensuring system reliability, automating deployment pipelines, and implementing monitoring solutions.\n\nKey Responsibilities:\n- Manage and optimize AWS infrastructure\n- Implement and maintain CI/CD pipelines\n- Monitor system performance and reliability\n- Automate infrastructure provisioning with Terraform\n- Respond to and resolve production incidents\n\nBenefits:\n- Remote-first culture\n- Learning budget for certifications\n- Latest hardware provided',
        postedDate: getPastDate(10),
        closingDate: getFutureDate(25),
        applicantCount: 18,
      },
    }),

    prisma.jobPosting.create({
      data: {
        title: 'Frontend Developer (React)',
        departmentId: deptMap['Engineering']?.id,
        type: 'FULL_TIME',
        status: 'OPEN',
        salaryMin: 60000,
        salaryMax: 90000,
        location: 'Remote',
        experience: '2+ years',
        skills: JSON.stringify(['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'REST APIs', 'Git']),
        description: 'We need a creative Frontend Developer to build beautiful, responsive web interfaces. You will work closely with our design team to implement pixel-perfect UIs and optimize user experience.\n\nKey Responsibilities:\n- Build responsive web applications using React and Next.js\n- Implement UI designs with attention to detail\n- Optimize application performance and accessibility\n- Write unit and integration tests\n- Participate in sprint planning and code reviews',
        postedDate: getPastDate(7),
        closingDate: getFutureDate(20),
        applicantCount: 32,
      },
    }),

    prisma.jobPosting.create({
      data: {
        title: 'Backend Developer (Python)',
        departmentId: deptMap['Engineering']?.id,
        type: 'CONTRACT',
        status: 'PAUSED',
        salaryMin: 55000,
        salaryMax: 85000,
        location: 'Remote',
        experience: '3+ years',
        skills: JSON.stringify(['Python', 'Django', 'PostgreSQL', 'Redis', 'Docker', 'REST APIs']),
        description: 'Contract position for a Backend Developer to help build our data processing pipeline and API services. This is a 6-month contract with possibility of extension.\n\nKey Responsibilities:\n- Develop and maintain RESTful API services\n- Design and optimize database schemas\n- Implement data processing pipelines\n- Write comprehensive tests and documentation',
        postedDate: getPastDate(25),
        closingDate: getPastDate(5),
        applicantCount: 15,
      },
    }),

    // Design jobs
    prisma.jobPosting.create({
      data: {
        title: 'Senior UX Designer',
        departmentId: deptMap['Design']?.id,
        type: 'FULL_TIME',
        status: 'OPEN',
        salaryMin: 70000,
        salaryMax: 100000,
        location: 'On-site',
        experience: '4+ years',
        skills: JSON.stringify(['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility', 'Wireframing']),
        description: 'We are seeking a Senior UX Designer to lead user experience design across our product suite. You will conduct user research, create wireframes and prototypes, and establish design patterns.\n\nKey Responsibilities:\n- Lead UX research and design for key product features\n- Create user journey maps, wireframes, and prototypes\n- Establish and maintain design system components\n- Collaborate with product and engineering teams\n- Conduct usability testing and iterate on designs',
        postedDate: getPastDate(12),
        closingDate: getFutureDate(18),
        applicantCount: 14,
      },
    }),

    prisma.jobPosting.create({
      data: {
        title: 'UI Designer (Internship)',
        departmentId: deptMap['Design']?.id,
        type: 'INTERNSHIP',
        status: 'OPEN',
        salaryMin: 20000,
        salaryMax: 30000,
        location: 'On-site',
        experience: '0-1 years',
        skills: JSON.stringify(['Figma', 'Adobe Creative Suite', 'Typography', 'Color Theory']),
        description: 'Great opportunity for a design student or recent graduate to gain real-world experience. You will work alongside our senior designers on real projects.\n\nWhat You Will Learn:\n- Professional UI design workflow\n- Design system maintenance\n- Client communication and presentation\n- Design-to-development handoff\n\nDuration: 3 months with potential for full-time offer',
        postedDate: getPastDate(5),
        closingDate: getFutureDate(25),
        applicantCount: 42,
      },
    }),

    // Marketing jobs
    prisma.jobPosting.create({
      data: {
        title: 'Digital Marketing Manager',
        departmentId: deptMap['Marketing']?.id,
        type: 'FULL_TIME',
        status: 'OPEN',
        salaryMin: 65000,
        salaryMax: 95000,
        location: 'Hybrid',
        experience: '5+ years',
        skills: JSON.stringify(['Google Ads', 'SEO', 'Content Strategy', 'Analytics', 'Social Media', 'Email Marketing']),
        description: 'Lead our digital marketing efforts across all channels. You will develop and execute strategies to increase brand awareness, drive traffic, and generate leads.\n\nKey Responsibilities:\n- Develop and execute digital marketing strategies\n- Manage PPC campaigns across Google and social platforms\n- Analyze campaign performance and optimize for ROI\n- Lead content strategy and social media presence\n- Build and manage marketing team',
        postedDate: getPastDate(8),
        closingDate: getFutureDate(22),
        applicantCount: 21,
      },
    }),

    prisma.jobPosting.create({
      data: {
        title: 'Content Writer',
        departmentId: deptMap['Marketing']?.id,
        type: 'PART_TIME',
        status: 'FILLED',
        salaryMin: 25000,
        salaryMax: 40000,
        location: 'Remote',
        experience: '2+ years',
        skills: JSON.stringify(['SEO Writing', 'Blog Content', 'Copywriting', 'WordPress', 'Social Media']),
        description: 'Part-time position for a talented Content Writer to create engaging blog posts, social media content, and marketing copy.\n\nResponsibilities:\n- Write 4-6 blog posts per month\n- Create social media content calendars\n- Write product descriptions and email copy\n- Optimize content for SEO',
        postedDate: getPastDate(30),
        closingDate: getPastDate(10),
        applicantCount: 38,
      },
    }),

    // HR jobs
    prisma.jobPosting.create({
      data: {
        title: 'HR Business Partner',
        departmentId: deptMap['HR']?.id,
        type: 'FULL_TIME',
        status: 'OPEN',
        salaryMin: 60000,
        salaryMax: 85000,
        location: 'On-site',
        experience: '4+ years',
        skills: JSON.stringify(['Employee Relations', 'Talent Management', 'HRIS', 'Compliance', 'Performance Management']),
        description: 'We need an experienced HR Business Partner to work closely with department heads on people strategies, talent management, and organizational development.\n\nKey Responsibilities:\n- Partner with business leaders on people strategy\n- Manage employee relations issues\n- Drive performance management processes\n- Support talent acquisition and retention\n- Ensure HR compliance and best practices',
        postedDate: getPastDate(6),
        closingDate: getFutureDate(24),
        applicantCount: 9,
      },
    }),

    // Finance jobs
    prisma.jobPosting.create({
      data: {
        title: 'Financial Analyst',
        departmentId: deptMap['Finance']?.id,
        type: 'FULL_TIME',
        status: 'DRAFT',
        salaryMin: 55000,
        salaryMax: 80000,
        location: 'On-site',
        experience: '2+ years',
        skills: JSON.stringify(['Financial Modeling', 'Excel', 'SAP', 'Data Analysis', 'Budgeting']),
        description: 'Seeking a detail-oriented Financial Analyst to support our financial planning and analysis team. You will be responsible for financial modeling, budget preparation, and variance analysis.\n\nKey Responsibilities:\n- Build and maintain financial models\n- Prepare monthly and quarterly financial reports\n- Conduct variance analysis and identify trends\n- Support annual budgeting process\n- Present findings to senior management',
        postedDate: null,
        closingDate: null,
        applicantCount: 0,
      },
    }),

    prisma.jobPosting.create({
      data: {
        title: 'Junior Software Engineer',
        departmentId: deptMap['Engineering']?.id,
        type: 'FULL_TIME',
        status: 'CLOSED',
        salaryMin: 45000,
        salaryMax: 65000,
        location: 'On-site',
        experience: '0-2 years',
        skills: JSON.stringify(['JavaScript', 'Python', 'Git', 'SQL', 'Problem Solving']),
        description: 'Entry-level position for recent graduates looking to start their software engineering career. Comprehensive training and mentorship provided.\n\nWhat We Offer:\n- Structured mentorship program\n- Rotation across different teams\n- Conference and learning budget\n- Clear career progression path',
        postedDate: getPastDate(45),
        closingDate: getPastDate(15),
        applicantCount: 67,
      },
    }),
  ]);

  console.log(`  Created ${jobPostings.length} job postings`);

  // ═══════════════════════════════════════════════════════════════
  // CANDIDATES
  // ═══════════════════════════════════════════════════════════════
  console.log('👥 Creating Candidates...');

  // Candidates for Senior Full-Stack Developer
  const fullStackJob = jobPostings[0];
  const devOpsJob = jobPostings[1];
  const frontendJob = jobPostings[2];
  const uxDesignJob = jobPostings[4];
  const uiInternJob = jobPostings[5];
  const digitalMktJob = jobPostings[6];
  const contentJob = jobPostings[7];
  const hrBPJob = jobPostings[8];
  const juniorJob = jobPostings[10];

  const allCandidates = await Promise.all([
    // Full-Stack Developer candidates
    prisma.candidate.create({
      data: {
        name: 'David Zhang',
        email: 'david.zhang@email.com',
        phone: '+1-555-0101',
        jobPostingId: fullStackJob.id,
        stage: 'INTERVIEW',
        rating: 4.5,
        source: 'LINKEDIN',
        appliedDate: getPastDate(12),
        notes: 'Strong experience with React and Node.js. Previously at Google for 3 years. Excellent communication skills.',
        interviewDate: getFutureDate(3),
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        phone: '+1-555-0102',
        jobPostingId: fullStackJob.id,
        stage: 'ASSESSMENT',
        rating: 4.0,
        source: 'REFERRAL',
        appliedDate: getPastDate(10),
        notes: 'Referred by Sarah Chen. Solid backend skills, needs to strengthen frontend knowledge. Take-home assessment submitted.',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Marcus Johnson',
        email: 'marcus.j@email.com',
        phone: '+1-555-0103',
        jobPostingId: fullStackJob.id,
        stage: 'SCREENING',
        rating: 3.5,
        source: 'WEBSITE',
        appliedDate: getPastDate(5),
        notes: 'Good portfolio. 4 years at a startup. Looking for growth opportunities.',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Elena Popova',
        email: 'elena.p@email.com',
        phone: '+1-555-0104',
        jobPostingId: fullStackJob.id,
        stage: 'OFFER',
        rating: 4.8,
        source: 'LINKEDIN',
        appliedDate: getPastDate(14),
        notes: 'Outstanding candidate! 7 years full-stack experience. Led a team of 5 at her current company. Strong system design skills.',
        interviewDate: getPastDate(3),
        offerAmount: 115000,
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Ahmed Hassan',
        email: 'ahmed.h@email.com',
        phone: '+1-555-0105',
        jobPostingId: fullStackJob.id,
        stage: 'REJECTED',
        rating: 2.0,
        source: 'JOB_BOARD',
        appliedDate: getPastDate(13),
        notes: 'Insufficient experience with our tech stack. Struggled with system design interview.',
        rejectedReason: 'Does not meet minimum technical requirements for the role',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Sophie Williams',
        email: 'sophie.w@email.com',
        phone: '+1-555-0106',
        jobPostingId: fullStackJob.id,
        stage: 'APPLIED',
        rating: 0,
        source: 'WEBSITE',
        appliedDate: getPastDate(2),
        notes: 'Application just received. Resume looks promising - 5 years at Amazon.',
      },
    }),

    // DevOps Engineer candidates
    prisma.candidate.create({
      data: {
        name: 'Raj Patel',
        email: 'raj.patel@email.com',
        phone: '+1-555-0201',
        jobPostingId: devOpsJob.id,
        stage: 'INTERVIEW',
        rating: 4.2,
        source: 'LINKEDIN',
        appliedDate: getPastDate(8),
        notes: 'AWS Solutions Architect certified. Strong Kubernetes experience. Currently at Microsoft.',
        interviewDate: getFutureDate(5),
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Kim Soo-Jin',
        email: 'kim.sj@email.com',
        phone: '+1-555-0202',
        jobPostingId: devOpsJob.id,
        stage: 'SCREENING',
        rating: 3.8,
        source: 'AGENCY',
        appliedDate: getPastDate(4),
        notes: 'Presented by recruitment agency. 3 years DevOps experience. Good Terraform skills.',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Olga Petrov',
        email: 'olga.p@email.com',
        phone: '+1-555-0203',
        jobPostingId: devOpsJob.id,
        stage: 'HIRED',
        rating: 4.6,
        source: 'REFERRAL',
        appliedDate: getPastDate(9),
        notes: 'Excellent candidate! 6 years DevOps experience. Strong culture fit. Accepted offer.',
        interviewDate: getPastDate(2),
        offerAmount: 105000,
      },
    }),

    // Frontend Developer candidates
    prisma.candidate.create({
      data: {
        name: 'Lisa Chang',
        email: 'lisa.chang@email.com',
        phone: '+1-555-0301',
        jobPostingId: frontendJob.id,
        stage: 'ASSESSMENT',
        rating: 3.9,
        source: 'WEBSITE',
        appliedDate: getPastDate(6),
        notes: 'Good React portfolio. Built an e-commerce platform. Needs to improve TypeScript skills.',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Tom Baker',
        email: 'tom.baker@email.com',
        phone: '+1-555-0302',
        jobPostingId: frontendJob.id,
        stage: 'APPLIED',
        rating: 0,
        source: 'LINKEDIN',
        appliedDate: getPastDate(1),
        notes: 'New application. 3 years React experience at a fintech company.',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Aisha Mohammed',
        email: 'aisha.m@email.com',
        phone: '+1-555-0303',
        jobPostingId: frontendJob.id,
        stage: 'INTERVIEW',
        rating: 4.3,
        source: 'REFERRAL',
        appliedDate: getPastDate(5),
        notes: 'Referred by James Wilson. Excellent CSS/Tailwind skills. Built accessible UIs at previous role.',
        interviewDate: getFutureDate(2),
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Carlos Rivera',
        email: 'carlos.r@email.com',
        phone: '+1-555-0304',
        jobPostingId: frontendJob.id,
        stage: 'REJECTED',
        rating: 2.5,
        source: 'JOB_BOARD',
        appliedDate: getPastDate(6),
        notes: 'Weak coding test performance. Struggled with state management concepts.',
        rejectedReason: 'Insufficient technical skills demonstrated in assessment',
      },
    }),

    // UX Designer candidates
    prisma.candidate.create({
      data: {
        name: 'Natalie Green',
        email: 'natalie.g@email.com',
        phone: '+1-555-0401',
        jobPostingId: uxDesignJob.id,
        stage: 'OFFER',
        rating: 4.7,
        source: 'LINKEDIN',
        appliedDate: getPastDate(11),
        notes: 'Fantastic portfolio! Led design at two startups. Strong research methodology. Great presentation skills.',
        interviewDate: getPastDate(4),
        offerAmount: 95000,
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Kenji Tanaka',
        email: 'kenji.t@email.com',
        phone: '+1-555-0402',
        jobPostingId: uxDesignJob.id,
        stage: 'INTERVIEW',
        rating: 4.0,
        source: 'AGENCY',
        appliedDate: getPastDate(9),
        notes: 'Good design thinking approach. Experience with enterprise products. Need to check cultural fit.',
        interviewDate: getFutureDate(4),
      },
    }),

    // UI Designer Internship candidates
    prisma.candidate.create({
      data: {
        name: 'Emma Davis',
        email: 'emma.davis@email.com',
        phone: '+1-555-0501',
        jobPostingId: uiInternJob.id,
        stage: 'SCREENING',
        rating: 3.5,
        source: 'WEBSITE',
        appliedDate: getPastDate(3),
        notes: 'Design student at RISD. Strong Figma skills. Creative portfolio with personal projects.',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Ryan O\'Brien',
        email: 'ryan.obrien@email.com',
        phone: '+1-555-0502',
        jobPostingId: uiInternJob.id,
        stage: 'APPLIED',
        rating: 0,
        source: 'WEBSITE',
        appliedDate: getPastDate(2),
        notes: 'Recent graduate from Parsons. Good typography skills shown in portfolio.',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Mia Chen',
        email: 'mia.chen@email.com',
        phone: '+1-555-0503',
        jobPostingId: uiInternJob.id,
        stage: 'APPLIED',
        rating: 0,
        source: 'JOB_BOARD',
        appliedDate: getPastDate(1),
        notes: 'Junior at Stanford. Strong visual design skills. Internship at Adobe last summer.',
      },
    }),

    // Digital Marketing Manager candidates
    prisma.candidate.create({
      data: {
        name: 'Jennifer Walsh',
        email: 'jennifer.w@email.com',
        phone: '+1-555-0601',
        jobPostingId: digitalMktJob.id,
        stage: 'INTERVIEW',
        rating: 4.1,
        source: 'LINKEDIN',
        appliedDate: getPastDate(7),
        notes: '7 years digital marketing experience. Managed $2M+ ad budgets. Google Ads certified.',
        interviewDate: getFutureDate(6),
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Robert Kim',
        email: 'robert.k@email.com',
        phone: '+1-555-0602',
        jobPostingId: digitalMktJob.id,
        stage: 'SCREENING',
        rating: 3.2,
        source: 'WEBSITE',
        appliedDate: getPastDate(4),
        notes: '5 years experience but mostly B2C. Our needs are more B2B focused.',
      },
    }),

    // Content Writer (FILLED position)
    prisma.candidate.create({
      data: {
        name: 'Amanda Foster',
        email: 'amanda.f@email.com',
        phone: '+1-555-0701',
        jobPostingId: contentJob.id,
        stage: 'HIRED',
        rating: 4.4,
        source: 'REFERRAL',
        appliedDate: getPastDate(28),
        notes: 'Excellent writing samples. Published author. Perfect fit for our brand voice.',
        interviewDate: getPastDate(20),
        offerAmount: 35000,
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Jake Morrison',
        email: 'jake.m@email.com',
        phone: '+1-555-0702',
        jobPostingId: contentJob.id,
        stage: 'REJECTED',
        rating: 2.8,
        source: 'JOB_BOARD',
        appliedDate: getPastDate(27),
        notes: 'Writing samples were decent but not aligned with our brand voice.',
        rejectedReason: 'Writing style not compatible with brand guidelines',
      },
    }),

    // HR Business Partner candidates
    prisma.candidate.create({
      data: {
        name: 'Patricia Nguyen',
        email: 'patricia.n@email.com',
        phone: '+1-555-0801',
        jobPostingId: hrBPJob.id,
        stage: 'APPLIED',
        rating: 0,
        source: 'LINKEDIN',
        appliedDate: getPastDate(4),
        notes: 'SPHR certified. 6 years HR experience at Fortune 500 company. Strong background in employee relations.',
      },
    }),

    // Junior Software Engineer candidates (CLOSED position)
    prisma.candidate.create({
      data: {
        name: 'Alex Turner',
        email: 'alex.t@email.com',
        phone: '+1-555-0901',
        jobPostingId: juniorJob.id,
        stage: 'HIRED',
        rating: 4.0,
        source: 'WEBSITE',
        appliedDate: getPastDate(40),
        notes: 'CS degree from MIT. Great problem-solving skills. Enthusiastic learner.',
        interviewDate: getPastDate(25),
        offerAmount: 62000,
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Sara Ahmed',
        email: 'sara.a@email.com',
        phone: '+1-555-0902',
        jobPostingId: juniorJob.id,
        stage: 'REJECTED',
        rating: 2.5,
        source: 'JOB_BOARD',
        appliedDate: getPastDate(42),
        notes: 'Weak coding assessment. Needs more foundational knowledge.',
        rejectedReason: 'Below minimum assessment threshold',
      },
    }),
    prisma.candidate.create({
      data: {
        name: 'Mike Okafor',
        email: 'mike.o@email.com',
        phone: '+1-555-0903',
        jobPostingId: juniorJob.id,
        stage: 'REJECTED',
        rating: 3.0,
        source: 'WEBSITE',
        appliedDate: getPastDate(38),
        notes: 'Decent skills but not as strong as other candidates in the pipeline.',
        rejectedReason: 'Other candidates better matched for the role',
      },
    }),
  ]);

  console.log(`  Created ${allCandidates.length} candidates`);

  // ═══════════════════════════════════════════════════════════════
  // ONBOARDING PLANS + TASKS
  // ═══════════════════════════════════════════════════════════════
  console.log('🎯 Creating Onboarding Plans...');

  // Plan 1: Olga Petrov (hired DevOps) - completed onboarding
  const olgaPlan = await prisma.onboardingPlan.create({
    data: {
      employeeName: 'Olga Petrov',
      email: 'olga.p@email.com',
      departmentId: deptMap['Engineering']?.id,
      startDate: getPastDate(14),
      endDate: getPastDate(0),
      progress: 100,
      status: 'COMPLETED',
      buddyId: userMap['james@ems.com']?.id,
      mentorId: userMap['manager@ems.com']?.id,
    },
  });

  // Olga's tasks (all completed)
  await prisma.onboardingTask.createMany({
    data: [
      { onboardingPlanId: olgaPlan.id, title: 'Complete employee profile in HR system', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Sign NDA and employment contract', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Submit bank details for payroll', category: 'DOCUMENTATION', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Set up laptop and development environment', category: 'SETUP', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Configure AWS CLI and access credentials', category: 'SETUP', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Set up VPN and security tools', category: 'SETUP', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Complete security awareness training', category: 'TRAINING', isCompleted: true, dueDay: 5, completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'AWS infrastructure walkthrough with team', category: 'TRAINING', isCompleted: true, dueDay: 7, completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'CI/CD pipeline training session', category: 'TRAINING', isCompleted: true, dueDay: 10, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Meet Engineering team members', category: 'INTRODUCTION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: '1-on-1 with Engineering Manager', category: 'INTRODUCTION', isCompleted: true, dueDay: 3, completedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Lunch with buddy (James)', category: 'INTRODUCTION', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: '30-day review with manager', category: 'REVIEW', isCompleted: true, dueDay: 14, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: olgaPlan.id, title: 'Complete first production deployment', category: 'REVIEW', isCompleted: true, dueDay: 12, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ],
  });

  // Plan 2: Amanda Foster (hired Content Writer) - in progress
  const amandaPlan = await prisma.onboardingPlan.create({
    data: {
      employeeName: 'Amanda Foster',
      email: 'amanda.f@email.com',
      departmentId: deptMap['Marketing']?.id,
      startDate: getPastDate(5),
      endDate: getFutureDate(9),
      progress: 55,
      status: 'IN_PROGRESS',
      buddyId: userMap['lisa@ems.com']?.id,
      mentorId: userMap['admin@ems.com']?.id,
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      { onboardingPlanId: amandaPlan.id, title: 'Complete employee profile in HR system', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Sign NDA and employment contract', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Submit tax forms and bank details', category: 'DOCUMENTATION', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Set up laptop with required software', category: 'SETUP', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Get access to CMS and social media platforms', category: 'SETUP', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Set up email signature and brand guidelines', category: 'SETUP', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Brand voice and tone training', category: 'TRAINING', isCompleted: true, dueDay: 3, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Content workflow and approval process', category: 'TRAINING', isCompleted: true, dueDay: 4, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'SEO best practices workshop', category: 'TRAINING', isCompleted: false, dueDay: 7 },
      { onboardingPlanId: amandaPlan.id, title: 'Meet Marketing team and stakeholders', category: 'INTRODUCTION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: '1-on-1 with Marketing Manager', category: 'INTRODUCTION', isCompleted: true, dueDay: 3, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: amandaPlan.id, title: 'Meet content team members', category: 'INTRODUCTION', isCompleted: false, dueDay: 5 },
      { onboardingPlanId: amandaPlan.id, title: 'Write first blog post draft', category: 'REVIEW', isCompleted: false, dueDay: 10 },
      { onboardingPlanId: amandaPlan.id, title: '14-day check-in with manager', category: 'REVIEW', isCompleted: false, dueDay: 14 },
    ],
  });

  // Plan 3: Alex Turner (hired Junior SWE) - just started
  const alexPlan = await prisma.onboardingPlan.create({
    data: {
      employeeName: 'Alex Turner',
      email: 'alex.t@email.com',
      departmentId: deptMap['Engineering']?.id,
      startDate: getPastDate(2),
      endDate: getFutureDate(12),
      progress: 20,
      status: 'IN_PROGRESS',
      buddyId: userMap['emily@ems.com']?.id,
      mentorId: userMap['james@ems.com']?.id,
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      { onboardingPlanId: alexPlan.id, title: 'Complete employee profile in HR system', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: alexPlan.id, title: 'Sign NDA and employment contract', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: alexPlan.id, title: 'Submit bank details and tax forms', category: 'DOCUMENTATION', isCompleted: true, dueDay: 2, completedAt: new Date() },
      { onboardingPlanId: alexPlan.id, title: 'Set up development environment', category: 'SETUP', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: alexPlan.id, title: 'Get access to Git repos and CI/CD', category: 'SETUP', isCompleted: true, dueDay: 2, completedAt: new Date() },
      { onboardingPlanId: alexPlan.id, title: 'Set up communication tools (Slack, email)', category: 'SETUP', isCompleted: false, dueDay: 2 },
      { onboardingPlanId: alexPlan.id, title: 'Codebase walkthrough with mentor', category: 'TRAINING', isCompleted: false, dueDay: 5 },
      { onboardingPlanId: alexPlan.id, title: 'Complete onboarding coding challenges', category: 'TRAINING', isCompleted: false, dueDay: 7 },
      { onboardingPlanId: alexPlan.id, title: 'Pair programming sessions', category: 'TRAINING', isCompleted: false, dueDay: 10 },
      { onboardingPlanId: alexPlan.id, title: 'Meet Engineering team', category: 'INTRODUCTION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: alexPlan.id, title: '1-on-1 with Engineering Manager', category: 'INTRODUCTION', isCompleted: false, dueDay: 3 },
      { onboardingPlanId: alexPlan.id, title: 'Lunch with buddy (Emily)', category: 'INTRODUCTION', isCompleted: false, dueDay: 3 },
      { onboardingPlanId: alexPlan.id, title: 'Submit first code review', category: 'REVIEW', isCompleted: false, dueDay: 7 },
      { onboardingPlanId: alexPlan.id, title: '14-day performance review', category: 'REVIEW', isCompleted: false, dueDay: 14 },
    ],
  });

  // Plan 4: Elena Popova (offered Full-Stack) - pending start
  const elenaPlan = await prisma.onboardingPlan.create({
    data: {
      employeeName: 'Elena Popova',
      email: 'elena.p@email.com',
      departmentId: deptMap['Engineering']?.id,
      startDate: getFutureDate(7),
      endDate: getFutureDate(21),
      progress: 0,
      status: 'NOT_STARTED',
      buddyId: userMap['emily@ems.com']?.id,
      mentorId: userMap['manager@ems.com']?.id,
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      { onboardingPlanId: elenaPlan.id, title: 'Complete employee profile in HR system', category: 'DOCUMENTATION', isCompleted: false, dueDay: 1 },
      { onboardingPlanId: elenaPlan.id, title: 'Sign NDA and employment contract', category: 'DOCUMENTATION', isCompleted: false, dueDay: 1 },
      { onboardingPlanId: elenaPlan.id, title: 'Submit tax forms and bank details', category: 'DOCUMENTATION', isCompleted: false, dueDay: 2 },
      { onboardingPlanId: elenaPlan.id, title: 'Set up laptop and development environment', category: 'SETUP', isCompleted: false, dueDay: 1 },
      { onboardingPlanId: elenaPlan.id, title: 'Configure AWS and database access', category: 'SETUP', isCompleted: false, dueDay: 2 },
      { onboardingPlanId: elenaPlan.id, title: 'Set up VPN and security tools', category: 'SETUP', isCompleted: false, dueDay: 2 },
      { onboardingPlanId: elenaPlan.id, title: 'Codebase architecture overview', category: 'TRAINING', isCompleted: false, dueDay: 3 },
      { onboardingPlanId: elenaPlan.id, title: 'Development workflow and standards training', category: 'TRAINING', isCompleted: false, dueDay: 5 },
      { onboardingPlanId: elenaPlan.id, title: 'Security awareness training', category: 'TRAINING', isCompleted: false, dueDay: 7 },
      { onboardingPlanId: elenaPlan.id, title: 'Meet Engineering team members', category: 'INTRODUCTION', isCompleted: false, dueDay: 1 },
      { onboardingPlanId: elenaPlan.id, title: '1-on-1 with Engineering Manager', category: 'INTRODUCTION', isCompleted: false, dueDay: 3 },
      { onboardingPlanId: elenaPlan.id, title: 'Lunch with buddy (Emily)', category: 'INTRODUCTION', isCompleted: false, dueDay: 2 },
      { onboardingPlanId: elenaPlan.id, title: 'Complete first feature assignment', category: 'REVIEW', isCompleted: false, dueDay: 10 },
      { onboardingPlanId: elenaPlan.id, title: '14-day check-in with mentor', category: 'REVIEW', isCompleted: false, dueDay: 14 },
    ],
  });

  // Plan 5: Natalie Green (offered UX Designer) - overdue
  const nataliePlan = await prisma.onboardingPlan.create({
    data: {
      employeeName: 'Natalie Green',
      email: 'natalie.g@email.com',
      departmentId: deptMap['Design']?.id,
      startDate: getPastDate(21),
      endDate: getPastDate(7),
      progress: 75,
      status: 'OVERDUE',
      buddyId: userMap['michael@ems.com']?.id,
      mentorId: userMap['manager@ems.com']?.id,
    },
  });

  await prisma.onboardingTask.createMany({
    data: [
      { onboardingPlanId: nataliePlan.id, title: 'Complete employee profile in HR system', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Sign NDA and employment contract', category: 'DOCUMENTATION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Submit bank details and tax forms', category: 'DOCUMENTATION', isCompleted: true, dueDay: 2, completedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Set up design workstation', category: 'SETUP', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Get Figma enterprise access', category: 'SETUP', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Design system walkthrough', category: 'TRAINING', isCompleted: true, dueDay: 5, completedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'User research methodology training', category: 'TRAINING', isCompleted: true, dueDay: 7, completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Accessibility standards workshop', category: 'TRAINING', isCompleted: true, dueDay: 10, completedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Meet Design and Product teams', category: 'INTRODUCTION', isCompleted: true, dueDay: 1, completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: '1-on-1 with Design Lead', category: 'INTRODUCTION', isCompleted: true, dueDay: 3, completedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Stakeholder introduction meetings', category: 'INTRODUCTION', isCompleted: true, dueDay: 5, completedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) },
      { onboardingPlanId: nataliePlan.id, title: 'Complete first design project', category: 'REVIEW', isCompleted: false, dueDay: 12 },
      { onboardingPlanId: nataliePlan.id, title: '14-day performance review', category: 'REVIEW', isCompleted: false, dueDay: 14 },
    ],
  });

  console.log(`  Created 5 onboarding plans with tasks`);

  // ═══════════════════════════════════════════════════════════════
  // TRAINING PROGRAMS + ENROLLMENTS
  // ═══════════════════════════════════════════════════════════════
  console.log('📚 Creating Training Programs...');

  const trainingPrograms = await Promise.all([

    // Active programs
    prisma.trainingProgram.create({
      data: {
        title: 'Advanced React Patterns & Architecture',
        description: 'Deep dive into advanced React patterns including compound components, render props, custom hooks, state machines, and scalable architecture patterns. Learn how to build maintainable, performant React applications at scale.\n\nTopics Covered:\n- Compound Component Pattern\n- Render Props & HOCs\n- Custom Hook Architecture\n- State Machines with XState\n- Performance Optimization\n- Testing Strategies',
        category: 'TECHNICAL',
        format: 'ONLINE',
        duration: '40 hours (8 weeks)',
        enrollmentCount: 12,
        maxEnrollment: 20,
        rating: 4.7,
        status: 'ACTIVE',
        hasCertification: true,
        startDate: getPastDate(10),
        endDate: getFutureDate(46),
        instructor: 'James Wilson',
        curriculum: JSON.stringify([
          'Week 1: Compound Components & Context Patterns',
          'Week 2: Render Props, HOCs & Hook Composition',
          'Week 3: State Management at Scale',
          'Week 4: Performance Optimization & Code Splitting',
          'Week 5: Testing React Applications',
          'Week 6: Server Components & Streaming SSR',
          'Week 7: Design Systems & Component Libraries',
          'Week 8: Capstone Project & Review',
        ]),
      },
    }),

    prisma.trainingProgram.create({
      data: {
        title: 'Leadership Essentials for Managers',
        description: 'A comprehensive leadership development program designed for new and aspiring managers. Build essential skills in team management, strategic thinking, communication, and emotional intelligence.\n\nProgram Highlights:\n- Interactive workshops with role-playing\n- Real-world case studies\n- Peer coaching circles\n- Personal development plan\n- Executive mentoring sessions',
        category: 'LEADERSHIP',
        format: 'HYBRID',
        duration: '24 hours (6 weeks)',
        enrollmentCount: 8,
        maxEnrollment: 15,
        rating: 4.5,
        status: 'ACTIVE',
        hasCertification: true,
        startDate: getPastDate(7),
        endDate: getFutureDate(35),
        instructor: 'Sarah Chen',
        curriculum: JSON.stringify([
          'Week 1: Leadership Styles & Self-Assessment',
          'Week 2: Building High-Performance Teams',
          'Week 3: Effective Communication & Feedback',
          'Week 4: Strategic Thinking & Decision Making',
          'Week 5: Conflict Resolution & Negotiation',
          'Week 6: Leading Change & Innovation',
        ]),
      },
    }),

    prisma.trainingProgram.create({
      data: {
        title: 'Workplace Safety & Compliance 2025',
        description: 'Annual mandatory safety and compliance training covering workplace hazards, emergency procedures, data protection, and regulatory requirements. All employees must complete this training.\n\nModules:\n- Fire Safety & Emergency Evacuation\n- First Aid Basics\n- Data Protection & Privacy (GDPR/CCPA)\n- Anti-Harassment & Inclusive Workplace\n- Cybersecurity Best Practices\n- Health & Wellness',
        category: 'COMPLIANCE',
        format: 'SELF_PACED',
        duration: '8 hours',
        enrollmentCount: 6,
        maxEnrollment: 50,
        rating: 3.8,
        status: 'ACTIVE',
        hasCertification: true,
        startDate: getPastDate(30),
        endDate: getFutureDate(60),
        instructor: 'HR Department',
        curriculum: JSON.stringify([
          'Module 1: Fire Safety & Emergency Procedures',
          'Module 2: Workplace Hazard Identification',
          'Module 3: Data Protection & Privacy',
          'Module 4: Anti-Harassment Training',
          'Module 5: Cybersecurity Awareness',
          'Module 6: Assessment & Certification',
        ]),
      },
    }),

    prisma.trainingProgram.create({
      data: {
        title: 'Effective Communication Skills',
        description: 'Develop essential communication skills for professional success. Learn to communicate clearly, listen actively, give and receive feedback, and present with confidence.\n\nThis program covers:\n- Active listening techniques\n- Non-verbal communication\n- Written communication best practices\n- Presentation skills\n- Difficult conversations\n- Cross-cultural communication',
        category: 'SOFT_SKILLS',
        format: 'IN_PERSON',
        duration: '16 hours (4 weeks)',
        enrollmentCount: 10,
        maxEnrollment: 15,
        rating: 4.3,
        status: 'ACTIVE',
        hasCertification: false,
        startDate: getPastDate(5),
        endDate: getFutureDate(23),
        instructor: 'External Coach - Dr. Michelle Lee',
        curriculum: JSON.stringify([
          'Week 1: Foundations of Effective Communication',
          'Week 2: Active Listening & Empathy',
          'Week 3: Presentation Skills Workshop',
          'Week 4: Difficult Conversations & Conflict',
        ]),
      },
    }),

    // Upcoming programs
    prisma.trainingProgram.create({
      data: {
        title: 'Cloud Architecture with AWS',
        description: 'Comprehensive AWS cloud architecture training covering core services, design patterns, and best practices for building scalable, resilient cloud applications.\n\nPrerequisites: Basic understanding of networking and Linux.\n\nWhat You Will Learn:\n- AWS core services (EC2, S3, RDS, Lambda)\n- VPC design and networking\n- Security and IAM best practices\n- Cost optimization strategies\n- High availability and disaster recovery\n- Infrastructure as Code with CloudFormation',
        category: 'TECHNICAL',
        format: 'ONLINE',
        duration: '48 hours (12 weeks)',
        enrollmentCount: 5,
        maxEnrollment: 20,
        rating: 0,
        status: 'UPCOMING',
        hasCertification: true,
        startDate: getFutureDate(14),
        endDate: getFutureDate(98),
        instructor: 'External Trainer - AWS Certified Solutions Architect',
        curriculum: JSON.stringify([
          'Week 1-2: AWS Fundamentals & Account Setup',
          'Week 3-4: Compute Services (EC2, Lambda, ECS)',
          'Week 5-6: Storage & Database Services',
          'Week 7-8: Networking & VPC Design',
          'Week 9-10: Security, IAM & Compliance',
          'Week 11-12: Architecture Design & Capstone',
        ]),
      },
    }),

    prisma.trainingProgram.create({
      data: {
        title: 'New Employee Orientation Program',
        description: 'Comprehensive onboarding training for all new hires. Covers company culture, policies, tools, and resources to help new employees succeed from day one.\n\nTopics:\n- Company mission, vision & values\n- Organizational structure\n- HR policies and benefits overview\n- IT systems and tools setup\n- Communication channels and etiquette\n- Performance expectations',
        category: 'ONBOARDING',
        format: 'HYBRID',
        duration: '12 hours (1 week)',
        enrollmentCount: 3,
        maxEnrollment: 30,
        rating: 4.2,
        status: 'UPCOMING',
        hasCertification: false,
        startDate: getFutureDate(7),
        endDate: getFutureDate(14),
        instructor: 'HR Team',
        curriculum: JSON.stringify([
          'Day 1: Welcome & Company Overview',
          'Day 2: HR Policies & Benefits',
          'Day 3: IT Systems & Tools Training',
          'Day 4: Team Introductions & Culture',
          'Day 5: Q&A and Next Steps',
        ]),
      },
    }),

    prisma.trainingProgram.create({
      data: {
        title: 'Industrial Safety Certification',
        description: 'OSHA-aligned safety certification program for employees working in or visiting industrial environments. Covers hazard recognition, PPE usage, lockout/tagout procedures, and emergency response.\n\nImportant: This certification is required for all Engineering employees who visit client sites.',
        category: 'SAFETY',
        format: 'IN_PERSON',
        duration: '20 hours (3 days)',
        enrollmentCount: 0,
        maxEnrollment: 25,
        rating: 0,
        status: 'UPCOMING',
        hasCertification: true,
        startDate: getFutureDate(21),
        endDate: getFutureDate(23),
        instructor: 'Certified Safety Professional - John Martinez',
        curriculum: JSON.stringify([
          'Day 1: Hazard Recognition & Risk Assessment',
          'Day 2: PPE, Lockout/Tagout & Confined Spaces',
          'Day 3: Emergency Response & Certification Exam',
        ]),
      },
    }),

    // Completed programs
    prisma.trainingProgram.create({
      data: {
        title: 'Python for Data Analysis',
        description: 'Intensive Python training focused on data analysis using pandas, NumPy, and visualization libraries. Designed for non-technical employees who need data skills.\n\nCompleted outcomes:\n- 85% completion rate\n- Average score: 82/100\n- 15 employees certified',
        category: 'TECHNICAL',
        format: 'ONLINE',
        duration: '32 hours (8 weeks)',
        enrollmentCount: 15,
        maxEnrollment: 20,
        rating: 4.6,
        status: 'COMPLETED',
        hasCertification: true,
        startDate: getPastDate(60),
        endDate: getPastDate(10),
        instructor: 'Emily Park',
        curriculum: JSON.stringify([
          'Week 1: Python Basics & Environment Setup',
          'Week 2: Data Types & Control Flow',
          'Week 3: Functions & Modules',
          'Week 4: Pandas Fundamentals',
          'Week 5: Data Cleaning & Transformation',
          'Week 6: Data Visualization with Matplotlib',
          'Week 7: Statistical Analysis',
          'Week 8: Capstone Project',
        ]),
      },
    }),

    prisma.trainingProgram.create({
      data: {
        title: 'Project Management Fundamentals',
        description: 'Introduction to project management methodologies including Agile, Scrum, and Waterfall. Learn to plan, execute, and deliver projects on time and within budget.\n\nCompleted outcomes:\n- 92% completion rate\n- Average score: 88/100\n- 12 employees certified',
        category: 'LEADERSHIP',
        format: 'HYBRID',
        duration: '20 hours (5 weeks)',
        enrollmentCount: 12,
        maxEnrollment: 15,
        rating: 4.8,
        status: 'COMPLETED',
        hasCertification: true,
        startDate: getPastDate(45),
        endDate: getPastDate(10),
        instructor: 'External PMI Trainer',
        curriculum: JSON.stringify([
          'Week 1: Project Management Overview',
          'Week 2: Agile & Scrum Methodology',
          'Week 3: Planning & Estimation',
          'Week 4: Risk Management',
          'Week 5: Project Closure & Lessons Learned',
        ]),
      },
    }),

    // Archived program
    prisma.trainingProgram.create({
      data: {
        title: 'Legacy System Migration Training',
        description: 'Training program for the legacy system migration completed in Q3 2024. This program is now archived but materials remain available for reference.',
        category: 'TECHNICAL',
        format: 'SELF_PACED',
        duration: '16 hours',
        enrollmentCount: 8,
        maxEnrollment: 10,
        rating: 3.5,
        status: 'ARCHIVED',
        hasCertification: false,
        startDate: getPastDate(120),
        endDate: getPastDate(90),
        instructor: 'IT Department',
        curriculum: JSON.stringify([
          'Module 1: Legacy System Overview',
          'Module 2: Migration Strategy',
          'Module 3: Data Migration Procedures',
          'Module 4: Testing & Validation',
        ]),
      },
    }),
  ]);

  console.log(`  Created ${trainingPrograms.length} training programs`);

  // ═══════════════════════════════════════════════════════════════
  // TRAINING ENROLLMENTS
  // ═══════════════════════════════════════════════════════════════
  console.log('📝 Creating Training Enrollments...');

  const reactProgram = trainingPrograms[0];
  const leadershipProgram = trainingPrograms[1];
  const complianceProgram = trainingPrograms[2];
  const communicationProgram = trainingPrograms[3];
  const awsProgram = trainingPrograms[4];
  const orientationProgram = trainingPrograms[5];
  const pythonProgram = trainingPrograms[7];
  const pmProgram = trainingPrograms[8];
  const legacyProgram = trainingPrograms[9];

  const enrollments = await Promise.all([
    // React program enrollments
    prisma.trainingEnrollment.create({ data: { trainingProgramId: reactProgram.id, userId: userMap['james@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: reactProgram.id, userId: userMap['emily@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: reactProgram.id, userId: userMap['michael@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) } }),

    // Leadership program enrollments
    prisma.trainingEnrollment.create({ data: { trainingProgramId: leadershipProgram.id, userId: userMap['manager@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: leadershipProgram.id, userId: userMap['admin@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),

    // Compliance program enrollments - some completed
    prisma.trainingEnrollment.create({ data: { trainingProgramId: complianceProgram.id, userId: userMap['admin@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), score: 92, feedback: 'Good content, well structured. Could use more interactive elements.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: complianceProgram.id, userId: userMap['manager@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), score: 88, feedback: 'Comprehensive training. The cybersecurity section was especially useful.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: complianceProgram.id, userId: userMap['james@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: complianceProgram.id, userId: userMap['emily@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), score: 95, feedback: 'Excellent program! Very relevant and practical.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: complianceProgram.id, userId: userMap['michael@ems.com']!.id, status: 'ENROLLED', enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: complianceProgram.id, userId: userMap['lisa@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } }),

    // Communication program enrollments
    prisma.trainingEnrollment.create({ data: { trainingProgramId: communicationProgram.id, userId: userMap['lisa@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: communicationProgram.id, userId: userMap['james@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: communicationProgram.id, userId: userMap['michael@ems.com']!.id, status: 'IN_PROGRESS', enrolledAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) } }),

    // AWS program enrollments (upcoming)
    prisma.trainingEnrollment.create({ data: { trainingProgramId: awsProgram.id, userId: userMap['james@ems.com']!.id, status: 'ENROLLED', enrolledAt: new Date() } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: awsProgram.id, userId: userMap['emily@ems.com']!.id, status: 'ENROLLED', enrolledAt: new Date() } }),

    // Orientation program enrollments (upcoming)
    prisma.trainingEnrollment.create({ data: { trainingProgramId: orientationProgram.id, userId: userMap['lisa@ems.com']!.id, status: 'ENROLLED', enrolledAt: new Date() } }),

    // Python program enrollments (completed)
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pythonProgram.id, userId: userMap['james@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), score: 78, feedback: 'Good introductory course. Would love an advanced follow-up.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pythonProgram.id, userId: userMap['emily@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), score: 92, feedback: 'Instructor was excellent! Very engaging and knowledgeable.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pythonProgram.id, userId: userMap['manager@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), score: 85, feedback: 'Helpful for my daily work. The capstone project was a great learning experience.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pythonProgram.id, userId: userMap['michael@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 57 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), score: 72, feedback: 'A bit fast-paced for beginners but overall good content.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pythonProgram.id, userId: userMap['admin@ems.com']!.id, status: 'CANCELLED', enrolledAt: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000), feedback: 'Had to cancel due to conflicting schedule' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pythonProgram.id, userId: userMap['lisa@ems.com']!.id, status: 'FAILED', enrolledAt: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), score: 45, feedback: 'Struggled with the programming concepts. Will need additional support.' } }),

    // PM program enrollments (completed)
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pmProgram.id, userId: userMap['manager@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), score: 94, feedback: 'One of the best training programs. Very practical and applicable.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pmProgram.id, userId: userMap['admin@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), score: 88, feedback: 'Good overview of methodologies. The Agile section was particularly valuable.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: pmProgram.id, userId: userMap['james@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 43 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), score: 82, feedback: 'Helpful for understanding project workflows.' } }),

    // Legacy program enrollments (archived)
    prisma.trainingEnrollment.create({ data: { trainingProgramId: legacyProgram.id, userId: userMap['james@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), score: 70, feedback: 'Useful at the time but content is now outdated.' } }),
    prisma.trainingEnrollment.create({ data: { trainingProgramId: legacyProgram.id, userId: userMap['emily@ems.com']!.id, status: 'COMPLETED', enrolledAt: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000), completedAt: new Date(Date.now() - 92 * 24 * 60 * 60 * 1000), score: 75, feedback: 'Adequate training for the migration project.' } }),
  ]);

  console.log(`  Created ${enrollments.length} training enrollments`);

  // Final count verification
  const finalCounts = {
    jobPostings: await prisma.jobPosting.count(),
    candidates: await prisma.candidate.count(),
    onboardingPlans: await prisma.onboardingPlan.count(),
    onboardingTasks: await prisma.onboardingTask.count(),
    trainingPrograms: await prisma.trainingProgram.count(),
    trainingEnrollments: await prisma.trainingEnrollment.count(),
  };

  console.log('\n✅ HRM Seeding Complete!');
  console.log('Final counts:');
  console.log(`  Job Postings: ${finalCounts.jobPostings}`);
  console.log(`  Candidates: ${finalCounts.candidates}`);
  console.log(`  Onboarding Plans: ${finalCounts.onboardingPlans}`);
  console.log(`  Onboarding Tasks: ${finalCounts.onboardingTasks}`);
  console.log(`  Training Programs: ${finalCounts.trainingPrograms}`);
  console.log(`  Training Enrollments: ${finalCounts.trainingEnrollments}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error seeding HRM data:', e);
  process.exit(1);
});
