'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEMSStore } from '@/lib/store';
import type { ActiveView } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  ListTodo,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  DollarSign,
  Users,
  Scale,
  UsersRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Building2,
  Timer,
  Briefcase,
  UserPlus,
  GraduationCap,
  UserCheck,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useEffect, useState, useCallback, useMemo } from 'react';

interface NavChild {
  id: ActiveView;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ElementType;
  roles: string[];
  section: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'], section: 'MAIN' },
  { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['admin', 'manager', 'employee'], section: 'MAIN' },
  { id: 'employees', label: 'Employees', icon: Users, roles: ['admin'], section: 'MAIN' },
  { id: 'shifts', label: 'Shifts', icon: Timer, roles: ['admin'], section: 'MAIN' },
  { id: 'leaves', label: 'Leave Mgmt', icon: CalendarDays, roles: ['admin', 'manager', 'employee'], section: 'MAIN' },
  { id: 'tasks', label: 'Task Board', icon: ListTodo, roles: ['admin', 'manager', 'employee'], section: 'MANAGEMENT' },
  { id: 'requests', label: 'Requests', icon: FileText, roles: ['admin', 'manager', 'employee'], section: 'MANAGEMENT' },
  { id: 'complaints', label: 'Complaints', icon: MessageSquare, roles: ['admin', 'manager', 'employee'], section: 'MANAGEMENT' },
  { id: 'payroll', label: 'Payroll', icon: DollarSign, roles: ['admin', 'manager', 'employee'], section: 'MANAGEMENT' },
  { id: 'departments', label: 'Departments', icon: Building2, roles: ['admin'], section: 'MANAGEMENT' },
  { id: 'team', label: 'Teams', icon: UsersRound, roles: ['admin', 'manager'], section: 'MANAGEMENT' },
  {
    id: 'hrm',
    label: 'HRM',
    icon: Briefcase,
    roles: ['admin', 'manager'],
    section: 'MANAGEMENT',
    children: [
      { id: 'jobs', label: 'Job Postings', icon: Briefcase, roles: ['admin', 'manager'] },
      { id: 'candidates', label: 'Candidates', icon: UserCheck, roles: ['admin', 'manager'] },
      { id: 'onboarding', label: 'Onboarding', icon: UserPlus, roles: ['admin', 'manager'] },
      { id: 'training-mgmt', label: 'Training', icon: GraduationCap, roles: ['admin', 'manager'] },
    ],
  },
  { id: 'gamification', label: 'Gamification', icon: Trophy, roles: ['admin', 'manager', 'employee'], section: 'INSIGHTS' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'manager'], section: 'INSIGHTS' },
  { id: 'rules', label: 'Rules', icon: Scale, roles: ['admin'], section: 'SYSTEM' },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'], section: 'SYSTEM' },
];

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  manager: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  employee: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export function Sidebar() {
  const { user, activeView, setActiveView, sidebarCollapsed, toggleSidebar, logout, settings } = useEMSStore();
  const role = user?.role || 'employee';
  const router = useRouter();
  const pathname = usePathname();

  // Module visibility: check settings.modules for each nav item
  // teams and departments cannot be disabled
  const moduleEnabled = (key: string): boolean => {
    if (key === 'teams' || key === 'departments') return true;
    return settings.modules?.[key] !== false;
  };

  // Synchronize activeView with URL pathname if directly navigated or using browser back/forward
  useEffect(() => {
    if (!pathname) return;
    const cleanPath = pathname.replace(/^\//, '') as ActiveView;
    if (cleanPath && cleanPath !== activeView && cleanPath !== ('login' as any)) {
      setActiveView(cleanPath);
    }
  }, [pathname, activeView, setActiveView]);

  // Track which parent items are manually toggled (by id)
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());

  const filteredItems = navItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    // Check module visibility for nav items that map to a module
    const moduleMap: Partial<Record<ActiveView, string>> = {
      attendance: 'attendance',
      leaves: 'leaves',
      tasks: 'tasks',
      requests: 'requests',
      complaints: 'complaints',
      payroll: 'payroll',
      analytics: 'analytics',
      team: 'teams',
      departments: 'departments',
    };
    const moduleKey = moduleMap[item.id];
    if (moduleKey && !moduleEnabled(moduleKey)) return false;
    return true;
  });

  // Compute effective expanded state: manually toggled + auto-expand if child is active
  const expandedItems = useMemo(() => {
    const expanded = new Set(manuallyExpanded);
    for (const item of navItems) {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => child.id === activeView);
        if (hasActiveChild) {
          expanded.add(item.id);
        }
      }
    }
    return expanded;
  }, [manuallyExpanded, activeView]);

  // Group items by section
  const sections: { label: string; items: NavItem[] }[] = [];
  let currentSection = '';
  for (const item of filteredItems) {
    if (item.section !== currentSection) {
      currentSection = item.section;
      sections.push({ label: currentSection, items: [item] });
    } else {
      sections[sections.length - 1].items.push(item);
    }
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    const targetPath = view === 'dashboard' ? '/dashboard' : `/${view}`;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }
    // Close mobile sidebar on navigation
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      useEMSStore.setState({ sidebarCollapsed: true });
    }
  };

  const toggleExpanded = useCallback((itemId: string) => {
    setManuallyExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleParentClick = (item: NavItem) => {
    // Navigate to the parent view
    handleNavClick(item.id);
    // Toggle the dropdown
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    }
  };

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        useEMSStore.setState({ sidebarCollapsed: true });
      }
    };
    // Start collapsed on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      useEMSStore.setState({ sidebarCollapsed: true });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper: check if a parent item should appear highlighted (itself or any child active)
  const isParentActive = (item: NavItem) => {
    if (activeView === item.id) return true;
    if (item.children) {
      return item.children.some((child) => child.id === activeView);
    }
    return false;
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {!sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth < 768 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => toggleSidebar()}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: sidebarCollapsed ? 68 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 shrink-0',
          // On mobile: fixed position overlay; on desktop: relative/sticky
          'max-md:fixed max-md:left-0 max-md:top-0 max-md:bottom-0',
          'md:relative md:sticky md:top-0'
        )}
      >
        {/* ─── Sidebar Header: Company Logo/Name ─── */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-sidebar-border/50">
            <div className="flex items-center gap-2.5">
              {((settings.organization as Record<string, unknown>)?.companyLogoUrl as string) ? (
                <img
                  src={(settings.organization as Record<string, unknown>)?.companyLogoUrl as string}
                  alt={(settings.organization as Record<string, unknown>)?.companyName as string || 'Company'}
                  className="h-7 w-7 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {((settings.organization as Record<string, unknown>)?.companyName as string || 'EMS').charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                {(settings.organization as Record<string, unknown>)?.companyName as string || 'EMS'}
              </span>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="py-3 flex justify-center">
            {((settings.organization as Record<string, unknown>)?.companyLogoUrl as string) ? (
              <img
                src={(settings.organization as Record<string, unknown>)?.companyLogoUrl as string}
                alt={(settings.organization as Record<string, unknown>)?.companyName as string || 'Company'}
                className="h-7 w-7 rounded-md object-cover"
              />
            ) : (
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                {((settings.organization as Record<string, unknown>)?.companyName as string || 'EMS').charAt(0)}
              </div>
            )}
          </div>
        )}
        {/* ─── Mobile Close Button (only on mobile) ─── */}
        <div className="shrink-0 px-2 pt-2 md:hidden flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={toggleSidebar}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ─── Scrollable Navigation ─── */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="space-y-1 px-2 py-2">
            {sections.map((section) => (
              <div key={section.label}>
                {!sidebarCollapsed && (
                  <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.15em] text-sidebar-foreground/30 uppercase select-none">
                    {section.label}
                  </p>
                )}
                {sidebarCollapsed && <div className="pt-2" />}
                {section.items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedItems.has(item.id);
                  const parentActive = isParentActive(item);

                  if (hasChildren) {
                    // ─── Parent with children (collapsible) ───
                    return (
                      <div key={item.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              onClick={() => handleParentClick(item)}
                              className={cn(
                                'w-full justify-start gap-3 h-10 px-3 transition-all relative group overflow-hidden',
                                parentActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                                  : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground',
                                sidebarCollapsed && 'justify-center px-0'
                              )}
                            >
                              {/* Hover ripple */}
                              <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                              {/* Active left border glow — animated indicator */}
                              {parentActive && (
                                <motion.div
                                  layoutId="sidebar-active-indicator"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 via-emerald-300 to-emerald-400"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 24, opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                >
                                  {/* Glow dot at top */}
                                  <div className="absolute -top-0.5 left-0 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                  {/* Glow dot at bottom */}
                                  <div className="absolute -bottom-0.5 left-0 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                </motion.div>
                              )}

                              {/* Active border highlight */}
                              {parentActive && (
                                <motion.span
                                  layoutId="sidebar-active-border"
                                  className="absolute inset-0 rounded-md border border-emerald-500/20"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                />
                              )}

                              <item.icon className={cn(
                                'h-4 w-4 shrink-0 transition-colors relative z-10',
                                parentActive ? 'text-emerald-400' : 'group-hover:text-emerald-400/60'
                              )} />

                              {!sidebarCollapsed && (
                                <>
                                  <span className="text-sm relative z-10 flex-1 text-left">{item.label}</span>
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 0 : -90 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="relative z-10 flex items-center"
                                  >
                                    <ChevronDown className={cn(
                                      'h-3.5 w-3.5 transition-colors',
                                      parentActive ? 'text-emerald-400/70' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/60'
                                    )} />
                                  </motion.div>
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          {sidebarCollapsed && (
                            <TooltipContent side="right" sideOffset={8}>
                              {item.label}
                            </TooltipContent>
                          )}
                        </Tooltip>

                        {/* ─── Children dropdown ─── */}
                        {!sidebarCollapsed && (
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="ml-4 pl-3 border-l border-sidebar-border/50 space-y-0.5 py-0.5">
                                  {item.children!.map((child) => {
                                    const isChildActive = activeView === child.id;
                                    return (
                                      <Tooltip key={child.id}>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            onClick={() => handleNavClick(child.id)}
                                            className={cn(
                                              'w-full justify-start gap-2.5 h-8 px-2.5 transition-all relative group overflow-hidden',
                                              isChildActive
                                                ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                                                : 'text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground',
                                            )}
                                          >
                                            {/* Hover ripple */}
                                            <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                                            {/* Active left border glow */}
                                            {isChildActive && (
                                              <motion.div
                                                layoutId={`sidebar-child-active-${child.id}`}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-emerald-400"
                                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                              />
                                            )}

                                            {/* Active border highlight */}
                                            {isChildActive && (
                                              <span className="absolute inset-0 rounded-md border border-emerald-500/15" />
                                            )}

                                            <child.icon className={cn(
                                              'h-3.5 w-3.5 shrink-0 transition-colors relative z-10',
                                              isChildActive ? 'text-emerald-400' : 'group-hover:text-emerald-400/50'
                                            )} />
                                            <span className="text-xs relative z-10">{child.label}</span>
                                          </Button>
                                        </TooltipTrigger>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}

                        {/* ─── Collapsed sidebar: show child tooltips when expanded ─── */}
                        {sidebarCollapsed && isExpanded && parentActive && (
                          <div className="flex flex-col items-center gap-0.5 py-0.5">
                            {item.children!.map((child) => {
                              const isChildActive = activeView === child.id;
                              return (
                                <Tooltip key={child.id}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={() => handleNavClick(child.id)}
                                      className={cn(
                                        'w-full justify-center h-7 px-0 transition-all relative group overflow-hidden',
                                        isChildActive
                                          ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                                          : 'text-sidebar-foreground/50 hover:bg-white/5 hover:text-sidebar-foreground',
                                      )}
                                    >
                                      {isChildActive && (
                                        <span className="absolute inset-0 rounded-md border border-emerald-500/15" />
                                      )}
                                      <child.icon className={cn(
                                        'h-3 w-3 shrink-0 transition-colors relative z-10',
                                        isChildActive ? 'text-emerald-400' : 'group-hover:text-emerald-400/50'
                                      )} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" sideOffset={8}>
                                    {child.label}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ─── Regular item (no children) ───
                  const isActive = activeView === item.id;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          onClick={() => handleNavClick(item.id)}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={item.label}
                          className={cn(
                            'w-full justify-start gap-3 h-10 px-3 transition-all relative group overflow-hidden',
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                              : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground',
                            sidebarCollapsed && 'justify-center px-0'
                          )}
                        >
                          {/* Hover ripple */}
                          <span className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                          {/* Active left border glow — animated indicator */}
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active-indicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 via-emerald-300 to-emerald-400"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 24, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            >
                              {/* Glow dot at top */}
                              <div className="absolute -top-0.5 left-0 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                              {/* Glow dot at bottom */}
                              <div className="absolute -bottom-0.5 left-0 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                            </motion.div>
                          )}

                          {/* Active border highlight */}
                          {isActive && (
                            <motion.span
                              layoutId="sidebar-active-border"
                              className="absolute inset-0 rounded-md border border-emerald-500/20"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            />
                          )}

                          <item.icon className={cn(
                            'h-4 w-4 shrink-0 transition-colors relative z-10',
                            isActive ? 'text-emerald-400' : 'group-hover:text-emerald-400/60'
                          )} />
                          {!sidebarCollapsed && <span className="text-sm relative z-10">{item.label}</span>}
                        </Button>
                      </TooltipTrigger>
                      {sidebarCollapsed && (
                        <TooltipContent side="right" sideOffset={8}>
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* ─── Bottom Fixed Section ─── */}
        <div className="shrink-0 border-t border-sidebar-border bg-sidebar">
          {/* Collapse toggle */}
          <div className="px-2 pt-2 hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={toggleSidebar}
                  className="w-full justify-center h-9 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  Expand sidebar
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          <div className="h-px bg-sidebar-border my-1" />

          {/* Sign Out Button — always visible at bottom */}
          <div className="px-2 pb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className={cn(
                    'w-full gap-3 h-10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors',
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3'
                  )}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
                </Button>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  Sign Out
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
