'use client';

import { Badge, initials, MultiChipGroup } from '@trustedhands/ui';
import type { Language } from '@trustedhands/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MomoChip } from '@/components/momo-chip';
import { TabScreen } from '@/components/tab-screen';
import { api, unwrap } from '@/lib/api';
import { LANGUAGE_OPTIONS } from '@/lib/labels';
import { keys, useMe } from '@/lib/queries';
import { session } from '@/lib/session';

const LINKS = [
  { href: '/signup/about?edit=1', label: 'Personal details & address' },
  { href: '/signup/verify?edit=1', label: 'Verification & ID' },
  { href: '/profile/password', label: 'Change password' },
  { href: '/signup/permissions?edit=1', label: 'Notifications & location' },
  { href: '/install', label: 'Install the app' },
];

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe().data!;
  const profile = me.profile!;

  const languages = useMutation({
    mutationFn: (preferredLanguages: Language[]) =>
      unwrap(api.PATCH('/v1/me/profile', { body: { preferredLanguages } })),
    onMutate: (preferredLanguages) => {
      // Optimistic: chips respond instantly
      queryClient.setQueryData(keys.me, { ...me, profile: { ...profile, preferredLanguages } });
    },
    onSuccess: (saved) => queryClient.setQueryData(keys.me, saved),
    onError: () => queryClient.invalidateQueries({ queryKey: keys.me }),
  });

  const logOut = async () => {
    await session.signOut();
    router.replace('/login');
  };

  const place = me.homeAddress ? ` · ${me.homeAddress.sector}, ${me.homeAddress.district}` : '';
  const kyc = {
    NOT_STARTED: <Badge tone="neutral">ID not added</Badge>,
    PENDING: <Badge tone="warn">ID in review</Badge>,
    VERIFIED: <Badge tone="success">ID verified</Badge>,
    REJECTED: <Badge tone="danger">ID needs another look</Badge>,
  }[profile.kycStatus];

  return (
    <TabScreen>
      <div className="flex items-center gap-3.5">
        <div
          aria-hidden="true"
          className="flex size-16 flex-none items-center justify-center rounded-full bg-peach font-display text-[22px] font-extrabold text-cta-hover"
        >
          {initials(profile.fullName)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="m-0 truncate font-display text-[22px] font-extrabold tracking-[-0.02em]">
            {profile.fullName}
          </h1>
          <span className="text-[13px] text-muted">
            {profile.accountType === 'COMPANY' ? (profile.companyName ?? 'Company') : 'Individual'}
            {place}
          </span>
        </div>
        <Link
          href="/signup/about?edit=1"
          className="flex min-h-11 items-center rounded-xl border border-field bg-white px-3.5 text-sm font-bold text-ink no-underline hover:text-ink"
        >
          Edit
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone={me.phoneVerified ? 'success' : 'warn'}>
          {me.phoneVerified ? 'Phone verified' : 'Phone not verified'}
        </Badge>
        <Badge tone={me.emailVerified ? 'success' : 'warn'}>
          {me.emailVerified ? 'Email verified' : 'Email not verified'}
        </Badge>
        {kyc}
      </div>

      <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4">
        <MultiChipGroup
          legend="Preferred worker language"
          legendClassName="font-bold"
          options={LANGUAGE_OPTIONS}
          value={profile.preferredLanguages}
          onChange={(value) => languages.mutate(value)}
        />
      </section>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
        <span className="px-4 pt-4 pb-1.5 text-sm font-bold">Payment methods</span>
        {me.paymentMethods.length === 0 ? (
          <span className="px-4 pb-4 text-sm text-muted">
            Your Mobile Money number is saved here after your first payment.
          </span>
        ) : (
          me.paymentMethods.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0"
            >
              <MomoChip />
              <span className="flex-1 text-[15px]">{m.msisdnMasked}</span>
              {m.isDefault && <Badge tone="info">Default</Badge>}
            </div>
          ))
        )}
      </section>

      <nav
        aria-label="Settings"
        className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-[52px] items-center justify-between border-b border-divider px-4 text-[15px] font-semibold text-ink no-underline last:border-b-0 hover:text-ink"
          >
            {l.label}
            <ChevronRight size={20} className="text-muted" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={logOut}
        className="bg-transparent p-2.5 text-[15px] font-bold text-danger"
      >
        Log out
      </button>
    </TabScreen>
  );
}
