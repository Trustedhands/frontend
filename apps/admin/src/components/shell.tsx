'use client';

import type { Permission } from '@trustedhands/api';
import { cx, initials } from '@trustedhands/ui';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Headset,
  LayoutDashboard,
  LogOut,
  Settings,
  Shuffle,
  UserRound,
  Users,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { api, unwrap } from '@/lib/api';
import { STAFF_ROLES } from '@/lib/labels';
import { session } from '@/lib/session';
import { useCan, useStaff } from '@/lib/staff';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** Badge with the number of requests waiting on ops */
  badge?: boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  {
    href: '/requests',
    label: 'Requests',
    icon: ClipboardList,
    permission: 'requests.view',
    badge: true,
  },
  { href: '/matching', label: 'Matching', icon: Shuffle, permission: 'requests.view' },
  { href: '/workers', label: 'Workers', icon: Users, permission: 'workers.view' },
  { href: '/clients', label: 'Clients', icon: UserRound, permission: 'clients.view' },
  { href: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments.view' },
  { href: '/support', label: 'Customer service', icon: Headset, permission: 'tickets.view' },
  { href: '/settings', label: 'Settings & team', icon: Settings, permission: 'settings.manage' },
];

export const dashboardKey = ['admin', 'dashboard'] as const;

/** The navy sidebar + main area from the admin design. */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useStaff();
  const can = useCan();
  // Same query as the dashboard, so the badge stays in step with it
  const dashboard = useQuery({
    queryKey: dashboardKey,
    queryFn: () => unwrap(api.GET('/v1/admin/dashboard')),
    refetchInterval: 60_000,
  });
  const waiting = dashboard.data
    ? dashboard.data.counts.newCount + dashboard.data.counts.paidCount
    : 0;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const signOut = async () => {
    await session.signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-dvh bg-canvas md:flex">
      {/* Sidebar from md up; a top bar with a scrolling nav on small screens */}
      <aside className="flex flex-col gap-3 bg-ink px-4 py-4 text-white md:sticky md:top-0 md:h-dvh md:w-[248px] md:flex-none md:gap-7 md:overflow-y-auto md:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-2 text-white no-underline hover:text-white"
          >
            <span
              className="flex size-[34px] items-center justify-center rounded-[10px] bg-brand"
              aria-hidden="true"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11l9-7 9 7" />
                <path d="M6 10v10h12V10" />
              </svg>
            </span>
            <span className="font-display text-lg font-extrabold">
              TrustedHands <span className="font-medium text-brand-soft">Ops</span>
            </span>
          </Link>
          <SignOutButton onClick={signOut} className="md:hidden" />
        </div>

        <nav
          aria-label="Admin"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:px-0"
        >
          {NAV.filter(
            (item) => can(item.permission) || (item.href === '/settings' && can('team.manage')),
          ).map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-11 flex-none items-center gap-3 rounded-[10px] px-3 text-sm whitespace-nowrap no-underline',
                  active
                    ? 'bg-ink-2 font-bold text-white hover:text-white'
                    : 'font-medium text-mist hover:bg-ink-deep hover:text-white',
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
                {badge && waiting > 0 && (
                  <span
                    className="ml-auto rounded-[10px] bg-brand-soft px-2 py-0.5 text-xs font-bold text-ink"
                    aria-label={`${waiting} waiting`}
                  >
                    {waiting}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden items-center gap-2.5 rounded-xl bg-ink-deep p-3 md:flex">
          <span
            className="flex size-9 flex-none items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-ink"
            aria-hidden="true"
          >
            {initials(me.fullName)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold">{me.fullName}</span>
            <span className="text-xs text-mist">{STAFF_ROLES[me.staffRole].label}</span>
          </span>
          <SignOutButton onClick={signOut} />
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-6 pb-12 sm:px-8 md:pt-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}

function SignOutButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sign out"
      className={cx(
        'flex size-9 flex-none items-center justify-center rounded-lg border-0 bg-transparent text-mist hover:bg-ink-2 hover:text-white',
        className,
      )}
    >
      <LogOut size={18} aria-hidden="true" />
    </button>
  );
}
