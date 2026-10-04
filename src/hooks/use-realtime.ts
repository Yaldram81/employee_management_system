'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useUIStore } from '@/lib/ui-store';
import { useEMSStore } from '@/lib/store';
import type { Notification, NotificationActionData } from '@/lib/types';

const REALTIME_PORT = 3003;

interface RealtimeNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead?: boolean;
  actionUrl?: string;
  actionData?: string; // JSON string
  createdAt: string;
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  latency: number | null;
}

/**
 * Maps a notification type string to the appropriate sonner toast variant.
 */
function getToastVariant(type: string): 'error' | 'warning' | 'success' | 'info' {
  const lower = type.toLowerCase().replace(/_/g, '-');
  if (lower.includes('error')) return 'error';
  if (lower.includes('warning')) return 'warning';
  if (lower.includes('success')) return 'success';
  return 'info';
}

/**
 * Parses the actionData field which may be a JSON string or already an object.
 */
function parseActionData(raw: string | undefined | null): NotificationActionData | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as NotificationActionData;
    } catch {
      return undefined;
    }
  }
  return raw as unknown as NotificationActionData;
}

/**
 * Execute a notification action (approve/reject/acknowledge) directly from a toast.
 * Calls the /api/notification-action endpoint and updates the store on success.
 */
async function executeNotificationActionFromToast(
  notificationId: string,
  action: 'approve' | 'reject' | 'acknowledge'
) {
  try {
    const res = await fetch('/api/notification-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, action }),
    });
    if (!res.ok) throw new Error('Action failed');

    // Update store: mark notification as read and clear actionData
    useEMSStore.setState((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId
          ? { ...n, isRead: true, actionData: null }
          : n
      ),
    }));

    toast.success(`Successfully ${action}d`);
  } catch {
    toast.error(`Failed to ${action}. Try again.`);
  }
}

/**
 * Hook to manage Socket.IO real-time connection.
 * Connects on mount, joins user room, and updates store on events.
 */
export function useRealtime() {
  const userId = useUIStore((s) => s.user?.id);
  const userRole = useUIStore((s) => s.user?.role);
  const isAuthenticated = useUIStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    latency: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const latencyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connect/disconnect effect
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current);
        latencyIntervalRef.current = null;
      }
      return;
    }

    // Create Socket.IO connection
    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      query: { XTransformPort: REALTIME_PORT },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      socket.emit('join', { userId, role: userRole });
      setStatus({ connected: true, reconnecting: false, latency: null });
    });

    socket.on('disconnect', () => {
      setStatus((prev) => ({ ...prev, connected: false }));
    });

    socket.on('reconnect_attempt', () => {
      setStatus((prev) => ({ ...prev, reconnecting: true }));
    });

    socket.on('reconnect', () => {
      socket.emit('join', { userId, role: userRole });
      setStatus((prev) => ({ ...prev, reconnecting: false }));
    });

    // ─── Event handlers ────────────────────────────────────

    socket.on('notification:new', (data: RealtimeNotification) => {
      const actionData = parseActionData(data.actionData);
      const newNotif: Notification = {
        id: data.id,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type.toLowerCase().replace(/_/g, '-') as Notification['type'],
        isRead: data.isRead ?? false,
        link: data.actionUrl,
        actionData,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      useEMSStore.setState((state) => ({
        notifications: [newNotif, ...state.notifications],
      }));

      // Build actionable toast based on actionData
      if (actionData && actionData.actions && actionData.actions.length > 0) {
        const hasApprove = actionData.actions.includes('approve');
        const hasReject = actionData.actions.includes('reject');
        const hasAcknowledge = actionData.actions.includes('acknowledge');

        if (hasApprove && hasReject) {
          // Two-button toast: Approve (action) + Reject (cancel)
          toast.success(data.title, {
            description: data.message,
            duration: 10000,
            action: {
              label: 'Approve',
              onClick: () => {
                executeNotificationActionFromToast(data.id, 'approve');
              },
            },
            cancel: {
              label: 'Reject',
              onClick: () => {
                executeNotificationActionFromToast(data.id, 'reject');
              },
            },
          });
        } else if (hasApprove) {
          // Single approve button
          toast.success(data.title, {
            description: data.message,
            duration: 10000,
            action: {
              label: 'Approve',
              onClick: () => {
                executeNotificationActionFromToast(data.id, 'approve');
              },
            },
          });
        } else if (hasReject) {
          // Single reject button
          toast.error(data.title, {
            description: data.message,
            duration: 10000,
            action: {
              label: 'Reject',
              onClick: () => {
                executeNotificationActionFromToast(data.id, 'reject');
              },
            },
          });
        } else if (hasAcknowledge) {
          // Single acknowledge button
          toast.info(data.title, {
            description: data.message,
            duration: 10000,
            action: {
              label: 'Acknowledge',
              onClick: () => {
                executeNotificationActionFromToast(data.id, 'acknowledge');
              },
            },
          });
        } else {
          // Has actionData but no recognizable actions — fall through to default
          const variant = getToastVariant(data.type);
          toast[variant](data.title, {
            description: data.message,
            action: {
              label: 'View',
              onClick: () => {
                useEMSStore.getState().setNotificationPanelOpen(true);
              },
            },
          });
        }
      } else {
        // Default non-actionable toast
        const variant = getToastVariant(data.type);
        toast[variant](data.title, {
          description: data.message,
          action: {
            label: 'View',
            onClick: () => {
              useEMSStore.getState().setNotificationPanelOpen(true);
            },
          },
        });
      }
    });

    socket.on('leave:status-changed', (data: { leaveId: string; status: string; comment?: string }) => {
      useEMSStore.setState((state) => ({
        leaves: state.leaves.map((l) =>
          l.id === data.leaveId
            ? { ...l, status: data.status.toLowerCase() as typeof l.status, managerComment: data.comment }
            : l
        ),
      }));
      toast.info(`Leave request ${data.status.toLowerCase()}`);
    });

    socket.on('request:status-changed', (data: { requestId: string; status: string; comment?: string }) => {
      useEMSStore.setState((state) => ({
        requests: state.requests.map((r) =>
          r.id === data.requestId
            ? { ...r, status: data.status.toLowerCase() as typeof r.status, reviewComment: data.comment }
            : r
        ),
      }));
      toast.info(`Request ${data.status.toLowerCase()}`);
    });

    socket.on('complaint:status-changed', (data: { complaintId: string; status: string; resolution?: string }) => {
      useEMSStore.setState((state) => ({
        complaints: state.complaints.map((c) =>
          c.id === data.complaintId
            ? { ...c, status: data.status.toLowerCase() as typeof c.status, resolution: data.resolution }
            : c
        ),
      }));
      toast.info(`Complaint ${data.status.toLowerCase()}`);
    });

    socket.on('task:assigned', (data: { taskId: string; assigneeId: string; assigneeName: string }) => {
      useEMSStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === data.taskId
            ? { ...t, assigneeId: data.assigneeId, assigneeName: data.assigneeName }
            : t
        ),
      }));

      // Only show toast if the task is assigned to the current user
      if (data.assigneeId === userId) {
        toast.info('New task assigned to you');
      }
    });

    socket.on('task:status-changed', (data: { taskId: string; status: string }) => {
      useEMSStore.setState((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === data.taskId
            ? { ...t, status: data.status.toLowerCase() as typeof t.status }
            : t
        ),
      }));
      toast.info(`Task status updated to ${data.status.toLowerCase()}`);
    });

    socket.on('attendance:clock-in', (data: { userId: string }) => {
      if (data.userId === userId) {
        const store = useEMSStore.getState();
        if (store.user) {
          store.loadData(store.user.id, store.user.role).catch(() => {});
        }
      }
    });

    socket.on('payroll:status-changed', (data: { payrollId: string; status: string }) => {
      useEMSStore.setState((state) => ({
        payroll: state.payroll.map((p) =>
          p.id === data.payrollId
            ? { ...p, status: data.status.toLowerCase() as typeof p.status }
            : p
        ),
      }));
      toast.info(`Payroll ${data.status.toLowerCase()}`);
    });

    socketRef.current = socket;

    // Latency measurement
    latencyIntervalRef.current = setInterval(() => {
      const start = Date.now();
      socket.emit('ping', () => {
        const latency = Date.now() - start;
        setStatus((prev) => ({ ...prev, latency }));
      });
    }, 30000);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current);
        latencyIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, userId, userRole]);

  return status;
}
