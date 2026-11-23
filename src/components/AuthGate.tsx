import React, { useState } from 'react';
import {
  ClipboardCheck,
  GanttChartSquare,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
} from 'lucide-react';
import type { User } from '../types.ts';

interface AuthGateProps {
  onAuthenticated: (token: string, user: User) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function AuthGate({ onAuthenticated, theme, onToggleTheme }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, email, password, title };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { token?: string; user?: User; error?: string };
      if (!res.ok || !data.token || !data.user) {
        setError(data.error ?? 'Authentication failed. Please verify your credentials.');
        return;
      }
      onAuthenticated(data.token, data.user);
    } catch {
      setError('Unable to reach local operations server.');
    } finally {
      setLoading(false);
    }
  }

  function fillStarterAccount(accountEmail: string, accountPass: string) {
    setMode('login');
    setEmail(accountEmail);
    setPassword(accountPass);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-center py-10 px-6 relative">
      <button
        type="button"
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="absolute top-5 right-6 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#475569] dark:text-[#CBD5E1] bg-white dark:bg-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md transition-colors"
      >
        {theme === 'dark' ? (
          <>
            <Sun className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-[#475569]" />
            <span>Dark Mode</span>
          </>
        )}
      </button>

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Context Column */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-5 mb-6">
              <span className="font-display text-xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
                OpsLedger
              </span>
              <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
                Local Operations Server
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] leading-tight mb-4 max-w-md [text-wrap:balance]">
              Asset Inspection Reporting &amp; Project Operations Control
            </h1>
            <p className="text-[15px] text-[#475569] dark:text-[#94A3B8] leading-relaxed mb-8">
              Standardize asset inspections with visual checkpoint drawings, custom inspection
              parameters, multi-approver sequential routing, and immutable Digital Footprints,
              synchronized live with project WBS schedules.
            </p>

            <div className="space-y-4 border-t border-[#E2E8F0] dark:border-[#1E293B] pt-6">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="w-5 h-5 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Central Asset Library, Visual Pins &amp; Sequential Approvals
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    Facility-linked assets, CSV bulk import, custom inspection readings, 1–6 step
                    approvals, and full per-asset edit histories.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <GanttChartSquare className="w-5 h-5 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Projects Scheduling &amp; Activity Blocker Chain
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    WBS hierarchy, Gantt &amp; Table views, registered user assignees, change audit
                    history, and dependency guards.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-3">
              Quick Fill Seeded Local Accounts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillStarterAccount('admin@opsledger.local', 'admin123')}
                className="text-left px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md transition-colors"
              >
                <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Admin / Approver Account
                </div>
                <div className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                  admin@opsledger.local
                </div>
              </button>
              <button
                type="button"
                onClick={() => fillStarterAccount('inspector@opsledger.local', 'inspect123')}
                className="text-left px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-md transition-colors"
              >
                <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Standard User Account
                </div>
                <div className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                  inspector@opsledger.local
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg p-8 flex flex-col justify-center">
          <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] dark:bg-[#0F172A] rounded-md mb-6 w-fit border border-[#E2E8F0] dark:border-[#1E293B]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`px-4 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`px-4 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Create Local Account
            </button>
          </div>

          <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC] mb-1">
            {mode === 'login' ? 'Sign in to local workspace' : 'Register a new local account'}
          </h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-6">
            {mode === 'login'
              ? 'Authenticate against the local SQLite database to sync inspections and schedules.'
              : 'New self-registered accounts start with the standard User role; Admins can grant Approver or Admin roles later.'}
          </p>

          {error && (
            <div className="mb-5 px-3.5 py-2.5 bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#B91C1C] text-[#B91C1C] dark:text-[#FCA5A5] text-xs font-medium rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-[#CBD5E1] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morgan Lee"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-md focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-[#CBD5E1] mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Plant Reliability Technician"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-md focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#334155] dark:text-[#CBD5E1] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.local"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-md focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] dark:text-[#CBD5E1] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter password'}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-md focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 rounded-md transition-colors"
            >
              {mode === 'login' ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating account...' : 'Create Local Account'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] dark:text-[#4ADE80] shrink-0" />
            <span>Passwords are salted and hashed with scrypt on your local server.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
