import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  BookOpenCheck,
  CheckCheck,
  ClipboardCheck,
  GanttChartSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { GanttMonitoring } from './components/GanttMonitoring.tsx';
import { HowToUsePage } from './components/HowToUsePage.tsx';
import {
  InspectionWorkspace,
  isReportNeedingUserAction,
} from './components/InspectionWorkspace.tsx';
import { LibraryManager } from './components/LibraryManager.tsx';
import { PageTourOverlay } from './components/PageTourOverlay.tsx';
import { UserManagement } from './components/UserManagement.tsx';
import type {
  BootstrapPayload,
  RealtimeMessage,
  TourPageKey,
  User,
  UserNotification,
} from './types.ts';
import { formatRoleLabel, hasAnyRole } from './types.ts';
import { formatDateTime } from './utils/export.ts';

type ActiveTab = TourPageKey;
type ThemeMode = 'light' | 'dark';

const TOKEN_STORAGE_KEY = 'indspectora_session_token';
const THEME_STORAGE_KEY = 'indspectora_theme';

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('opsledger_session_token')
  );
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(Boolean(token));
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>(new Date().toISOString());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return (
        (localStorage.getItem('indspectora_sidebar_collapsed') ??
          localStorage.getItem('opsledger_sidebar_collapsed')) === 'true'
      );
    } catch {
      return false;
    }
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('opsledger_theme')) === 'dark'
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });
  const [focusTask, setFocusTask] = useState<{ projectId: string; taskId: string } | null>(null);
  const [focusAssetId, setFocusAssetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: 'info' | 'error' } | null>(null);

  // Notifications & First-Time Tour state
  const [showNotifications, setShowNotifications] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);
  const [tourDismissedSession, setTourDismissedSession] = useState<Set<TourPageKey>>(
    () => new Set()
  );
  const [forcedTourPage, setForcedTourPage] = useState<TourPageKey | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  useEffect(() => {
    if (!showNotifications) return;
    function handleOutsideClick(e: MouseEvent) {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotifications]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function toggleSidebarCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('indspectora_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  }

  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((message: string, kind: 'info' | 'error' = 'info') => {
    setToast({ message, kind });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4200);
  }, []);

  const fetchBootstrap = useCallback(async (activeToken: string) => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/bootstrap', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
        return;
      }
      if (!res.ok) return;
      const payload = (await res.json()) as BootstrapPayload;
      setData(payload);
      setLastSyncAt(new Date().toISOString());
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Verify stored token on startup
  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
          return;
        }
        const body = (await res.json()) as { user: User };
        if (!cancelled) {
          setUser(body.user);
          await fetchBootstrap(token);
        }
      } catch {
        if (!cancelled) notify('Unable to verify session with local server.', 'error');
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, fetchBootstrap, notify]);

  // Real-time WebSocket connection with automatic reconnect
  useEffect(() => {
    if (!token || !user) return;
    let closedByUser = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    function connect() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token!)}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as RealtimeMessage;
          if (msg.type !== 'connected') {
            setLastSyncAt(msg.timestamp || new Date().toISOString());
            fetchBootstrap(token!);
            const isRelevantToUser =
              !msg.targetUserId || msg.targetUserId === user!.id;
            if (msg.summary && isRelevantToUser) {
              notify(msg.summary, 'info');
            }
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByUser) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    }

    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [token, user, fetchBootstrap, notify]);

  // Keep activeTab valid if role changes or user is non-admin
  useEffect(() => {
    if (user && !hasAnyRole(user, 'admin') && activeTab === 'users') {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  function handleAuthenticated(nextToken: string, nextUser: User) {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setTourDismissedSession(new Set());
    setForcedTourPage(null);
    fetchBootstrap(nextToken);
  }

  async function handleLogout() {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setData(null);
    setSelectedReportId(null);
    setShowNotifications(false);
    setForcedTourPage(null);
  }

  async function handleOpenNotification(notif: UserNotification) {
    setShowNotifications(false);
    setSelectedReportId(notif.reportId);
    setActiveTab('inspections');
    if (!notif.isRead && token) {
      try {
        const res = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: notif.id }),
        });
        if (res.ok) {
          const body = (await res.json()) as { bootstrap?: BootstrapPayload };
          if (body.bootstrap) setData(body.bootstrap);
        }
      } catch {
        // Non-blocking
      }
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        const body = (await res.json()) as { bootstrap?: BootstrapPayload };
        if (body.bootstrap) setData(body.bootstrap);
      }
    } catch {
      notify('Unable to mark notifications read.', 'error');
    }
  }

  async function handleCompleteTour(pageKey: TourPageKey) {
    setForcedTourPage(null);
    setTourDismissedSession((prev) => {
      const next = new Set(prev);
      next.add(pageKey);
      return next;
    });
    if (!token) return;
    try {
      const res = await fetch(`/api/tours/${pageKey}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { bootstrap?: BootstrapPayload };
        if (body.bootstrap) setData(body.bootstrap);
      }
    } catch {
      // Non-blocking
    }
  }

  function handleDismissTour(pageKey: TourPageKey) {
    setForcedTourPage(null);
    setTourDismissedSession((prev) => {
      const next = new Set(prev);
      next.add(pageKey);
      return next;
    });
  }

  async function handleResetAllTours() {
    if (!token) return;
    try {
      const res = await fetch('/api/tours', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { bootstrap?: BootstrapPayload };
        if (body.bootstrap) setData(body.bootstrap);
        setTourDismissedSession(new Set());
        notify('All page tours reset. Guided walkthroughs will display on your next visit.');
      }
    } catch {
      notify('Failed to reset walkthrough progress.', 'error');
    }
  }

  const needMyActionCount = useMemo(() => {
    if (!user || !data) return 0;
    return data.reports.filter((r) => isReportNeedingUserAction(r, user)).length;
  }, [data, user]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] flex items-center justify-center">
        <div className="text-sm text-[#475569] dark:text-[#94A3B8] font-medium">
          Connecting to local IndSpectora server...
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <AuthGate
        onAuthenticated={handleAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const isAdmin = hasAnyRole(user, 'admin');
  const userRoleLabels = (user.roles && user.roles.length > 0 ? user.roles : [user.role])
    .map(formatRoleLabel)
    .join(' + ');

  const navItems: {
    key: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { key: 'inspections', label: 'Inspections & Audits', icon: ClipboardCheck },
    { key: 'library', label: 'Asset Library', icon: BookOpenCheck },
    { key: 'gantt', label: 'Projects', icon: GanttChartSquare },
    ...(isAdmin
      ? [{ key: 'users' as const, label: 'User Management', icon: Users }]
      : []),
    { key: 'howto', label: 'How to Use', icon: BookOpen },
  ];

  const activeBreadcrumb =
    activeTab === 'dashboard'
      ? 'Operations / Live Dashboard & Need My Action'
      : activeTab === 'library'
      ? 'Operations / Asset & Facility Library'
      : activeTab === 'inspections'
      ? selectedReportId
        ? 'Operations / Inspections / Audit Sheet'
        : 'Operations / Routine, Yearly & Eventual Inspections'
      : activeTab === 'users'
      ? 'Administration / User Management'
      : activeTab === 'howto'
      ? 'Knowledge Base / How to Use & Guided Tours'
      : 'Projects / Active Project & Blockers';

  const activeBlockedCount = (data?.blockers ?? []).filter((b) => !b.isResolved).length;
  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const completedTours = data?.completedTours ?? [];

  const activeTourPage: TourPageKey | null = !data
    ? null
    : forcedTourPage ??
      (!tourDismissedSession.has(activeTab) && !completedTours.includes(activeTab)
        ? activeTab
        : null);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex">
      {/* Sidebar (256px expanded / 64px collapsed icon rail on desktop, slide-over mobile) */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#111827] border-r border-[#E2E8F0] dark:border-[#1E293B] flex flex-col justify-between transition-all duration-200 lg:static lg:translate-x-0 shrink-0 ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        } ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div>
          <div
            className={`h-14 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center ${
              sidebarCollapsed ? 'lg:justify-center lg:px-2 px-5 justify-between' : 'px-5 justify-between'
            }`}
          >
            <span
              className={`font-display text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap ${
                sidebarCollapsed ? 'lg:hidden' : ''
              }`}
            >
              IndSpectora
            </span>

            <button
              type="button"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex items-center justify-center p-1.5 text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] rounded-md transition-colors"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className={sidebarCollapsed ? 'lg:p-2 p-3 space-y-1' : 'p-3 space-y-1'}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    setActiveTab(item.key);
                    if (item.key !== 'inspections') setSelectedReportId(null);
                    setMobileNavOpen(false);
                  }}
                  className={`relative w-full flex items-center text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    sidebarCollapsed
                      ? 'lg:justify-center lg:px-0 lg:py-2.5 justify-between px-3 py-2.5'
                      : 'justify-between px-3 py-2.5'
                  } ${
                    active
                      ? 'bg-[#EFF6FF] dark:bg-[#1E3A8A]/40 text-[#1D4ED8] dark:text-[#93C5FD]'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </span>

                  {item.key === 'inspections' && needMyActionCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center rounded font-mono tabular-nums font-bold ${
                        sidebarCollapsed
                          ? 'lg:absolute lg:top-1 lg:right-1 lg:px-1 lg:text-[9px] bg-[#DC2626] text-white'
                          : 'px-1.5 py-0.5 text-[10px] bg-[#DC2626] text-white'
                      }`}
                    >
                      {needMyActionCount}
                    </span>
                  )}

                  {item.key === 'gantt' && activeBlockedCount > 0 && (
                    <span
                      className={`font-mono text-[11px] text-[#DC2626] dark:text-[#F87171] tabular-nums ${
                        sidebarCollapsed
                          ? 'lg:absolute lg:top-1 lg:right-1.5 lg:text-[9px] lg:font-bold'
                          : ''
                      }`}
                    >
                      {activeBlockedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div
          className={`border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-2.5 ${
            sidebarCollapsed ? 'lg:p-2 p-4' : 'p-4'
          }`}
        >
          <div className={`text-xs ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <div className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
              {user.name}
            </div>
            <div className="text-[#64748B] dark:text-[#94A3B8] truncate">
              {user.title || 'Operations Member'}
              <span aria-hidden="true"> · </span>
              <span>{userRoleLabels}</span>
            </div>
          </div>

          <button
            type="button"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            onClick={toggleTheme}
            className={`w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md transition-colors ${
              sidebarCollapsed ? 'lg:px-0 px-3' : 'px-3'
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 shrink-0 text-[#FBBF24]" />
            ) : (
              <Moon className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            type="button"
            title="Sign Out"
            onClick={handleLogout}
            className={`w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md transition-colors ${
              sidebarCollapsed ? 'lg:px-0 px-3' : 'px-3'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (3-zone contract) */}
        <header className="no-print h-14 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#1E293B] px-6 flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-1.5 text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155] rounded"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-[#475569] dark:text-[#94A3B8] truncate">
              {activeBreadcrumb}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-[#475569] dark:text-[#94A3B8] shrink-0">
            <span className="whitespace-nowrap">
              {wsConnected ? (
                <span className="text-[#16A34A] dark:text-[#4ADE80]">Real-Time Sync Connected</span>
              ) : (
                <span className="text-[#D97706] dark:text-[#FBBF24]">Reconnecting Sync...</span>
              )}
            </span>
            <span aria-hidden="true" className="text-[#CBD5E1] dark:text-[#334155]">|</span>
            <span className="font-mono text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap tabular-nums">
              {data?.libraryItems.filter((i) => i.isActive).length ?? 0} active assets
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Notification Bell + Dropdown */}
            <div ref={notifContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((v) => !v)}
                title="Approval & Revision Notifications"
                className="relative p-1.5 text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                      Notifications ({notifications.length})
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1D4ED8] dark:text-[#60A5FA] hover:underline"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                        No notifications yet. Approval requests and send-back alerts appear here.
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleOpenNotification(n)}
                          className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-2.5 ${
                            n.isRead
                              ? 'hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/60'
                              : 'bg-[#EFF6FF]/60 dark:bg-[#1E3A8A]/20 hover:bg-[#EFF6FF] dark:hover:bg-[#1E3A8A]/35'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              n.isRead ? 'bg-transparent' : 'bg-[#1D4ED8] dark:bg-[#60A5FA]'
                            }`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                                {n.title}
                              </span>
                              <span className="font-mono text-[10px] text-[#1D4ED8] dark:text-[#60A5FA] shrink-0">
                                {n.reportNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] leading-snug line-clamp-2">
                              {n.message}
                            </p>
                            <div className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                              {formatDateTime(n.createdAt)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#FBBF24]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('inspections');
                setSelectedReportId(null);
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              New Inspection
            </button>
          </div>
        </header>

        {/* Workspace Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {!data && loadingData ? (
            <div className="space-y-4">
              <div className="h-24 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg animate-pulse" />
              <div className="h-72 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg animate-pulse" />
            </div>
          ) : data ? (
            <>
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  libraryItems={data.libraryItems}
                  reports={data.reports}
                  tasks={data.tasks}
                  blockers={data.blockers}
                  activityLogs={data.activityLogs}
                  currentUser={user}
                  lastSyncAt={lastSyncAt}
                  onOpenReport={(reportId) => {
                    setSelectedReportId(reportId);
                    setActiveTab('inspections');
                  }}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'library' && (
                <LibraryManager
                  items={data.libraryItems}
                  facilityAreas={data.facilityAreas ?? []}
                  projects={data.projects}
                  tasks={data.tasks}
                  reports={data.reports}
                  currentUser={user}
                  token={token}
                  onSyncComplete={() => fetchBootstrap(token)}
                  onNotify={notify}
                  onNavigateToTask={(projectId, taskId) => {
                    setFocusTask({ projectId, taskId });
                    setActiveTab('gantt');
                  }}
                  onOpenReport={(reportId) => {
                    setSelectedReportId(reportId);
                    setActiveTab('inspections');
                  }}
                  initialVisualAssetId={focusAssetId}
                  onClearInitialVisualAsset={() => setFocusAssetId(null)}
                />
              )}

              {activeTab === 'inspections' && (
                <InspectionWorkspace
                  reports={data.reports}
                  libraryItems={data.libraryItems}
                  facilityAreas={data.facilityAreas ?? []}
                  users={data.users ?? []}
                  selectedReportId={selectedReportId}
                  onSelectReport={setSelectedReportId}
                  currentUser={user}
                  token={token}
                  onSyncComplete={() => fetchBootstrap(token)}
                  onNotify={notify}
                  onNavigateToTask={(projectId, taskId) => {
                    setFocusTask({ projectId, taskId });
                    setActiveTab('gantt');
                  }}
                />
              )}

              {activeTab === 'gantt' && (
                <GanttMonitoring
                  projects={data.projects}
                  tasks={data.tasks}
                  blockers={data.blockers}
                  taskHistory={data.taskHistory ?? []}
                  taskComments={data.taskComments ?? []}
                  libraryItems={data.libraryItems}
                  users={data.users ?? []}
                  initialFocusTask={focusTask}
                  onClearInitialFocus={() => setFocusTask(null)}
                  onOpenAssetVisual={(assetId) => {
                    setFocusAssetId(assetId);
                    setActiveTab('library');
                  }}
                  currentUser={user}
                  token={token}
                  onSyncComplete={() => fetchBootstrap(token)}
                  onNotify={notify}
                />
              )}

              {activeTab === 'users' && isAdmin && (
                <UserManagement
                  users={data.users ?? []}
                  currentUser={user}
                  token={token}
                  onSyncComplete={() => fetchBootstrap(token)}
                  onNotify={notify}
                />
              )}

              {activeTab === 'howto' && (
                <HowToUsePage
                  currentUser={user}
                  completedTours={completedTours}
                  onStartTour={(pageKey) => {
                    if (pageKey === 'users' && !isAdmin) return;
                    setActiveTab(pageKey);
                    if (pageKey !== 'inspections') setSelectedReportId(null);
                    setForcedTourPage(pageKey);
                  }}
                  onResetAllTours={handleResetAllTours}
                />
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-10 text-center text-sm text-[#475569] dark:text-[#94A3B8]">
              Unable to load workspace data.{' '}
              <button
                type="button"
                onClick={() => fetchBootstrap(token)}
                className="text-[#1D4ED8] dark:text-[#60A5FA] font-medium hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </main>
      </div>

      {/* First-Time / Replay Guided Tour Overlay */}
      {activeTourPage && (
        <PageTourOverlay
          pageKey={activeTourPage}
          onComplete={handleCompleteTour}
          onDismiss={() => handleDismissTour(activeTourPage)}
        />
      )}

      {/* Live Notification Toast */}
      {toast && (
        <div className="no-print fixed bottom-5 right-5 z-50 max-w-sm bg-[#0F172A] dark:bg-[#1E293B] text-white px-4 py-3 rounded-md shadow-lg border border-[#334155] flex items-start justify-between gap-3">
          <div className="text-xs leading-relaxed">
            <span
              className={`font-semibold mr-1.5 ${
                toast.kind === 'error' ? 'text-[#FCA5A5]' : 'text-[#93C5FD]'
              }`}
            >
              {toast.kind === 'error' ? 'Error:' : 'Synced:'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-[#94A3B8] hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
