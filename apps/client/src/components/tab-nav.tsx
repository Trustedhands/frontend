'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, House, User, Wallet } from 'lucide-react';
import { cx } from '@trustedhands/ui';

const TABS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
  { href: '/payments', label: 'Payments', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: User },
];

/** Bottom tab bar on phones; a centred top bar from 900px. */
export function TabNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Main"
      className={cx(
        'sticky bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white px-2 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))]',
        'min-[900px]:top-0 min-[900px]:bottom-auto min-[900px]:order-first min-[900px]:flex min-[900px]:justify-center',
        'min-[900px]:gap-2 min-[900px]:border-t-0 min-[900px]:border-b min-[900px]:px-6 min-[900px]:py-2',
      )}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex min-h-[52px] flex-col items-center justify-center gap-1 text-xs no-underline',
              'min-[900px]:min-h-11 min-[900px]:flex-row min-[900px]:rounded-xl min-[900px]:px-4 min-[900px]:text-sm',
              active
                ? 'font-bold text-cta hover:text-cta'
                : 'font-medium text-muted hover:text-ink',
            )}
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
