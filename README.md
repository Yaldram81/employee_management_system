# EMS — Enterprise Employee Management System

<div align="center">

![EMS Banner](https://img.shields.io/badge/EMS-Enterprise%20v2.4-10b981?style=for-the-badge&logo=shield&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.11-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Turbopack](https://img.shields.io/badge/Turbopack-Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)

**A modern, full-stack, multi-page workforce operations and human resources governance platform.**

[Features](#-key-features) • [Tech Stack](#-technology-stack) • [Quick Start](#-quick-start) • [Demo Credentials](#-pre-configured-demo-credentials) • [Routes](#-multi-page-routing-architecture) • [API & Realtime](#-real-time-microservice)

</div>

---

## 📖 Overview

**EMS (Employee Management System)** is an enterprise-grade workforce management platform built with Next.js 16 (App Router), TypeScript, Prisma ORM, and Tailwind CSS. It provides multi-tenant role-based access control (RBAC) with isolated portal environments for **Administrators**, **Department Managers**, and **Staff Employees**.

Unlike standard single-page apps, EMS operates on a **True Multi-Page Application (MPA)** architecture with dedicated URL routes, browser history management, deep linking, offline resilience (PWA), real-time WebSockets, and a glassmorphism design system.

---

## ✨ Key Features

### 🛡️ 1. Multi-Tenant Role Isolation (RBAC)
- **Executive Admin**: Organization-wide governance, user provisioning, custom rules engine, department budget controls, and system audit logs.
- **Operations Manager**: Team oversight, attendance anomaly overrides, leave approval queues, shift scheduling, and department KPIs.
- **Employee Self-Service**: 1-click web punch in/out, geofence validation, leave applications, task boards, salary slip downloads, and peer kudos.

### ⏰ 2. Precision Attendance & Shift Management
- **Clock In / Out Verification**: Web-based punching with simulated biometric and GPS geofence boundary checks.
- **Shift Scheduling**: Morning, Standard, and Night shifts with customizable grace periods, half-day minimum thresholds, and overtime tracking.
- **Admin Overrides**: Ghost clock-out utility, missed punch resolution, manual attendance corrections, and detailed punch telemetry logs.

### 🏖️ 3. Leave Management & Holiday Policies
- **Quota Tracking**: Dedicated allowances for Casual, Sick, Vacation, Maternity, Paternity, and Unpaid leaves.
- **Approval Workflows**: Manager review queues with approval/rejection notes.
- **Company Holidays & Lockdown**: Emergency leave freeze lockdowns and centralized holiday calendar distribution.

### 📋 4. Task Management (TMS) & Requests
- **Kanban Board**: Drag-and-drop task workflows with priority tagging, SLA tracking, deadlines, and task template generation.
- **Corporate Requests**: Procurement, equipment, expense reimbursement, and document requests with status tracking.
- **Whistleblower & Complaints**: Confidential grievance reporting with optional anonymity, severity tagging, escalations, and resolution notes.

### 💰 5. Automated Payroll & Salary Structures
- **Earnings & Deductions**: Base salary, allowances (HRA, Transport, Medical), tax calculations, and PF/insurance deductions.
- **Payslip Generator**: Print-ready and downloadable payslips with audit trails.
- **Financial Analytics**: Organization-wide salary distribution, department expense ratios, and historical payouts.

### 👥 6. Human Resource Management (HRM) Suite
- **Applicant Tracking System (ATS)**: Job postings, applicant stages (Applied, Interviewing, Offered, Hired), and candidate evaluation notes.
- **Employee Onboarding**: Step-by-step onboarding checklists, buddy/mentor assignments, and milestone tracking.
- **Training & Certifications**: Course enrollment, progress tracking, and skill certification completion.

### 🏆 7. Gamification & Culture
- **Peer Recognition (Kudos)**: Real-time peer praise with customizable badges.
- **Daily Streaks**: Punctuality and attendance streak tracking.
- **Team Challenges**: Department-level productivity and engagement leaderboards.

### 🎨 8. Enterprise Design & Usability
- **Next-Gen Glassmorphic UI**: Ambient animated gradient mesh, floating particle effects, and high-contrast dark/light mode themes.
- **Power-User Command Palette**: Press <kbd>Cmd</kbd> + <kbd>K</kbd> or <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere for instant global search and fast actions.
- **Keyboard Shortcuts**: Quick shortcuts for demo login, theme toggle (<kbd>Alt</kbd> + <kbd>T</kbd>), and global views.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server & Client Components) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/), CSS Glassmorphism, CSS Variables |
| **Components** | [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/) |
| **Database & ORM** | [SQLite](https://www.sqlite.org/) (Default) / PostgreSQL Compatible, [Prisma ORM 6](https://www.prisma.io/) |
| **State & Cache** | [Zustand](https://github.com/pmndrs/zustand) (Client Store), [TanStack React Query 5](https://tanstack.com/query) |
| **Realtime** | [Socket.io](https://socket.io/) (Microservice in `mini-services/realtime-service`) |
| **Authentication** | Custom Cryptographic Session & Bcrypt.js Password Hashing |
| **PWA & Offline** | Service Workers, Web App Manifest, Cache API |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.18+ or v20+ (Node v20+ recommended)
- **Package Manager**: `npm`, `bun`, or `pnpm`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/employee_management_system.git
cd employee_management_system
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
DATABASE_URL="file:./custom.db"
# Optional Gemini AI API key for AI features
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-1.5-flash"
```

### 3. Database Migration & Seeding
Initialize the SQLite database and seed initial enterprise data:
```bash
# Push schema to database
npm run db:push

# Generate Prisma Client
npm run db:generate

# Populate realistic demo records (Users, Shifts, Attendance, Leaves, Tasks, Payroll)
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Configured Demo Credentials

The database seed provides ready-to-use role accounts for instant testing:

| Role | Name | Email | Password | Work Mode |
|---|---|---|---|---|
| **Admin** | Alex Morgan | `admin@ems.com` | `admin123` | Office |
| **Manager** | Sarah Chen | `manager@ems.com` | `manager123` | Hybrid |
| **Employee** | James Wilson | `james@ems.com` | `emp123` | Office |
| **Employee (Remote)** | Emily Park | `emily@ems.com` | `emp123` | Remote |

> **Pro Tip**: On the `/login` page, you can use the **1-Click Demo Role Launch** tab or press <kbd>Alt</kbd> + <kbd>1</kbd> (Admin), <kbd>Alt</kbd> + <kbd>2</kbd> (Manager), or <kbd>Alt</kbd> + <kbd>3</kbd> (Employee) to authenticate instantly.

---

## 🧭 Multi-Page Routing Architecture

The system uses Next.js App Router for multi-page routing with distinct URLs and browser history support:

| Route Path | Description | Access |
|---|---|---|
| `/` | Landing gateway; redirects to `/dashboard` or `/login` | Public |
| `/login` | Executive Dual-Pane Login Screen | Public / Guest |
| `/dashboard` | Main role-specific command center | Authenticated |
| `/attendance` | Punch clock, geofence, and timesheets | All Roles |
| `/leaves` | Leave applications, balance quotas, approval queues | All Roles |
| `/tasks` | Kanban task board, assignments, SLA tracker | All Roles |
| `/requests` | Corporate requests (equipment, reimbursement) | All Roles |
| `/complaints` | Whistleblower grievance center | All Roles |
| `/payroll` | Salary slips, payroll runs, financial breakdown | All Roles |
| `/departments` | Department budgets and headcount overview | Admin |
| `/team` | Team groups and member associations | Admin & Manager |
| `/employees` | Complete employee directory & profile administration | Admin |
| `/shifts` | Shift rosters, grace periods, half-day rules | Admin |
| `/hrm` | Comprehensive recruitment, onboarding & training portal | Admin & Manager |
| `/gamification` | Employee streaks, kudos, and team challenges | All Roles |
| `/analytics` | Business intelligence charts & performance metrics | Admin & Manager |
| `/rules` | Automated rules engine & attendance penalties | Admin |
| `/settings` | Organization configuration & module toggles | Admin |

---

## ⚡ Real-Time Microservice

The application includes an optional real-time WebSocket service located in `mini-services/realtime-service/`.

To run the standalone real-time service:
```bash
cd mini-services/realtime-service
bun install
bun run index.ts
```
The client frontend connects to `http://localhost:3001` or uses local fallback event emitters when the service is offline.

---

## 📦 Production Build

To create an optimized production build:
```bash
# Build production bundle
npm run build

# Start production server
npm start
```

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Command Palette |
| <kbd>?</kbd> | Toggle Keyboard Shortcuts Modal |
| <kbd>Alt</kbd> + <kbd>T</kbd> | Toggle Dark / Light Theme |
| <kbd>Alt</kbd> + <kbd>1</kbd> | Instant Launch Admin Session (on login) |
| <kbd>Alt</kbd> + <kbd>2</kbd> | Instant Launch Manager Session (on login) |
| <kbd>Alt</kbd> + <kbd>3</kbd> | Instant Launch Employee Session (on login) |
| <kbd>Enter</kbd> | Submit Active Form / Authenticate |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
