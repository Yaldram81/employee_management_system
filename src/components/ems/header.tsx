'use client';

import { useSyncExternalStore } from 'react';
import { useEMSStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut, User, Shield, ShieldCheck, Users, Search, Sun, Moon, PanelLeftClose, PanelLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  attendance: 'Attendance',
  leaves: 'Leave Management',
  tasks: 'Task Board',
  requests: 'Requests',
  complaints: 'Complaints',
  analytics: 'Analytics',
  settings: 'Settings',
  payroll: 'Payroll',
  users: 'User Management',
  rules: 'Rules Engine',
  team: 'Team Overview',
};

const roleConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  admin: { icon: Shield, label: 'Admin', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  manager: { icon: ShieldCheck, label: 'Manager', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  employee: { icon: Users, label: 'Employee', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
};

export function Header() {
  const { user, activeView, notifications, setNotificationPanelOpen, logout, toggleSidebar, sidebarCollapsed, toggleCommandPalette, settings } = useEMSStore();
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const role = user?.role || 'employee';
  const roleInfo = roleConfig[role] || roleConfig.employee;
  const RoleIcon = roleInfo.icon;
  const companyName = (settings.organization as Record<string, unknown>)?.companyName as string || 'EMS';
  const companyLogoUrl = (settings.organization as Record<string, unknown>)?.companyLogoUrl as string || '';
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Sidebar toggle — always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {sidebarCollapsed ? (
              <motion.div
                key="panel-open"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <PanelLeft className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="panel-close"
                initial={{ rotate: -90, scale: 0, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <PanelLeftClose className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">
            {companyLogoUrl && <img src={companyLogoUrl} alt={companyName} className="h-5 w-5 rounded mr-1.5 inline-block" />}
            {viewTitles[activeView] || 'Dashboard'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCommandPalette}
            className="h-8 sm:h-9 gap-2 text-muted-foreground hover:text-foreground border-border bg-background/50 hover:bg-accent"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-xs">Search</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1 py-0 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </motion.div>

        {/* Theme Toggle */}
        {mounted && (
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleTheme}
              className="relative h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, scale: 0, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: -90, scale: 0, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        )}

        {/* Notifications Bell */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setNotificationPanelOpen(true)}
          className="relative h-8 w-8 sm:h-9 sm:w-9"
          aria-label={`${unreadCount} unread notifications`}
        >
          <AnimatePresence mode="wait">
            {unreadCount > 0 ? (
              <motion.div
                key="bell-active"
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.8, rotate: 10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <motion.div
                  animate={{ rotate: [0, 12, -8, 6, -3, 0] }}
                  transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.6, ease: 'easeInOut' }}
                >
                  <Bell className="h-4 w-4" />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="bell-idle"
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0.5 }}
              >
                <Bell className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="absolute -top-1 -right-1"
              >
                <Badge className="h-4 min-w-4 rounded-full p-0 flex items-center justify-center bg-rose-500 text-white text-[9px] font-semibold border-0 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-8 sm:h-9 px-1.5 sm:px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-cyan-600 text-white text-xs">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline max-w-[100px] truncate">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <RoleIcon className={`h-3 w-3 ${roleInfo.color}`} />
                  <span className={`text-xs font-medium ${roleInfo.color}`}>{roleInfo.label}</span>
                  {user?.department && (
                    <span className="text-xs text-muted-foreground">· {user.department}</span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-rose-400 focus:text-rose-300 cursor-pointer">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
