<div align="center">

# ⚡ EMS — Enterprise Workforce & HR Operating System

### *Next-Gen Autonomous Workforce Management, Precision Attendance & Human Resources Governance Platform*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.1.1-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma 6](https://img.shields.io/badge/Prisma-6.11.1-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Google Gemini AI](https://img.shields.io/badge/Gemini_AI-2.0_Flash-4E75F6?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)](LICENSE)

<br />

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║   🏢 MULTI-TENANT RBAC   •   📍 GEOFENCED PUNCH-IN   •   🤖 GEMINI AI COPILOT         ║
║   📊 ADVANCED PAYROLL     •   📋 KANBAN TMS ENGINE    •   🎯 GAMIFICATION & XP         ║
║   🚀 REAL-TIME SOCKETS    •   🌐 PROGRESSIVE WEB APP  •   🛡️ WHISTLEBLOWER GRIEVANCE   ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

<br />

[Explore Features](#-feature-matrix--deep-dive) • [System Architecture](#-architectural-blueprint) • [Quick Start](#-quick-start--installation) • [Demo Credentials](#-pre-configured-demo-credentials) • [API & Sockets](#-real-time-microservice--websockets) • [Roadmap](#-production-deployment)

</div>

---

## 🧭 Executive Summary

**EMS** is an enterprise-grade, multi-tenant workforce governance platform and human resource information system (HRIS). Architected on the bleeding edge of the web ecosystem with **Next.js 16 (App Router & Turbopack)**, **React 19**, **Prisma ORM 6**, and **Tailwind CSS 4**, EMS replaces legacy, fragmented HR tools with a unified, real-time operating system.

Designed for hybrid, distributed, and on-premises workforces, the platform integrates **geofenced biometric attendance**, **autonomous rules engines**, **complex multi-tier payroll calculations**, **Kanban task management**, **full-lifecycle talent acquisition (ATS)**, **whistleblower grievance portals**, and **Google Gemini AI intelligence**.

Whether operated as an executive command center or an employee self-service hub, EMS delivers a frictionless, keyboard-first, glassmorphic UI engineered with accessibility (WCAG 2.1 AA) and offline-first resilience.

---

## 🏛️ Architectural Blueprint

```mermaid
flowchart TB
    subgraph ClientLayer["🖥️ Frontend & Client Ecosystem (Next.js 16 + React 19)"]
        UI["🎨 Glassmorphic UI (Tailwind 4 + Radix Primitives + Lucide)"]
        CmdK["⚡ Command Palette & NLP Copilot (Cmd+K)"]
        ZustandStore["🗄️ Zustand Global Store (Session, Offline Cache, Views)"]
        TanStackQuery["🔄 TanStack React Query 5 (Optimistic Updates, Cache Invalidation)"]
        PWA["📱 PWA Service Worker (Background Sync, Cache Storage)"]
    end

    subgraph GatewayLayer["🌐 Ingress & Routing (Next.js App Router)"]
        MW["🛡️ Cryptographic Auth & RBAC Middleware"]
        DynamicRoutes["🧭 Multi-Page Route Controller (/[view])"]
        APIRoutes["⚡ 55+ REST API Handlers (/api/*)"]
    end

    subgraph ServicesLayer["⚙️ Core Services & Compute"]
        RulesEngine["⚙️ Autonomous Rules Engine (Penalties, Leaves, Triggers)"]
        PayrollEngine["💰 Payroll & Tax Simulator (Gross, Slabs, PF, Insurance)"]
        AttendanceEngine["⏰ Telemetry Calculator (Geofence, Biometric Vectors, Grace Periods)"]
        GeminiCopilot["🤖 Google Gemini AI Engine (Insights, NLP, Approval Prediction)"]
    end

    subgraph RealtimeSubsystem["⚡ Real-Time Subsystem (Port 3003)"]
        SocketIO["🔌 Socket.IO Microservice (Bun/Node Runtime)"]
        Rooms["📡 Targeted Rooms (user:id, role:admin, role:manager)"]
    end

    subgraph StorageLayer["💾 Persistence & State"]
        PrismaORM["💎 Prisma ORM 6 (Type-Safe Data Access Layer)"]
        Database[("🗄️ SQLite / PostgreSQL (28+ Normalized Models)")]
    end

    ClientLayer --> GatewayLayer
    GatewayLayer --> ServicesLayer
    ServicesLayer --> PrismaORM
    PrismaORM --> Database
    ClientLayer <--> RealtimeSubsystem
    ServicesLayer -.-> RealtimeSubsystem
```

---

## ✨ Feature Matrix & Deep Dive

<details open>
<summary><b>1. 🛡️ Multi-Tenant Role-Based Access Control (RBAC)</b></summary>
<br />

The platform segregates organization permissions into three dedicated operational paradigms:
- **Executive Administrator**: Global governance, employee provisioning, team structures, shift blueprints, organization-wide payroll approval, policy configuration, audit trails, and rules engine tuning.
- **Operations Manager**: Direct line oversight, attendance anomaly overrides, leave application approval queues, shift scheduling, team task dispatch, and departmental performance ratings.
- **Staff Employee**: 1-click punch in/out, GPS geofenced verification, self-service leave requests, payslip ledger downloads, personal grievance submissions, investment declarations, and peer kudos.

</details>

<details open>
<summary><b>2. ⏰ Precision Attendance & Telemetry Engine</b></summary>
<br />

- **Dual-Model Attendance Ledger**: Separates raw immutable physical telemetry (`AttendanceLog`) from calculated daily timesheets (`Attendance`), ensuring compliance auditability.
- **Multi-Factor Punch Methods**: Supports simulated 512-float facial recognition embeddings, 4-digit security PIN verification, manual supervisor clocking, and web self-service.
- **Geofence Boundary Verification**: Enforces GPS latitude/longitude checks against defined `OfficeGeofence` polygons with custom radial tolerances (default: 200m).
- **Shift & Grace Period Computation**: Automated shift classification (Morning, Standard, Night) featuring dynamic grace-period tolerances, half-day minimum thresholds, and overtime calculations.
- **Supervisor Overrides**: Ghost punch-out resolution, punch telemetry auditing, and anomaly correction logs.

</details>

<details open>
<summary><b>3. 🏖️ Leave Governance & Absence Workflows</b></summary>
<br />

- **Comprehensive Leave Policies**: Configurable annual quotas across *Sick*, *Casual*, *Vacation*, *Maternity*, *Paternity*, and *Unpaid* leaves.
- **Carry-Forward & Encashment**: Policy rules engine determining year-end rollover limits and cash-out authorizations.
- **Documentation Thresholds**: Automated triggers requiring mandatory medical/legal document uploads if absences exceed predefined duration thresholds (e.g., 3+ days).
- **Leave Conflict Detector**: Built-in API (`/api/leave-conflict`) detecting team overlaps and operational headcount shortages prior to approval.
- **Company Holiday Lockdown**: Centralized company holiday calendar with emergency leave-freeze capabilities.

</details>

<details open>
<summary><b>4. 📋 Task Management System (TMS) & Agile Kanban</b></summary>
<br />

- **Interactive Kanban Boards**: Drag-and-drop column workflows (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`) powered by `@dnd-kit`.
- **Dependency Graphs**: Blocker and dependent relationships (`TaskDependency`) preventing execution when upstream items remain unresolved.
- **Hierarchical Decomposition**: Epic-level parent tasks cascading into measurable sub-tasks with SLA deadlines.
- **Performance Evaluation**: Post-completion scoring engine (0–100) integrated into quarterly employee appraisal calculations.
- **Blueprints & Templates**: Pre-configured task templates for recurring organizational workflows.

</details>

<details open>
<summary><b>5. 💰 Automated Payroll & Tax Intelligence</b></summary>
<br />

- **Multi-Component Compensation**: Granular base pay, House Rent Allowance (HRA), Transport Allowance, Medical Benefits, Food Allowance, and Overtime modifiers.
- **Statutory Deductions & Taxes**: Automatic withholding for Provident Fund (PF/401k), Health Insurance, and progressive income tax brackets.
- **Lifecycle Payroll Runs**: State machine transitions from `DRAFT` ➔ `REVIEWED` ➔ `APPROVED` ➔ `PAID`.
- **Tax Simulator & Proof Verification**: Employee investment declaration uploads (HSA, 401k, Home Loan, Charity) and tax scenario estimation.
- **Audit-Ready Payslip Generator**: Print-ready, pixel-perfect payslips with digital transaction IDs.

</details>

<details open>
<summary><b>6. 👥 Complete Human Resource Management (HRM) Suite</b></summary>
<br />

- **Applicant Tracking System (ATS)**: Job vacancy publishing, applicant pipeline tracking (`Applied` ➔ `Screening` ➔ `Interview` ➔ `Assessment` ➔ `Offer` ➔ `Hired`), and resume link storage.
- **Onboarding Journey Orchestrator**: Structured milestone check-lists, automated buddy/mentor pairings, and initial hardware/credential dispatch tracking.
- **Training & Academy Portal**: Course catalogs (Technical, Leadership, Compliance, Soft Skills), format flexibility (Online, In-Person, Hybrid), curriculum modules, and certificate generation.
- **360° Performance Appraisals**: Cycle reviews combining employee self-assessments, manager calibration ratings, goal achievement scores, and strengths/improvements tracking.
- **Employee Lifecycle Tracker**: Audit log for transfers, department re-assignments, promotions, resignations, and contract expirations.

</details>

<details open>
<summary><b>7. 🛡️ Whistleblower & Grievance Center</b></summary>
<br />

- **Whistleblower Anonymity**: Guaranteed cryptographic masking of user identities for sensitive disclosures.
- **Severity & Category Matrix**: Classification across HR, IT, Facilities, Finance, Management, and Security with priority tagging up to `CRITICAL`.
- **SLA Escalation Timers**: Enforces response deadlines; auto-escalates unresolved tickets to senior HR and executive leadership.
- **Confidential Threading**: Secure resolution note exchange between appointed investigators and reporting parties.

</details>

<details open>
<summary><b>8. 🏆 Enterprise Gamification & Cultural Recognition</b></summary>
<br />

- **Peer-to-Peer Kudos**: Instant cross-departmental shoutouts with XP awards for teamwork, innovation, leadership, and going above & beyond.
- **Achievement Badges**: Five prestige tiers (*Bronze*, *Silver*, *Gold*, *Platinum*, *Diamond*) for punctuality, tenure, and sprint velocity.
- **Punctuality & Productivity Streaks**: Dynamic streak counters celebrating consistent on-time arrivals and task completions.
- **Departmental Challenges**: Organization-wide productivity competitions with live leaderboards.

</details>

<details open>
<summary><b>9. 🤖 Google Gemini AI Copilot Integration</b></summary>
<br />

- **Workforce Intelligence Analytics** (`/api/ai-insights`): Autonomous pattern detection on absenteeism, overtime burnout, and budget distributions.
- **Natural Language Command Bar** (`/api/nlp-command`): Translate natural language prompts (*"Apply sick leave for tomorrow"*, *"Show me Sarah's timesheet"*) into executable actions.
- **Predictive Approval Engine** (`/api/request-approval-prediction`): Evaluates historical approval patterns, departmental budget health, and team capacity to forecast request approvals.

</details>

<details open>
<summary><b>10. 🎨 Next-Generation Glassmorphic Experience</b></summary>
<br />

- **Ambient Design System**: Tailored HSL color palette, dark/light theme switching, frosted glass panels (`backdrop-blur`), and fluid micro-interactions.
- **Global Command Palette**: Instant navigation and multi-action trigger via <kbd>Cmd</kbd> + <kbd>K</kbd> or <kbd>Ctrl</kbd> + <kbd>K</kbd>.
- **Accessibility & Screen Reader Announcer**: WCAG 2.1 AA certified with live ARIA announcements (`a11y-announcer`) and keyboard navigation.
- **PWA & Offline Tolerance**: Service worker caching and offline request queuing with optimistic UI synchronization upon reconnection.

</details>

---

## 💻 Technology Stack

| Domain | Technology | Purpose & Highlights |
|---|---|---|
| **Core Framework** | [Next.js 16.1.1](https://nextjs.org/) | App Router, Turbopack, React Server Components, Route Handlers |
| **Frontend Runtime** | [React 19.0.0](https://react.dev/) | Concurrent rendering, Action transitions, modern hooks |
| **Language** | [TypeScript 5.x](https://www.typescriptlang.org/) | End-to-end type safety, strict compiler validation |
| **Styling Engine** | [Tailwind CSS 4](https://tailwindcss.com/) | Next-generation CSS engine, dynamic design tokens |
| **UI Primitives** | [Radix UI](https://www.radix-ui.com/) | Fully accessible unstyled components (Dialog, Dropdown, Tabs) |
| **Icons & Motion** | [Lucide React](https://lucide.dev/) + [Framer Motion](https://www.framer.com/motion/) | Curated enterprise iconography & fluid hardware-accelerated animations |
| **Data Layer** | [Prisma ORM 6.11](https://www.prisma.io/) | Type-safe schema modeling, connection pooling, migration pipeline |
| **Database** | [SQLite](https://www.sqlite.org/) / [PostgreSQL](https://www.postgresql.org/) | Zero-config embedded SQLite for local/edge; PostgreSQL ready |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) | Client-side persistent session store, view navigation state |
| **Data Synchronization** | [TanStack React Query 5](https://tanstack.com/query) | Background data fetching, smart caching, optimistic mutation rollbacks |
| **Real-Time Engine** | [Socket.IO 4.8](https://socket.io/) | Standalone WebSocket microservice with room isolation & health telemetry |
| **Artificial Intelligence**| [Google Gemini 2.0 / 1.5 Flash](https://ai.google.dev/) | Generative AI analysis, NLP command parsing, predictive heuristics |
| **Security & Auth** | [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js) | Salted password hashing (cost factor: 12), role-gated middleware |
| **Data Visualization** | [Recharts 2.15](https://recharts.org/) | Departmental budget, attendance burn-down, and headcount distribution charts |
| **Offline & PWA** | Web App Manifest & Service Worker | Local caching, offline notifications, standalone installability |

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: v18.18+ or v20+ *(Node v20.x LTS strongly recommended)*
- **Package Manager**: `npm`, `bun`, or `pnpm`

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/employee_management_system.git
cd employee_management_system
```

### 2. Install Project Dependencies
```bash
npm install
# or with Bun:
bun install
```

### 3. Configure Environment Variables
Create a local `.env` configuration file from the template:
```bash
cp .env.example .env
```

Review and adjust the configuration parameters:
```env
# ─────────────────────────────────────────────────────────────
# Database Connection (Default: embedded SQLite)
# ─────────────────────────────────────────────────────────────
DATABASE_URL="file:./custom.db"

# ─────────────────────────────────────────────────────────────
# Optional: Google Gemini AI Copilot Integration
# Get an API key at: https://aistudio.google.com/
# ─────────────────────────────────────────────────────────────
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-1.5-flash"

# ─────────────────────────────────────────────────────────────
# Application Environment
# ─────────────────────────────────────────────────────────────
NODE_ENV="development"
PORT=3000
```

### 4. Database Initialization & Seeding
Initialize the SQLite database schema and populate realistic enterprise demo records:
```bash
# Push schema migrations
npm run db:push

# Generate typed Prisma client
npm run db:generate

# Seed enterprise departments, shifts, attendance telemetry, payroll & HR records
npm run db:seed
```

### 5. Launch the Development Environment
```bash
npm run dev
```

Your EMS instance is now accessible at **[http://localhost:3000](http://localhost:3000)**.

---

## ⚡ Real-Time Microservice & WebSockets

EMS features a dedicated, low-latency WebSocket microservice located in `mini-services/realtime-service/`. It handles bi-directional event broadcasts for attendance clock-ins, leave approvals, task assignments, and instant notification digests.

### Starting the Real-Time Service
```bash
cd mini-services/realtime-service
bun install
bun run index.ts
```

> **Note**: The microservice listens on port **`3003`** (or forwards via reverse proxy). When the microservice is offline, the client frontend gracefully falls back to local optimistic event delivery and standard REST polling.

### Real-Time Event Architecture

| Event Name | Direction | Payload Schema | Target Room |
|---|---|---|---|
| `join` | Client ➔ Server | `{ userId: string, role: string }` | Registers socket to `user:*` and `role:*` |
| `attendance:clock-in` | Bi-directional | `{ userId: string }` | `user:*`, `role:manager`, `role:admin` |
| `leave:status-changed`| Bi-directional | `{ leaveId: string, status: string, comment?: string }` | `user:*`, `role:manager`, `role:admin` |
| `request:status-changed`| Bi-directional | `{ requestId: string, status: string, comment?: string }`| `user:*`, `role:manager`, `role:admin` |
| `task:assigned` | Server ➔ Client | `{ taskId: string, assigneeId: string, assigneeName: string }` | `user:<assigneeId>` |
| `task:status-changed` | Bi-directional | `{ taskId: string, status: string }` | `user:*`, `role:manager` |
| `payroll:status-changed`| Server ➔ Client | `{ payrollId: string, status: string }` | `user:*`, `role:manager`, `role:admin` |
| `notification:new` | Server ➔ Client | `{ title: string, message: string, actionUrl?: string }` | `user:*` |

---

## 🔑 Pre-Configured Demo Credentials

The seeded database contains fully fleshed-out accounts spanning all corporate hierarchy tiers:

| Persona Role | User Name | Work Mode | Email Address | Password | Quick PIN | Access Scope |
|---|---|---|---|---|---|---|
| 👑 **Executive Admin** | Alex Morgan | Office | `admin@ems.com` | `admin123` | *N/A* | Total Organization Governance |
| 👔 **Dept Manager** | Sarah Chen | Hybrid | `manager@ems.com` | `manager123` | `1111` | Team Approvals & Attendance Overrides |
| 💻 **Staff Employee** | James Wilson | Office | `james@ems.com` | `emp123` | `2222` | Self-Service Desk & Punch In |
| 🌍 **Remote Employee** | Emily Park | Remote | `emily@ems.com` | `emp123` | `3333` | GPS Remote Punch & Task Kanban |
| 🎨 **Design Lead** | Michael Brown | Office | `michael@ems.com` | `emp123` | `4444` | Creative Tasks & Leave Quotas |
| 📈 **Marketing Analyst** | Lisa Taylor | Remote | `lisa@ems.com` | `emp123` | `5555` | Performance Reviews & Kudos |

> 💡 **Lightning Login**: On the `/login` screen, click the **1-Click Demo Role Launch** buttons or press <kbd>Alt</kbd> + <kbd>1</kbd> (Admin), <kbd>Alt</kbd> + <kbd>2</kbd> (Manager), or <kbd>Alt</kbd> + <kbd>3</kbd> (Employee) to authenticate instantly.

---

## 🧭 Multi-Page Route Directory

EMS uses a true multi-page architecture powered by Next.js App Router (`src/app/[view]/page.tsx`), enabling deep linking, browser forward/back cache preservation, and SEO-friendly indexing.

```
/ (Root) ──► Redirects based on session state
├── /login ──────────────── Executive Dual-Pane Authentication Gateway
└── /[view] (Dynamic Controller)
    ├── /dashboard ──────── Role-Tailored Command Center (Admin / Manager / Employee)
    ├── /attendance ─────── Punch Clock, Biometric Simulation, Timesheets & Logs
    ├── /leaves ─────────── Quota Tracking, Leave Application & Approval Queues
    ├── /tasks ──────────── Drag-and-Drop Agile Kanban TMS & Epics
    ├── /requests ───────── Equipment, Travel, Asset & Reimbursement Processing
    ├── /complaints ─────── Whistleblower Grievance & SLA Tracking Center
    ├── /payroll ────────── Compensation Structures, Tax Simulator & Payslips
    ├── /employees ──────── Workforce Directory & Detailed Profile Administration
    ├── /departments ────── Headcount, Department Budgets & Structure Map
    ├── /team ───────────── Cross-Functional Teams & Member Associations
    ├── /shifts ─────────── Shift Definitions, Grace Tolerances & Rotations
    ├── /rules ──────────── Autonomous Business Logic & Disciplinary Engine
    ├── /hrm ────────────── ATS Pipeline, Onboarding Blueprints & Academy
    ├── /gamification ───── Badges, Kudos Feed, Daily Streaks & Leaderboards
    ├── /analytics ──────── Business Intelligence & Recharts Visualizations
    └── /settings ───────── Organization Configuration & Security Toggles
```

---

## 📡 REST API Reference Matrix

EMS exposes over 55 REST endpoints covering the entire operations lifecycle:

| Domain | Method | Endpoint Path | Description | Access Level |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth` | User login, session token issue, PIN verification | Public |
| **Auth** | `GET` | `/api/login-history` | Audit log of active user devices and IP sessions | Authenticated |
| **Attendance** | `GET`, `POST` | `/api/attendance` | Fetch timesheets or perform a clock-in / clock-out | All Roles |
| **Attendance** | `GET` | `/api/attendance-logs` | Fetch raw, tamper-evident punch telemetry | All Roles |
| **Attendance** | `POST` | `/api/attendance-calculate` | Trigger timesheet recalculation engine | Manager / Admin |
| **Attendance** | `PATCH` | `/api/attendance-admin` | Supervisor punch correction & ghost clock-out | Admin |
| **Geofences** | `GET`, `POST`, `DELETE` | `/api/geofences` | Office geofence GPS coordinate management | Admin |
| **Leaves** | `GET`, `POST` | `/api/leaves` | Retrieve leave history or file a new application | All Roles |
| **Leaves** | `PATCH` | `/api/leave-manager` | Approve or reject pending leave requests | Manager / Admin |
| **Leaves** | `GET` | `/api/leave-balances` | Retrieve per-type leave quotas and carryovers | All Roles |
| **Leaves** | `POST` | `/api/leave-conflict` | Calculate team absence conflicts | Manager / Admin |
| **Tasks** | `GET`, `POST` | `/api/tasks` | Fetch Kanban task list or dispatch new tasks | All Roles |
| **Tasks** | `PATCH` | `/api/tasks` | Update status, priority, performance score | All Roles |
| **Tasks** | `GET`, `POST` | `/api/task-comments` | Discussion thread messages per task | All Roles |
| **Tasks** | `GET`, `POST` | `/api/task-dependencies` | Manage blocked-by dependency graphs | All Roles |
| **Payroll** | `GET`, `POST` | `/api/payroll` | Fetch salary history or compute monthly run | All Roles (Scoped) |
| **Payroll** | `POST` | `/api/tax-simulator` | Estimate tax liability based on deductions | All Roles |
| **HRM** | `GET`, `POST` | `/api/jobs` | Job postings and applicant openings | Manager / Admin |
| **HRM** | `GET`, `POST` | `/api/candidates` | ATS candidate pipeline and stage transitions | Manager / Admin |
| **HRM** | `GET`, `POST` | `/api/onboarding` | Employee onboarding journeys and tasks | Manager / Admin |
| **HRM** | `GET`, `POST` | `/api/training` | Academy training programs and certifications | All Roles |
| **Gamification** | `GET`, `POST` | `/api/gamification` | Badges, XP points, kudos shoutouts, streaks | All Roles |
| **AI Copilot** | `POST` | `/api/ai-insights` | Synthesize workforce patterns with Gemini AI | Admin |
| **AI Copilot** | `POST` | `/api/nlp-command` | Process natural language prompts into actions | All Roles |
| **Complaints** | `GET`, `POST` | `/api/complaints` | Whistleblower grievance lodging and updates | All Roles |
| **Rules Engine**| `GET`, `POST`, `PUT` | `/api/rules` | Manage autonomous event-action rules | Admin |

---

## ⌨️ Power-User Keyboard Cheatsheet

| Key Combination | Global Action | Context |
|---|---|---|
| <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Command Palette & NLP Copilot | Anywhere |
| <kbd>?</kbd> | Toggle Keyboard Shortcuts Modal | Anywhere |
| <kbd>Alt</kbd> + <kbd>T</kbd> | Toggle Dark / Light Theme | Anywhere |
| <kbd>Alt</kbd> + <kbd>1</kbd> | Instant Launch **Admin** Session | Login Page |
| <kbd>Alt</kbd> + <kbd>2</kbd> | Instant Launch **Manager** Session | Login Page |
| <kbd>Alt</kbd> + <kbd>3</kbd> | Instant Launch **Employee** Session | Login Page |
| <kbd>Esc</kbd> | Close Modals, Overlays, or Palette | Anywhere |
| <kbd>Enter</kbd> | Submit Form / Confirm Action | In Dialogs & Forms |

---

## 🗄️ Database Architecture (Prisma Schema)

The database schema (`prisma/schema.prisma`) encompasses **28+ strongly normalized models**:

```
🏢 ORGANIZATIONAL FOUNDATION
  ├── Department               Headcount, manager assignment, budget allocations
  ├── User                     RBAC identity, work mode, biometric face vectors, PIN
  ├── Team & TeamMember        Cross-departmental agile squads & squad leads
  └── OfficeGeofence           GPS coordinates and radial boundaries

⏰ ATTENDANCE & SCHEDULES
  ├── AttendanceLog            Raw, tamper-evident physical punch telemetry
  ├── Attendance               Calculated daily timesheet aggregates & hours
  ├── Shift                    Shift definitions, grace allowances, OT thresholds
  └── CompanyHoliday           Global calendar closures & emergency freezes

🏖️ LEAVE & ABSENCE
  ├── Leave                    Individual leave requests & approval states
  ├── LeavePolicy              Accrual formulas, doc requirements, carryovers
  └── LeaveBalance             Per-employee per-type quota allowances

📋 TASK & PROJECT ENGINE
  ├── Task                     Kanban work items with SLA targets & scores
  ├── TaskDependency           Blocker/predecessor relational constraints
  ├── TaskComment              Real-time audit trail and team discussions
  └── TaskTemplate             Reusable enterprise blueprints

💰 FINANCIAL & PAYROLL
  ├── SalaryStructure          Granular base, HRA, transport, OT rates & PF
  ├── PayrollRecord            Monthly gross, taxes, net payouts & bank info
  └── InvestmentDeclaration    Employee tax-saving asset proofs (401k, HSA)

👥 HUMAN RESOURCE MANAGEMENT (HRM)
  ├── JobPosting & Candidate   Full ATS recruitment pipeline & ratings
  ├── OnboardingPlan & Task    Structured onboarding milestones & buddies
  ├── TrainingProgram          Curriculum catalog & certification tracking
  ├── TrainingEnrollment       User academy scores & certificate assets
  ├── PerformanceReview        360° appraisal cycles & calibration metrics
  ├── LifecycleEvent           Promotions, departmental transfers, resignations
  └── EmployeeDocument         Contracts, compliance files & credentials

🏆 GAMIFICATION & CULTURE
  ├── Badge & UserBadge        Tiered merit awards (Bronze to Diamond)
  ├── Kudos                    Peer-to-peer appreciation feed with XP points
  ├── StreakRecord             Consecutive on-time & task milestone counters
  └── TeamChallenge            Departmental productivity hackathons & ranks

⚙️ GOVERNANCE & AUDIT
  ├── SystemRule               Automated condition-action triggers
  ├── SystemSetting            Global platform configurations
  ├── Notification             Targeted alert digests & quick action payloads
  ├── Complaint                Whistleblower grievance cases & SLAs
  └── LoginSession             Multi-device authentication security ledger
```

---

## 📦 Production Deployment

### 1. Standalone Next.js Production Build
The project is optimized for Next.js standalone container deployment:
```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

### 2. Reverse Proxy Configuration (`Caddyfile`)
The repository includes a production-ready `Caddyfile` for automatic HTTPS and microservice routing:
```caddy
:80 {
    # WebSocket microservice reverse proxy
    handle /socket.io/* {
        reverse_proxy localhost:3003
    }

    # Next.js Application
    handle {
        reverse_proxy localhost:3000
    }
}
```

### 3. PostgreSQL Migration (Optional)
To switch from SQLite to PostgreSQL for high-concurrency production deployments:
1. In `prisma/schema.prisma`, update the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `.env` with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/ems_db?schema=public"
   ```
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

---

## 🔒 Security & Compliance Standards

- **Password Cryptography**: Strong bcrypt hashing with salt rounds of 12 (`bcryptjs`).
- **Input Validation & Typing**: Strict request payload schema validation with Zod.
- **SQL Injection Prevention**: Completely parameterized queries via Prisma ORM engine.
- **Role-Based Route Guards**: Multi-tier Next.js middleware preventing unauthorized view or API access.
- **Whistleblower Privacy**: Cryptographic pseudonymization for anonymous grievances.
- **Accessibility Compliance**: Built to conform to **WCAG 2.1 Level AA** standards with high-contrast modes, accessible color ratios, and live screen reader dispatch.

---

## 🤝 Contributing

We welcome contributions from the open-source community!

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your enhancements: `git commit -m 'feat: Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.

<br />

<div align="center">

**Built with precision and passion for modern enterprise teams.**

<sub>Empowering workforce excellence through intuitive design and autonomous intelligence.</sub>

</div>
