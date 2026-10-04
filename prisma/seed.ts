import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function getPastMonth(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.notification.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.request.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.taskTemplate.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.companyHoliday.deleteMany();
  await prisma.leavePolicy.deleteMany();
  await prisma.systemRule.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.onboardingTask.deleteMany();
  await prisma.onboardingPlan.deleteMany();
  await prisma.trainingEnrollment.deleteMany();
  await prisma.trainingProgram.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.lifecycleEvent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // ─── Departments ───────────────────────────────────────────
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const design = await prisma.department.create({ data: { name: 'Design' } });
  const marketing = await prisma.department.create({ data: { name: 'Marketing' } });
  const hr = await prisma.department.create({ data: { name: 'HR' } });
  const finance = await prisma.department.create({ data: { name: 'Finance' } });

  const deptMap = { engineering, design, marketing, hr, finance };

  // ─── Shifts ────────────────────────────────────────────────
  console.log('⏰ Generating shifts...');
  const standardShift = await prisma.shift.create({
    data: {
      name: 'Standard',
      startTime: '09:00',
      endTime: '17:00',
      gracePeriod: 15,
      halfDayMin: 4.5,
      overtimeThreshold: 9,
      isDefault: true,
    },
  });

  const morningShift = await prisma.shift.create({
    data: {
      name: 'Morning',
      startTime: '06:00',
      endTime: '14:00',
      gracePeriod: 15,
      halfDayMin: 4.5,
      overtimeThreshold: 9,
      isDefault: false,
    },
  });

  const nightShift = await prisma.shift.create({
    data: {
      name: 'Night',
      startTime: '22:00',
      endTime: '06:00',
      gracePeriod: 15,
      halfDayMin: 4.5,
      overtimeThreshold: 9,
      isDefault: false,
    },
  });

  // ─── Users ─────────────────────────────────────────────────
  console.log('🔐 Hashing demo passwords with bcrypt...');
  const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  const managerHash = await bcrypt.hash('manager123', SALT_ROUNDS);
  const empHash = await bcrypt.hash('emp123', SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      name: 'Alex Morgan',
      email: 'admin@ems.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      departmentId: engineering.id,
      workMode: 'OFFICE',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Sarah Chen',
      email: 'manager@ems.com',
      passwordHash: managerHash,
      role: 'MANAGER',
      departmentId: engineering.id,
      pinCode: '1111',
      workMode: 'HYBRID',
    },
  });

  // Set Sarah Chen as manager of Engineering
  await prisma.department.update({
    where: { id: engineering.id },
    data: { managerId: manager.id },
  });

  const james = await prisma.user.create({
    data: {
      name: 'James Wilson',
      email: 'james@ems.com',
      passwordHash: empHash,
      role: 'EMPLOYEE',
      departmentId: engineering.id,
      pinCode: '2222',
      workMode: 'OFFICE',
    },
  });

  const emily = await prisma.user.create({
    data: {
      name: 'Emily Park',
      email: 'emily@ems.com',
      passwordHash: empHash,
      role: 'EMPLOYEE',
      departmentId: engineering.id,
      pinCode: '3333',
      workMode: 'REMOTE',
    },
  });

  const michael = await prisma.user.create({
    data: {
      name: 'Michael Brown',
      email: 'michael@ems.com',
      passwordHash: empHash,
      role: 'EMPLOYEE',
      departmentId: design.id,
      pinCode: '4444',
      workMode: 'OFFICE',
    },
  });

  const lisa = await prisma.user.create({
    data: {
      name: 'Lisa Taylor',
      email: 'lisa@ems.com',
      passwordHash: empHash,
      role: 'EMPLOYEE',
      departmentId: marketing.id,
      pinCode: '5555',
      workMode: 'REMOTE',
    },
  });

  const employees = [james, emily, michael, lisa];
  const allUsers = [admin, manager, james, emily, michael, lisa];

  // ─── Attendance + AttendanceLogs (past 30 days) ────────────
  console.log('📅 Generating attendance & attendance log records...');
  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const dateStr = getPastDate(daysAgo);
    const dayOfWeek = new Date(dateStr).getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (const emp of employees) {
      const rand = Math.random();

      if (rand < 0.7) {
        // PRESENT - clock in between 8:45 and 9:10
        const clockInMin = 45 + Math.floor(Math.random() * 25);
        const clockOutMin = Math.floor(Math.random() * 30);
        const firstIn = formatTime(8, clockInMin >= 60 ? 59 : clockInMin);
        const lastOut = formatTime(17, clockOutMin);

        // Calculate total hours
        const inParts = firstIn.split(':').map(Number);
        const outParts = lastOut.split(':').map(Number);
        const totalMinutes = (outParts[0] * 60 + outParts[1]) - (inParts[0] * 60 + inParts[1]);
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
        const overtimeHours = totalHours > 9 ? Math.round((totalHours - 9) * 100) / 100 : null;

        // Determine status based on standard shift (09:00 + 15min grace = 09:15)
        const isLate = firstIn > '09:15:00';

        await prisma.attendance.create({
          data: {
            userId: emp.id,
            date: dateStr,
            firstIn,
            lastOut,
            totalHours,
            status: isLate ? 'LATE' : 'PRESENT',
            method: 'PIN',
            overtimeHours,
          },
        });

        // Create corresponding attendance logs
        const punchInTime = new Date(`${dateStr}T${firstIn}Z`);
        const punchOutTime = new Date(`${dateStr}T${lastOut}Z`);

        await prisma.attendanceLog.create({
          data: {
            userId: emp.id,
            punchType: 'CLOCK_IN',
            punchTime: punchInTime,
            method: 'PIN',
            ipAddress: '192.168.1.100',
          },
        });

        await prisma.attendanceLog.create({
          data: {
            userId: emp.id,
            punchType: 'CLOCK_OUT',
            punchTime: punchOutTime,
            method: 'PIN',
            ipAddress: '192.168.1.100',
          },
        });

      } else if (rand < 0.85) {
        // LATE - clock in after 9:15
        const clockInMin = 15 + Math.floor(Math.random() * 45);
        const clockOutMin = Math.floor(Math.random() * 30);
        const firstIn = formatTime(9, clockInMin >= 60 ? 59 : clockInMin);
        const lastOut = formatTime(17, clockOutMin);

        const inParts = firstIn.split(':').map(Number);
        const outParts = lastOut.split(':').map(Number);
        const totalMinutes = (outParts[0] * 60 + outParts[1]) - (inParts[0] * 60 + inParts[1]);
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
        const overtimeHours = totalHours > 9 ? Math.round((totalHours - 9) * 100) / 100 : null;

        await prisma.attendance.create({
          data: {
            userId: emp.id,
            date: dateStr,
            firstIn,
            lastOut,
            totalHours,
            status: 'LATE',
            method: 'PIN',
            overtimeHours,
          },
        });

        const punchInTime = new Date(`${dateStr}T${firstIn}Z`);
        const punchOutTime = new Date(`${dateStr}T${lastOut}Z`);

        await prisma.attendanceLog.create({
          data: {
            userId: emp.id,
            punchType: 'CLOCK_IN',
            punchTime: punchInTime,
            method: 'PIN',
            ipAddress: '192.168.1.100',
            isFlagged: firstIn > '09:15:00',
            flagReason: firstIn > '09:15:00' ? 'LATE_ARRIVAL' : null,
          },
        });

        await prisma.attendanceLog.create({
          data: {
            userId: emp.id,
            punchType: 'CLOCK_OUT',
            punchTime: punchOutTime,
            method: 'PIN',
            ipAddress: '192.168.1.100',
          },
        });

      } else if (rand < 0.95) {
        // ABSENT
        await prisma.attendance.create({
          data: {
            userId: emp.id,
            date: dateStr,
            status: 'ABSENT',
            method: 'PIN',
          },
        });
        // No attendance logs for absent days

      } else {
        // HALF_DAY
        const clockInMin = 50 + Math.floor(Math.random() * 10);
        const firstIn = formatTime(8, clockInMin >= 60 ? 59 : clockInMin);
        const lastOut = formatTime(13, Math.floor(Math.random() * 30));

        const inParts = firstIn.split(':').map(Number);
        const outParts = lastOut.split(':').map(Number);
        const totalMinutes = (outParts[0] * 60 + outParts[1]) - (inParts[0] * 60 + inParts[1]);
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

        await prisma.attendance.create({
          data: {
            userId: emp.id,
            date: dateStr,
            firstIn,
            lastOut,
            totalHours,
            status: 'HALF_DAY',
            method: 'PIN',
          },
        });

        const punchInTime = new Date(`${dateStr}T${firstIn}Z`);
        const punchOutTime = new Date(`${dateStr}T${lastOut}Z`);

        await prisma.attendanceLog.create({
          data: {
            userId: emp.id,
            punchType: 'CLOCK_IN',
            punchTime: punchInTime,
            method: 'PIN',
            ipAddress: '192.168.1.100',
          },
        });

        await prisma.attendanceLog.create({
          data: {
            userId: emp.id,
            punchType: 'CLOCK_OUT',
            punchTime: punchOutTime,
            method: 'PIN',
            ipAddress: '192.168.1.100',
          },
        });
      }
    }
  }

  // ─── Today's Attendance Records ──────────────────────────────────────
  console.log('📅 Generating today\'s attendance records...');
  const today = getPastDate(0);
  const todayIsWeekend = new Date(today).getDay() === 0 || new Date(today).getDay() === 6;

  if (!todayIsWeekend) {
    // admin (Alex): PRESENT, clocked in 08:52
    const adminFirstIn = '08:52:00';
    const adminLastOut = null; // still working
    await prisma.attendance.create({
      data: {
        userId: admin.id,
        date: today,
        firstIn: adminFirstIn,
        lastOut: adminLastOut,
        totalHours: 0,
        status: 'PRESENT',
        method: 'PIN',
      },
    });
    await prisma.attendanceLog.create({
      data: {
        userId: admin.id,
        punchType: 'CLOCK_IN',
        punchTime: new Date(`${today}T${adminFirstIn}Z`),
        method: 'PIN',
        ipAddress: '192.168.1.100',
      },
    });

    // manager (Sarah): LATE, clocked in 09:22
    const managerFirstIn = '09:22:00';
    await prisma.attendance.create({
      data: {
        userId: manager.id,
        date: today,
        firstIn: managerFirstIn,
        lastOut: null,
        totalHours: 0,
        status: 'LATE',
        method: 'PIN',
      },
    });
    await prisma.attendanceLog.create({
      data: {
        userId: manager.id,
        punchType: 'CLOCK_IN',
        punchTime: new Date(`${today}T${managerFirstIn}Z`),
        method: 'PIN',
        ipAddress: '192.168.1.100',
        isFlagged: true,
        flagReason: 'LATE_ARRIVAL',
      },
    });

    // james: PRESENT, clocked in 08:47
    const jamesFirstIn = '08:47:00';
    await prisma.attendance.create({
      data: {
        userId: james.id,
        date: today,
        firstIn: jamesFirstIn,
        lastOut: null,
        totalHours: 0,
        status: 'PRESENT',
        method: 'PIN',
      },
    });
    await prisma.attendanceLog.create({
      data: {
        userId: james.id,
        punchType: 'CLOCK_IN',
        punchTime: new Date(`${today}T${jamesFirstIn}Z`),
        method: 'PIN',
        ipAddress: '192.168.1.100',
      },
    });

    // emily: PRESENT, clocked in 08:55 (remote/WEB method)
    const emilyFirstIn = '08:55:00';
    await prisma.attendance.create({
      data: {
        userId: emily.id,
        date: today,
        firstIn: emilyFirstIn,
        lastOut: null,
        totalHours: 0,
        status: 'PRESENT',
        method: 'WEB',
      },
    });
    await prisma.attendanceLog.create({
      data: {
        userId: emily.id,
        punchType: 'CLOCK_IN',
        punchTime: new Date(`${today}T${emilyFirstIn}Z`),
        method: 'WEB',
        ipAddress: '203.0.113.42',
        gpsLatitude: 31.2304,
        gpsLongitude: 121.4737,
      },
    });

    // michael: PRESENT, clocked in 09:03
    const michaelFirstIn = '09:03:00';
    await prisma.attendance.create({
      data: {
        userId: michael.id,
        date: today,
        firstIn: michaelFirstIn,
        lastOut: null,
        totalHours: 0,
        status: 'PRESENT',
        method: 'PIN',
      },
    });
    await prisma.attendanceLog.create({
      data: {
        userId: michael.id,
        punchType: 'CLOCK_IN',
        punchTime: new Date(`${today}T${michaelFirstIn}Z`),
        method: 'PIN',
        ipAddress: '192.168.1.50',
      },
    });

    // lisa: Not arrived yet (no attendance record for today)
    // Intentionally skipping lisa to show "Not Arrived" status
  }

  // ─── Extra attendance logs for demo (face recognition, manual, flagged) ──────
  console.log('📝 Adding demo attendance logs...');
  const yesterday = getPastDate(1);

  // James also has a FACE recognition log from today (extra demo)
  await prisma.attendanceLog.create({
    data: {
      userId: james.id,
      punchType: 'CLOCK_IN',
      punchTime: new Date(`${today}T08:47:05Z`),
      method: 'FACE',
      confidence: 0.95,
      ipAddress: '192.168.1.50',
    },
  });

  // Michael flagged punch - IP not in office network
  await prisma.attendanceLog.create({
    data: {
      userId: michael.id,
      punchType: 'CLOCK_IN',
      punchTime: new Date(`${yesterday}T09:30:00Z`),
      method: 'WEB',
      ipAddress: '10.0.0.55',
      isFlagged: true,
      flagReason: 'IP_NOT_IN_OFFICE_NETWORK',
    },
  });

  // Manager manually added a punch for Lisa
  await prisma.attendanceLog.create({
    data: {
      userId: lisa.id,
      punchType: 'CLOCK_IN',
      punchTime: new Date(`${yesterday}T09:00:00Z`),
      method: 'MANUAL',
      editedBy: manager.id,
    },
  });

  // ─── Leaves ────────────────────────────────────────────────
  console.log('🏖️ Generating leaves...');
  await prisma.leave.create({
    data: {
      userId: james.id,
      type: 'SICK',
      startDate: getPastDate(25),
      endDate: getPastDate(24),
      reason: 'Feeling unwell, doctor visit required',
      status: 'APPROVED',
      managerId: manager.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 23),
    },
  });

  await prisma.leave.create({
    data: {
      userId: emily.id,
      type: 'VACATION',
      startDate: getPastDate(10),
      endDate: getPastDate(7),
      reason: 'Family vacation planned',
      status: 'APPROVED',
      managerId: manager.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 9),
    },
  });

  await prisma.leave.create({
    data: {
      userId: michael.id,
      type: 'CASUAL',
      startDate: getPastDate(2),
      endDate: getPastDate(2),
      reason: 'Personal errand',
      status: 'REJECTED',
      managerId: manager.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1),
    },
  });

  await prisma.leave.create({
    data: {
      userId: lisa.id,
      type: 'CASUAL',
      startDate: getPastDate(1),
      endDate: getPastDate(0),
      reason: 'Need a mental health day',
      status: 'PENDING',
    },
  });

  await prisma.leave.create({
    data: {
      userId: james.id,
      type: 'VACATION',
      startDate: getPastDate(-3),
      endDate: getPastDate(-1),
      reason: 'Planned vacation next week',
      status: 'PENDING',
    },
  });

  // Extra leaves for timeline richness
  await prisma.leave.create({
    data: {
      userId: emily.id,
      type: 'SICK',
      startDate: getPastDate(-5),
      endDate: getPastDate(-4),
      reason: 'Not feeling well',
      status: 'APPROVED',
      managerId: manager.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.leave.create({
    data: {
      userId: michael.id,
      type: 'VACATION',
      startDate: getPastDate(-8),
      endDate: getPastDate(-5),
      reason: 'Annual vacation',
      status: 'PENDING',
    },
  });

  await prisma.leave.create({
    data: {
      userId: lisa.id,
      type: 'SICK',
      startDate: getPastDate(15),
      endDate: getPastDate(14),
      reason: 'Doctor appointment',
      status: 'APPROVED',
      managerId: manager.id,
      reviewedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
    },
  });

  // Pending leave from 2 days ago that hasn't been reviewed (escalation)
  await prisma.leave.create({
    data: {
      userId: james.id,
      type: 'CASUAL',
      startDate: getPastDate(-2),
      endDate: getPastDate(-2),
      reason: 'Urgent personal matter',
      status: 'PENDING',
    },
  });

  // ─── Leave Policies ──────────────────────────────────────────
  console.log('📋 Generating leave policies...');
  const sickPolicy = await prisma.leavePolicy.create({
    data: {
      name: 'Sick Leave',
      type: 'SICK',
      annualQuota: 10,
      requiresApproval: true,
      requiresDocument: true,
      documentThresholdDays: 3,
      carriesForward: false,
      maxCarryForward: 0,
      isEncashable: false,
      isPaid: true,
      color: '#f43f5e',
    },
  });

  const casualPolicy = await prisma.leavePolicy.create({
    data: {
      name: 'Casual Leave',
      type: 'CASUAL',
      annualQuota: 12,
      requiresApproval: true,
      requiresDocument: false,
      documentThresholdDays: 99,
      carriesForward: true,
      maxCarryForward: 3,
      isEncashable: true,
      isPaid: true,
      color: '#f59e0b',
    },
  });

  const vacationPolicy = await prisma.leavePolicy.create({
    data: {
      name: 'Vacation Leave',
      type: 'VACATION',
      annualQuota: 15,
      requiresApproval: true,
      requiresDocument: false,
      documentThresholdDays: 99,
      carriesForward: true,
      maxCarryForward: 5,
      isEncashable: true,
      isPaid: true,
      color: '#10b981',
    },
  });

  await prisma.leavePolicy.create({
    data: {
      name: 'Maternity Leave',
      type: 'MATERNITY',
      annualQuota: 90,
      requiresApproval: true,
      requiresDocument: true,
      documentThresholdDays: 1,
      carriesForward: false,
      maxCarryForward: 0,
      isEncashable: false,
      isPaid: true,
      color: '#ec4899',
    },
  });

  await prisma.leavePolicy.create({
    data: {
      name: 'Paternity Leave',
      type: 'PATERNITY',
      annualQuota: 15,
      requiresApproval: true,
      requiresDocument: true,
      documentThresholdDays: 1,
      carriesForward: false,
      maxCarryForward: 0,
      isEncashable: false,
      isPaid: true,
      color: '#8b5cf6',
    },
  });

  await prisma.leavePolicy.create({
    data: {
      name: 'Unpaid Leave',
      type: 'UNPAID',
      annualQuota: 30,
      requiresApproval: true,
      requiresDocument: false,
      documentThresholdDays: 99,
      carriesForward: false,
      maxCarryForward: 0,
      isEncashable: false,
      isPaid: false,
      color: '#64748b',
    },
  });

  // ─── Company Holidays ────────────────────────────────────────
  console.log('🎉 Generating company holidays...');
  const currentYear = new Date().getFullYear();
  const holidays = [
    { name: 'New Year\'s Day', date: `${currentYear}-01-01`, type: 'PUBLIC', isRecurring: true },
    { name: 'Spring Festival', date: `${currentYear}-01-29`, type: 'PUBLIC', isRecurring: false },
    { name: 'Labor Day', date: `${currentYear}-05-01`, type: 'PUBLIC', isRecurring: true },
    { name: 'Independence Day', date: `${currentYear}-08-14`, type: 'PUBLIC', isRecurring: true },
    { name: 'Eid ul-Fitr', date: `${currentYear}-03-30`, type: 'PUBLIC', isRecurring: false },
    { name: 'Eid ul-Adha', date: `${currentYear}-06-07`, type: 'PUBLIC', isRecurring: false },
    { name: 'Christmas Day', date: `${currentYear}-12-25`, type: 'PUBLIC', isRecurring: true },
    { name: 'Company Foundation Day', date: `${currentYear}-07-15`, type: 'COMPANY', isRecurring: true },
    { name: 'Year-End Break', date: `${currentYear}-12-31`, type: 'COMPANY', isRecurring: true },
  ];

  for (const holiday of holidays) {
    await prisma.companyHoliday.create({ data: holiday });
  }

  // ─── Leave Balances ──────────────────────────────────────────
  console.log('⚖️ Generating leave balances...');
  const year = new Date().getFullYear();
  for (const emp of allUsers) {
    // Sick balance
    await prisma.leaveBalance.create({
      data: {
        userId: emp.id,
        leaveType: 'SICK',
        total: 10,
        used: emp.id === james.id ? 2 : emp.id === lisa.id ? 1 : emp.id === emily.id ? 1 : 0,
        carriedForward: 0,
        year,
      },
    });
    // Casual balance
    await prisma.leaveBalance.create({
      data: {
        userId: emp.id,
        leaveType: 'CASUAL',
        total: 12,
        used: emp.id === michael.id ? 1 : emp.id === lisa.id ? 2 : emp.id === james.id ? 1 : 0,
        carriedForward: emp.id === james.id ? 2 : emp.id === manager.id ? 1 : 0,
        year,
      },
    });
    // Vacation balance
    await prisma.leaveBalance.create({
      data: {
        userId: emp.id,
        leaveType: 'VACATION',
        total: 15,
        used: emp.id === emily.id ? 4 : emp.id === james.id ? 3 : 0,
        carriedForward: emp.id === emily.id ? 3 : emp.id === james.id ? 2 : 0,
        year,
      },
    });
  }

  // ─── Tasks ─────────────────────────────────────────────────
  console.log('📋 Generating tasks...');
  await prisma.task.create({
    data: {
      title: 'Implement user authentication',
      description: 'Set up JWT-based authentication with login, logout, and session management',
      assigneeId: james.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'DONE',
      priority: 'HIGH',
      dueDate: getPastDate(5),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Design dashboard layout',
      description: 'Create wireframes and high-fidelity mockups for the main dashboard',
      assigneeId: michael.id,
      reporterId: manager.id,
      departmentId: design.id,
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      dueDate: getPastDate(-2),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Build attendance API',
      description: 'Create REST API endpoints for clock in/out, attendance history, and reports',
      assigneeId: emily.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: getPastDate(-5),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Create marketing campaign',
      description: 'Plan and execute Q2 marketing campaign for product launch',
      assigneeId: lisa.id,
      reporterId: admin.id,
      departmentId: marketing.id,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: getPastDate(-10),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      assigneeId: james.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'TODO',
      priority: 'LOW',
      dueDate: getPastDate(-7),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Design component library',
      description: 'Create reusable UI components following the design system',
      assigneeId: michael.id,
      reporterId: manager.id,
      departmentId: design.id,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: getPastDate(-4),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Write API documentation',
      description: 'Document all API endpoints with request/response examples',
      assigneeId: emily.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'TODO',
      priority: 'LOW',
      dueDate: getPastDate(-8),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Performance optimization',
      description: 'Optimize database queries and frontend rendering performance',
      assigneeId: james.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'DONE',
      priority: 'HIGH',
      dueDate: getPastDate(3),
    },
  });

  // Additional tasks for enterprise view
  await prisma.task.create({
    data: {
      title: 'Fix login session timeout bug',
      description: 'Users are being logged out after 15 minutes of inactivity even when actively using the app',
      assigneeId: james.id,
      reporterId: admin.id,
      departmentId: engineering.id,
      status: 'BLOCKED',
      priority: 'URGENT',
      dueDate: getPastDate(2),
      isBlocked: true,
      blockedReason: 'Waiting for DevOps to update Redis configuration',
    },
  });

  await prisma.task.create({
    data: {
      title: 'Implement leave approval workflow',
      description: 'Build multi-level approval chain for leave requests with auto-escalation',
      assigneeId: emily.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: getPastDate(-3),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Create onboarding tutorial',
      description: 'Design an interactive walkthrough for new users of the EMS platform',
      assigneeId: michael.id,
      reporterId: admin.id,
      departmentId: design.id,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: getPastDate(-12),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Social media content calendar',
      description: 'Plan and schedule social media posts for the next quarter',
      assigneeId: lisa.id,
      reporterId: admin.id,
      departmentId: marketing.id,
      status: 'IN_PROGRESS',
      priority: 'LOW',
      dueDate: getPastDate(-6),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Database migration script',
      description: 'Write and test migration scripts for the v2 schema changes',
      assigneeId: james.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'IN_REVIEW',
      priority: 'HIGH',
      dueDate: getPastDate(-1),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Accessibility audit',
      description: 'Perform WCAG 2.1 AA compliance audit on all public-facing pages',
      assigneeId: michael.id,
      reporterId: admin.id,
      departmentId: design.id,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: getPastDate(-14),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Email notification templates',
      description: 'Design and implement HTML email templates for all system notifications',
      assigneeId: emily.id,
      reporterId: manager.id,
      departmentId: engineering.id,
      status: 'DONE',
      priority: 'MEDIUM',
      dueDate: getPastDate(8),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Quarterly budget report',
      description: 'Prepare the Q1 budget analysis and projections for Q2',
      assigneeId: lisa.id,
      reporterId: admin.id,
      departmentId: marketing.id,
      status: 'DONE',
      priority: 'HIGH',
      dueDate: getPastDate(1),
    },
  });

  await prisma.task.create({
    data: {
      title: 'Mobile responsive fixes',
      description: 'Fix layout issues on tablets and mobile devices across all dashboards',
      assigneeId: michael.id,
      reporterId: manager.id,
      departmentId: design.id,
      status: 'BLOCKED',
      priority: 'MEDIUM',
      dueDate: getPastDate(0),
      isBlocked: true,
      blockedReason: 'Awaiting design specifications from UX team',
    },
  });

  await prisma.task.create({
    data: {
      title: 'API rate limiting implementation',
      description: 'Add rate limiting middleware to all public API endpoints',
      assigneeId: james.id,
      reporterId: admin.id,
      departmentId: engineering.id,
      status: 'TODO',
      priority: 'HIGH',
      dueDate: getPastDate(-2),
    },
  });

  // ─── Requests ──────────────────────────────────────────────
  console.log('📝 Generating requests...');
  await prisma.request.create({
    data: {
      userId: james.id,
      type: 'EXPENSE',
      payload: JSON.stringify({ amount: 250, category: 'Travel', description: 'Conference travel reimbursement' }),
      status: 'APPROVED',
      reviewerId: manager.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 10),
    },
  });

  await prisma.request.create({
    data: {
      userId: emily.id,
      type: 'ASSET',
      payload: JSON.stringify({ item: 'Monitor', specification: '27" 4K Display', quantity: 1 }),
      status: 'PENDING',
    },
  });

  await prisma.request.create({
    data: {
      userId: michael.id,
      type: 'EXPENSE',
      payload: JSON.stringify({ amount: 120, category: 'Software', description: 'Design tool subscription' }),
      status: 'UNDER_REVIEW',
    },
  });

  await prisma.request.create({
    data: {
      userId: lisa.id,
      type: 'ASSET',
      payload: JSON.stringify({ item: 'Laptop', specification: 'MacBook Pro 16"', quantity: 1 }),
      status: 'REJECTED',
      reviewerId: admin.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 5),
    },
  });

  await prisma.request.create({
    data: {
      userId: james.id,
      type: 'SHIFT_SWAP',
      payload: JSON.stringify({ fromDate: getPastDate(-2), toDate: getPastDate(-5), withUser: emily.name }),
      status: 'PENDING',
    },
  });

  // Additional requests for enterprise view
  await prisma.request.create({
    data: {
      userId: james.id,
      type: 'LEAVE',
      title: 'Annual vacation - March',
      description: 'Planning a family vacation for the last week of March',
      payload: JSON.stringify({ startDate: getPastDate(-22), endDate: getPastDate(-28), leaveType: 'vacation' }),
      status: 'APPROVED',
      priority: 'MEDIUM',
      reviewerId: manager.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 15),
    },
  });

  await prisma.request.create({
    data: {
      userId: emily.id,
      type: 'TRAINING',
      title: 'AWS Certification Training',
      description: 'Requesting approval for AWS Solutions Architect certification course',
      payload: JSON.stringify({ course: 'AWS Solutions Architect', provider: 'A Cloud Guru', cost: 500 }),
      status: 'UNDER_REVIEW',
      priority: 'HIGH',
    },
  });

  await prisma.request.create({
    data: {
      userId: michael.id,
      type: 'EQUIPMENT',
      title: 'Ergonomic standing desk',
      description: 'Requesting an adjustable standing desk for health reasons per doctor recommendation',
      payload: JSON.stringify({ equipmentType: 'standing-desk', justification: 'Doctor recommendation for back pain' }),
      status: 'PENDING',
      priority: 'MEDIUM',
    },
  });

  await prisma.request.create({
    data: {
      userId: lisa.id,
      type: 'TRAVEL',
      title: 'Marketing conference - San Francisco',
      description: 'Requesting travel approval for the Digital Marketing Summit 2025',
      payload: JSON.stringify({ destination: 'San Francisco, CA', travelDates: 'Mar 15-18, 2025', estimatedCost: 2800, purpose: 'Annual marketing conference' }),
      status: 'PENDING',
      priority: 'HIGH',
      amount: 2800,
    },
  });

  await prisma.request.create({
    data: {
      userId: james.id,
      type: 'IT_SUPPORT',
      title: 'VPN connection issues',
      description: 'Unable to connect to company VPN from home office since yesterday',
      payload: JSON.stringify({ issueCategory: 'network', device: 'MacBook Pro 16"', urgency: 'high' }),
      status: 'APPROVED',
      priority: 'URGENT',
      reviewerId: admin.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2),
      reviewComment: 'IT team has been notified. They will reach out within 24 hours.',
    },
  });

  await prisma.request.create({
    data: {
      userId: emily.id,
      type: 'LEAVE',
      title: 'Sick leave - flu',
      description: 'Need sick leave for recovery from flu',
      payload: JSON.stringify({ startDate: getPastDate(1), endDate: getPastDate(3), leaveType: 'sick' }),
      status: 'APPROVED',
      priority: 'HIGH',
      reviewerId: manager.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1),
    },
  });

  await prisma.request.create({
    data: {
      userId: michael.id,
      type: 'EXPENSE',
      title: 'Figma team subscription',
      description: 'Annual Figma team plan for the design department',
      payload: JSON.stringify({ amount: 540, category: 'Software', receipt: 'REC-2025-0042' }),
      status: 'REJECTED',
      priority: 'LOW',
      reviewerId: admin.id,
      reviewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 7),
      reviewComment: 'Already covered under existing enterprise license. Please use the company Figma account.',
    },
  });

  await prisma.request.create({
    data: {
      userId: lisa.id,
      type: 'LEAVE',
      title: 'Casual leave - personal day',
      description: 'Need a personal day to attend to family matters',
      payload: JSON.stringify({ startDate: getPastDate(-8), endDate: getPastDate(-8), leaveType: 'casual' }),
      status: 'PENDING',
      priority: 'LOW',
    },
  });

  await prisma.request.create({
    data: {
      userId: james.id,
      type: 'EQUIPMENT',
      title: 'Mechanical keyboard request',
      description: 'Requesting a mechanical keyboard for improved typing comfort during long coding sessions',
      payload: JSON.stringify({ equipmentType: 'keyboard', justification: 'Ergonomic need for extended coding sessions' }),
      status: 'ESCALATED',
      priority: 'MEDIUM',
      escalatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3),
      escalatedBy: manager.id,
    },
  });

  // ─── Complaints ────────────────────────────────────────────
  console.log('📢 Generating complaints...');
  await prisma.complaint.create({
    data: {
      userId: james.id,
      subject: 'Office temperature too cold',
      description: 'The AC in the engineering floor is set too low, making it uncomfortable to work. Multiple team members have reported feeling too cold.',
      status: 'OPEN',
      isAnonymous: false,
    },
  });

  await prisma.complaint.create({
    data: {
      userId: null,
      subject: 'Slow internet connection',
      description: 'The office WiFi has been extremely slow for the past week, affecting productivity across all departments.',
      status: 'INVESTIGATING',
      isAnonymous: true,
    },
  });

  await prisma.complaint.create({
    data: {
      userId: lisa.id,
      subject: 'Parking space allocation',
      description: 'The parking lot is always full by 9 AM. Need better allocation or more spaces for employees.',
      status: 'RESOLVED',
      resolutionNotes: 'Additional parking spots have been allocated in Lot B for employees. Updated parking policy has been shared via email.',
      isAnonymous: false,
    },
  });

  // Additional complaints for enterprise view
  await prisma.complaint.create({
    data: {
      userId: emily.id,
      subject: 'Outdated development tools',
      description: 'Our development environment uses outdated versions of key tools. IDE licenses are expired and build servers are running old Node versions.',
      category: 'IT',
      priority: 'HIGH',
      severity: 'NORMAL',
      status: 'IN_PROGRESS',
      isAnonymous: false,
      assignedToId: admin.id,
    },
  });

  await prisma.complaint.create({
    data: {
      userId: michael.id,
      subject: 'Ergonomic equipment needed',
      description: 'Several designers are experiencing wrist strain. We need proper ergonomic mice and keyboard trays to prevent RSI.',
      category: 'FACILITIES',
      priority: 'MEDIUM',
      severity: 'SENSITIVE',
      status: 'OPEN',
      isAnonymous: false,
    },
  });

  await prisma.complaint.create({
    data: {
      userId: james.id,
      subject: 'Unclear overtime compensation policy',
      description: 'The overtime compensation policy is unclear. Some employees report getting comp time while others get paid. Need consistent policy.',
      category: 'HR',
      priority: 'HIGH',
      severity: 'SENSITIVE',
      status: 'INVESTIGATING',
      isAnonymous: false,
    },
  });

  await prisma.complaint.create({
    data: {
      userId: null,
      subject: 'Management unresponsive to feedback',
      description: 'Multiple anonymous feedback submissions have gone unanswered for weeks. No action items or responses have been provided.',
      category: 'MANAGEMENT',
      priority: 'CRITICAL',
      severity: 'CRITICAL',
      status: 'ESCALATED',
      isAnonymous: true,
      escalatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2),
    },
  });

  await prisma.complaint.create({
    data: {
      userId: lisa.id,
      subject: 'Reimbursement delays',
      description: 'Expense reimbursements are taking over 30 days to process. This is causing financial strain for employees who travel for work.',
      category: 'FINANCE',
      priority: 'HIGH',
      severity: 'SENSITIVE',
      status: 'OPEN',
      isAnonymous: false,
    },
  });

  await prisma.complaint.create({
    data: {
      userId: emily.id,
      subject: 'Security badge access issues',
      description: 'After the recent security system upgrade, my badge no longer works for the server room. Need urgent access restored.',
      category: 'SECURITY',
      priority: 'URGENT',
      severity: 'CRITICAL',
      status: 'RESOLVED',
      isAnonymous: false,
      resolutionNotes: 'Badge has been reprogrammed and access restored. New badge issued at the security desk.',
      resolvedById: admin.id,
      resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1),
    },
  });

  await prisma.complaint.create({
    data: {
      userId: michael.id,
      subject: 'Break room cleanliness',
      description: 'The break room is consistently dirty. Dishes pile up, trash overflows, and the microwave needs cleaning. Need a cleaning schedule.',
      category: 'FACILITIES',
      priority: 'LOW',
      severity: 'NORMAL',
      status: 'CLOSED',
      isAnonymous: false,
      closedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 5),
      resolutionNotes: 'Cleaning schedule has been posted. Daily rotation assigned to each department.',
    },
  });

  // ─── Notifications ─────────────────────────────────────────
  console.log('🔔 Generating notifications...');
  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: 'APPROVAL_REQUIRED',
      title: 'Leave Request Pending',
      message: 'Lisa Taylor has submitted a casual leave request that needs your approval.',
      actionUrl: '/leaves',
    },
  });

  await prisma.notification.create({
    data: {
      userId: james.id,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: 'You have been assigned: "Set up CI/CD pipeline"',
      actionUrl: '/tasks',
    },
  });

  await prisma.notification.create({
    data: {
      userId: emily.id,
      type: 'LEAVE_UPDATE',
      title: 'Leave Approved',
      message: 'Your vacation leave from ' + getPastDate(10) + ' to ' + getPastDate(7) + ' has been approved.',
      isRead: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: 'GENERAL',
      title: 'System Update',
      message: 'The EMS system has been updated with new features. Check out the latest improvements.',
      isRead: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: michael.id,
      type: 'COMPLAINT_UPDATE',
      title: 'Complaint Under Investigation',
      message: 'Your complaint about slow internet connection is now being investigated by the IT team.',
      actionUrl: '/complaints',
    },
  });

  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: 'APPROVAL_REQUIRED',
      title: 'Expense Request Pending',
      message: 'Emily Park has submitted an asset request for a new monitor.',
      actionUrl: '/requests',
    },
  });

  await prisma.notification.create({
    data: {
      userId: lisa.id,
      type: 'ATTENDANCE',
      title: 'Late Clock-In Recorded',
      message: 'You were marked as late for today\'s attendance.',
    },
  });

  // ─── SystemRules ───────────────────────────────────────────
  console.log('⚙️ Generating system rules...');
  await prisma.systemRule.create({
    data: {
      name: 'Late Clock-In Deduction',
      triggerEvent: 'LATE_CLOCK_IN',
      conditionCount: 3,
      action: 'DEDUCT_LEAVE',
      actionValue: JSON.stringify({ leaveType: 'CASUAL', days: 1 }),
      isActive: true,
    },
  });

  await prisma.systemRule.create({
    data: {
      name: 'Early Task Completion Bonus',
      triggerEvent: 'TASK_COMPLETED',
      conditionCount: 5,
      action: 'BOOST_PERFORMANCE',
      actionValue: JSON.stringify({ bonusPercent: 5 }),
      isActive: true,
    },
  });

  await prisma.systemRule.create({
    data: {
      name: 'Month-End Attendance Lock',
      triggerEvent: 'MONTH_END',
      conditionCount: 1,
      action: 'LOCK_ATTENDANCE',
      actionValue: JSON.stringify({ lockAfterDays: 3 }),
      isActive: true,
    },
  });

  // ─── SystemSettings ────────────────────────────────────────
  console.log('🔧 Generating system settings...');
  const settings = [
    { key: 'timezone', value: JSON.stringify('Asia/Shanghai') },
    { key: 'workingHoursStart', value: JSON.stringify('09:00') },
    { key: 'workingHoursEnd', value: JSON.stringify('18:00') },
    { key: 'lateThreshold', value: JSON.stringify('09:15') },
    { key: 'currency', value: JSON.stringify('CNY') },
    { key: 'dateFormat', value: JSON.stringify('YYYY-MM-DD') },
    { key: 'companyName', value: JSON.stringify('EMS Corp') },
    { key: 'leavePolicy', value: JSON.stringify({ sick: 10, casual: 7, vacation: 15 }) },
    { key: 'attendanceMethod', value: JSON.stringify('PIN') },
    { key: 'autoClockOut', value: JSON.stringify(true) },
    { key: 'autoClockOutTime', value: JSON.stringify('20:00') },
    { key: 'officeIpNetwork', value: JSON.stringify('192.168.1') },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.create({ data: setting });
  }

  // ─── Salary Structures + Payroll config ─────────────────────
  console.log('📋 Creating salary structures...');
  const salaryCfg: Record<string, { base: number; housing: number; transport: number; medical: number; food: number; taxPct: number; insurancePct: number; pfPct: number; otRate: number; }> = {
    [admin.id]:   { base: 25000, housing: 3000, transport: 1500, medical: 1000, food: 500, taxPct: 10, insurancePct: 3, pfPct: 6, otRate: 150 },
    [manager.id]: { base: 18000, housing: 2500, transport: 1200, medical: 800, food: 400, taxPct: 8, insurancePct: 3, pfPct: 6, otRate: 120 },
    [james.id]:   { base: 15000, housing: 2000, transport: 1000, medical: 700, food: 350, taxPct: 7, insurancePct: 2.5, pfPct: 6, otRate: 100 },
    [emily.id]:   { base: 14000, housing: 1800, transport: 900, medical: 600, food: 300, taxPct: 6, insurancePct: 2.5, pfPct: 6, otRate: 95 },
    [michael.id]: { base: 13000, housing: 1500, transport: 800, medical: 500, food: 300, taxPct: 5, insurancePct: 2, pfPct: 6, otRate: 85 },
    [lisa.id]:    { base: 12000, housing: 1500, transport: 800, medical: 500, food: 300, taxPct: 5, insurancePct: 2, pfPct: 6, otRate: 80 },
  };

  const bankNames = ['National Bank', 'City Credit Union', 'Pacific Trust'];

  for (let uIdx = 0; uIdx < allUsers.length; uIdx++) {
    const user = allUsers[uIdx];
    const cfg = salaryCfg[user.id] || { base: 10000, housing: 1000, transport: 500, medical: 400, food: 200, taxPct: 5, insurancePct: 2, pfPct: 6, otRate: 70 };
    const isBankTransfer = uIdx < 3;
    await prisma.salaryStructure.create({
      data: {
        userId: user.id,
        baseSalary: cfg.base,
        housingAllowance: cfg.housing,
        transportAllowance: cfg.transport,
        medicalAllowance: cfg.medical,
        foodAllowance: cfg.food,
        otherAllowances: Math.round(Math.random() * 200),
        overtimeRate: cfg.otRate,
        taxPercentage: cfg.taxPct,
        insuranceRate: cfg.insurancePct,
        providentFundRate: cfg.pfPct,
        effectiveFrom: '2025-01-01',
        paymentMethod: isBankTransfer ? 'BANK_TRANSFER' : uIdx === 3 ? 'CASH' : uIdx === 4 ? 'DIGITAL_WALLET' : 'CHECK',
        bankName: isBankTransfer ? bankNames[uIdx % bankNames.length] : null,
        bankAccount: isBankTransfer ? `****${String(1000 + uIdx * 1111).slice(-4)}` : null,
        isActive: true,
      },
    });
  }

  // ─── PayrollRecords (past 3 months) ───────────────────────
  console.log('💰 Generating payroll records...');
  const salaryMap = salaryCfg;

  const paymentMethods = ['BANK_TRANSFER', 'BANK_TRANSFER', 'BANK_TRANSFER', 'CASH', 'DIGITAL_WALLET', 'CHECK'];

  for (let monthsAgo = 0; monthsAgo < 3; monthsAgo++) {
    const month = getPastMonth(monthsAgo);
    const statusFlow: ('DRAFT' | 'REVIEWED' | 'APPROVED' | 'PAID')[] = ['REVIEWED', 'APPROVED', 'PAID'];

    for (let uIdx = 0; uIdx < allUsers.length; uIdx++) {
      const user = allUsers[uIdx];
      const cfg = salaryMap[user.id] || { base: 10000, housing: 1000, transport: 500, medical: 400, food: 200, taxPct: 5, insurancePct: 2, pfPct: 6, otRate: 70 };

      const baseSalary = cfg.base;
      const housingAllowance = cfg.housing;
      const transportAllowance = cfg.transport;
      const medicalAllowance = cfg.medical;
      const foodAllowance = cfg.food;
      const otherAllowances = Math.round((Math.random() * 300) * 100) / 100;
      const totalAllowances = housingAllowance + transportAllowance + medicalAllowance + foodAllowance + otherAllowances;

      const overtimeHours = Math.round((Math.random() * 12) * 10) / 10; // 0-12 hours OT
      const overtime = Math.round(overtimeHours * cfg.otRate * 100) / 100;
      const bonus = monthsAgo === 0
        ? Math.round((Math.random() * 2000) * 100) / 100
        : Math.round((Math.random() * 1000) * 100) / 100;

      const grossSalary = Math.round((baseSalary + overtime + totalAllowances + bonus) * 100) / 100;

      const tax = Math.round(baseSalary * (cfg.taxPct / 100) * 100) / 100;
      const insurance = Math.round(baseSalary * (cfg.insurancePct / 100) * 100) / 100;
      const providentFund = Math.round(baseSalary * (cfg.pfPct / 100) * 100) / 100;
      const otherDeductions = Math.round((Math.random() * 150) * 100) / 100;
      const deductions = Math.round((tax + insurance + providentFund + otherDeductions) * 100) / 100;

      const netSalary = Math.round((grossSalary - deductions) * 100) / 100;

      const status = statusFlow[monthsAgo] || 'PAID';
      const paymentMethod = paymentMethods[uIdx % paymentMethods.length];

      const bankNames = ['National Bank', 'City Credit Union', 'Pacific Trust', 'Metro Savings', 'First National', 'Heritage Bank'];

      await prisma.payrollRecord.create({
        data: {
          userId: user.id,
          month,
          baseSalary,
          overtime,
          allowances: totalAllowances,
          bonus,
          tax,
          insurance,
          providentFund,
          otherDeductions,
          deductions,
          grossSalary,
          netSalary,
          status,
          paymentMethod,
          bankName: paymentMethod === 'BANK_TRANSFER' ? bankNames[uIdx % bankNames.length] : null,
          bankAccount: paymentMethod === 'BANK_TRANSFER' ? `****${String(1000 + uIdx * 1111).slice(-4)}` : null,
          reviewedById: monthsAgo >= 1 ? admin.id : (status === 'REVIEWED' ? admin.id : null),
          reviewedAt: monthsAgo >= 1 || status === 'REVIEWED' ? new Date() : null,
          approvedById: monthsAgo >= 2 ? admin.id : null,
          approvedAt: monthsAgo >= 2 ? new Date() : null,
          paidAt: monthsAgo >= 2 ? new Date() : null,
        },
      });
    }
  }

  console.log('✅ Seeding completed!');
  console.log(`
  Created:
  - 5 Departments
  - 6 Users (1 Admin, 1 Manager, 4 Employees) — with workMode (OFFICE/REMOTE/HYBRID)
  - 3 Shifts (Standard, Morning, Night)
  - ~85+ Attendance records (including today's 5: 4 Present + 1 Late)
  - ~170+ Attendance Log records (raw punches, including today's)
  - 4+ Demo Attendance Logs (face, remote GPS, flagged, manual)
  - 8 Leaves
  - 18 Tasks
  - 14 Requests
  - 10 Complaints
  - 7 Notifications
  - 3 System Rules
  - 12 System Settings
  - 18 Payroll Records
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
