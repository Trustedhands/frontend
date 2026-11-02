'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, House, Plus, User, Wallet } from 'lucide-react';
import { buttonClass, cx } from '@trustedhands/ui';
import { BrandLockup } from '@/components/brand-mark';

const TABS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
  { href: '/payments', label: 'Payments', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: User },
];

/** Bottom tab bar on phones; from 900px a top bar with the brand and "New request". */
export function TabNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Main"
      className={cx(
        'sticky bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white px-2 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))]',
        'min-[900px]:top-0 min-[900px]:bottom-auto min-[900px]:order-first min-[900px]:flex min-[900px]:items-center',
        'min-[900px]:gap-1 min-[900px]:border-t-0 min-[900px]:border-b min-[900px]:px-6 min-[900px]:py-2.5',
        // Lines the bar up with the 1200px content column
        'min-[1280px]:px-[calc((100vw_-_1200px)/2_+_32px)]',
      )}
    >
      <Link
        href="/"
        aria-label="TrustedHands home"
        className="mr-6 hidden text-ink no-underline hover:text-ink min-[900px]:block"
      >
        <BrandLockup />
      </Link>
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
      <Link
        href="/requests/new"
        className={buttonClass('primary', 'sm', 'ml-auto hidden min-[900px]:inline-flex')}
      >
        <Plus size={18} aria-hidden="true" />
        New request
      </Link>
    </nav>
  );
}
