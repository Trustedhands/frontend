'use client';

import { Alert, Button, buttonClass, cx, HeroPanel } from '@trustedhands/ui';
import Link from 'next/link';
import { useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { FlowScreen, PageHeader } from '@/components/screen';
import { useBrowserValue } from '@/lib/browser';
import { useInstall, type Platform } from '@/lib/install';

const GUIDES: Record<Platform, { heading: string; steps: Array<{ title: string; hint: string }> }> =
  {
    ios: {
      heading: 'In Safari',
      steps: [
        {
          title: 'Tap the Share button',
          hint: 'The square with an arrow, in the bar at the bottom.',
        },
        {
          title: 'Tap "Add to Home Screen"',
          hint: 'Scroll down the share menu if you don’t see it.',
        },
        { title: 'Tap Add', hint: 'The TrustedHands icon appears on your Home Screen.' },
      ],
    },
    android: {
      heading: 'Or from the Chrome menu',
      steps: [
        { title: 'Tap the ⋮ menu', hint: 'Top right of Chrome.' },
        {
          title: 'Tap "Install app" or "Add to Home screen"',
          hint: 'The wording depends on your phone.',
        },
        { title: 'Confirm with Install', hint: 'Open TrustedHands from your apps like any other.' },
      ],
    },
    desktop: {
      heading: 'In Chrome or Edge',
      steps: [
        {
          title: 'Click the install icon in the address bar',
          hint: 'A small screen with a down arrow, on the right.',
        },
        { title: 'Click Install', hint: 'TrustedHands opens in its own window.' },
      ],
    },
  };

const TABS: Array<{ value: Platform; label: string }> = [
  { value: 'ios', label: 'iPhone' },
  { value: 'android', label: 'Android' },
  { value: 'desktop', label: 'Computer' },
];

export default function InstallPage() {
  const { platform, standalone, canPrompt, promptInstall } = useInstall();
  // Defaults to the detected device until the user picks a tab
  const [picked, setTab] = useState<Platform | null>(null);
  const tab = picked ?? platform;
  const host = useBrowserValue(() => window.location.host, '');
  const guide = GUIDES[tab];

  return (
    <FlowScreen className="gap-5">
      <PageHeader backHref="/" title="Install the app" />

      <HeroPanel className="flex-row items-center gap-4">
        <div className="flex items-center gap-4">
          <BrandMark size={64} />
          <div className="flex max-w-[220px] flex-col gap-1">
            <span className="font-display text-xl font-extrabold">
              TrustedHands on your home screen
            </span>
            <span className="text-sm leading-[1.4] text-mist">
              Opens full screen, loads fast, no app store or big download.
            </span>
          </div>
        </div>
      </HeroPanel>

      {standalone ? (
        <Alert tone="success" title="You're using the installed app">
          TrustedHands is already on this device.
        </Alert>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Your device"
            className="grid grid-cols-3 gap-1 rounded-[14px] border border-line bg-white p-1"
          >
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cx(
                  'min-h-11 rounded-[10px] border-0 text-sm font-bold',
                  tab === t.value ? 'bg-ink text-white' : 'bg-transparent text-muted',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab !== 'ios' && canPrompt && (
            <div className="flex flex-col gap-2.5">
              <Button onClick={() => void promptInstall()}>Install app</Button>
              <span className="text-center text-[13px] text-muted">
                {tab === 'android' ? 'Chrome' : 'Your browser'} shows its own confirmation. Tap
                Install.
              </span>
            </div>
          )}

          <section className="flex flex-col gap-1 rounded-2xl border border-line bg-white px-4 py-2">
            <span className="pt-2 pb-1 text-sm font-bold">{guide.heading}</span>
            <ol className="m-0 flex list-none flex-col p-0">
              {guide.steps.map((s, i) => (
                <li key={s.title} className="flex items-start gap-3 border-t border-divider py-3">
                  <span className="flex size-7 flex-none items-center justify-center rounded-full bg-peach text-sm font-extrabold text-cta-hover">
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5 text-[15px] leading-[1.4]">
                    <span className="font-bold">{s.title}</span>
                    <span className="text-[13px] text-muted">{s.hint}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <p className="m-0 text-[13px] leading-[1.45] text-muted">
            Prefer not to install? Everything also works in your browser{host ? ` at ${host}` : ''}.
          </p>
        </>
      )}

      <div className="mt-auto">
        <Link href="/" className={buttonClass('outline', 'lg', 'w-full')}>
          Done
        </Link>
      </div>
    </FlowScreen>
  );
}
