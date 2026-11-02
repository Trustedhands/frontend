'use client';

import { buttonClass, StepBar } from '@trustedhands/ui';
import {
  BadgeCheck,
  ClipboardList,
  HandCoins,
  Headset,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLockup, BrandMark } from '@/components/brand-mark';
import { categoryIcon } from '@/components/category-icon';
import { useServiceTypes } from '@/lib/queries';

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Tell us what you need',
    body: 'Pick a service, a time and your address. Add the size of your home and what to focus on.',
  },
  {
    icon: UserCheck,
    title: 'We match and price it',
    body: 'Our team chooses a verified worker who fits your preferences and sends you a clear price.',
  },
  {
    icon: Smartphone,
    title: 'Pay with MoMo',
    body: 'Accept the price and approve it on your phone, or pay from your TrustedHands wallet.',
  },
  {
    icon: HandCoins,
    title: 'Job done, worker paid',
    body: 'We hold your payment until the job is finished, then pay the worker. Not happy? Tell us.',
  },
];

const PROMISES = [
  {
    icon: BadgeCheck,
    title: 'Verified workers',
    body: 'Every worker is ID-checked, reference-checked and interviewed by our team before their first job.',
  },
  {
    icon: ShieldCheck,
    title: 'Your money is protected',
    body: 'Payments are held until the work is done. If something goes wrong, we can refund you.',
  },
  {
    icon: Headset,
    title: 'A real team behind every booking',
    body: 'People, not an algorithm, match you and follow up. Report an issue any time from the app.',
  },
];

const FAQ = [
  {
    q: 'How much does it cost?',
    a: 'It depends on the job. After you send a request we reply with a price for the worker plus a small service fee. Nothing is charged until you accept it.',
  },
  {
    q: 'How do I pay?',
    a: 'With MTN Mobile Money. You approve the payment on your phone with your PIN. You can also top up a TrustedHands wallet and pay bookings from it in one tap.',
  },
  {
    q: 'What if I need someone long-term?',
    a: 'Choose house help (long-term). We match you with a live-in or live-out worker for a one-off match fee; you agree their salary and pay them directly.',
  },
  {
    q: 'Where do you work?',
    a: 'Across Kigali. Add your district and sector when you sign up and we will find someone nearby.',
  },
];

/** The public home page, for visitors who aren't signed in. */
export function Landing() {
  const services = useServiceTypes();

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-ink no-underline hover:text-ink" aria-label="TrustedHands">
            <span className="hidden sm:block">
              <BrandLockup />
            </span>
            <span className="sm:hidden">
              <BrandMark size={34} />
            </span>
          </Link>
          <nav
            aria-label="Sections"
            className="hidden items-center gap-7 text-sm font-semibold md:flex"
          >
            <a href="#services" className="text-ink no-underline hover:text-cta">
              Services
            </a>
            <a href="#how-it-works" className="text-ink no-underline hover:text-cta">
              How it works
            </a>
            <a href="#faq" className="text-ink no-underline hover:text-cta">
              Questions
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClass('ghost', 'sm', 'px-3 text-ink')}>
              Log in
            </Link>
            <Link href="/signup" className={buttonClass('primary', 'sm')}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:px-8 lg:pt-16 lg:pb-20">
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-peach-line bg-peach px-3 py-1 text-[13px] font-bold text-cta-hover">
              <Sparkles size={14} aria-hidden="true" />
              Home services in Kigali
            </span>
            <h1 className="m-0 font-display text-[40px] leading-[1.02] font-extrabold tracking-[-0.035em] sm:text-[52px] lg:text-[60px]">
              Trusted help at home, without the guesswork.
            </h1>
            <p className="m-0 max-w-[560px] text-[17px] leading-[1.5] text-muted">
              Book vetted cleaners, cooks, drivers and house help. We match you with a verified
              worker, send you a price to confirm, and hold your payment until the job is done.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass('primary', 'lg', 'px-7')}>
                Book a service
              </Link>
              <Link href="/login" className={buttonClass('outline', 'lg', 'px-7')}>
                I have an account
              </Link>
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm font-semibold text-ink">
              {['ID-checked workers', 'Pay with MTN MoMo', 'Payment held until done'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <BadgeCheck size={18} className="text-success" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroIllustration />
        </section>

        {/* Services */}
        <Band id="services" className="bg-white">
          <SectionTitle
            eyebrow="Services"
            title="One place for help around the home"
            lead="One-off visits or someone long-term. Tell us what you need and we'll handle the rest."
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(services.data ?? []).map((s) => {
              const Icon = categoryIcon(s.key);
              return (
                <Link
                  key={s.key}
                  href="/signup"
                  className="group flex min-h-[112px] flex-col justify-between gap-4 rounded-2xl border border-line bg-canvas p-4 text-ink no-underline transition-colors hover:border-ink hover:text-ink"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-white text-cta">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{s.label}</span>
                    <span className="text-[13px] text-muted">
                      {s.feeType === 'MATCH'
                        ? 'Long-term match'
                        : s.feeType === 'EITHER'
                          ? 'One-off or long-term'
                          : 'One-off visit'}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Band>

        {/* How it works */}
        <Band id="how-it-works">
          <SectionTitle
            eyebrow="How it works"
            title="From request to a finished job in four steps"
          />
          <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-sky text-ink">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="font-display text-[28px] font-extrabold text-line">{i + 1}</span>
                </span>
                <span className="text-base font-bold">{title}</span>
                <span className="text-sm leading-[1.5] text-muted">{body}</span>
              </li>
            ))}
          </ol>
        </Band>

        {/* Why us */}
        <section className="bg-ink text-white">
          <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold tracking-[0.1em] text-brand-soft uppercase">
                Why TrustedHands
              </span>
              <h2 className="m-0 font-display text-[32px] leading-[1.08] font-extrabold tracking-[-0.03em] lg:text-[40px]">
                Letting someone into your home takes trust. We earn it before they arrive.
              </h2>
              <p className="m-0 max-w-[480px] text-[15px] leading-[1.55] text-mist">
                We meet every worker, check who they are and who they&apos;ve worked for, and stay
                on hand until your job is done.
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {PROMISES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4 rounded-2xl bg-ink-deep p-5">
                  <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-brand text-white">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-base font-bold">{title}</span>
                    <span className="text-sm leading-[1.5] text-mist">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <Band id="faq">
          <SectionTitle eyebrow="Questions" title="Good to know" />
          <div className="grid gap-3 lg:grid-cols-2">
            {FAQ.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-line bg-white px-5 py-4 open:pb-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden="true"
                    className="flex size-8 flex-none items-center justify-center rounded-full bg-sand text-lg transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="m-0 mt-3 text-sm leading-[1.55] text-muted">{a}</p>
              </details>
            ))}
          </div>
        </Band>

        {/* Final call to action */}
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
          <div className="relative flex flex-col items-start gap-5 overflow-hidden rounded-[24px] bg-cta p-7 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div
              aria-hidden="true"
              className="absolute -top-16 -right-10 size-[200px] rounded-full border-[30px] border-white/15"
            />
            <div className="relative flex flex-col gap-2">
              <h2 className="m-0 font-display text-[28px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[34px]">
                Ready when you are.
              </h2>
              <p className="m-0 text-[15px] text-white/85">
                Sign up in two minutes. Your first price arrives with no commitment.
              </p>
            </div>
            <Link
              href="/signup"
              className={buttonClass('dark', 'lg', 'relative px-8 hover:text-white')}
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <span>© {new Date().getFullYear()} TrustedHands · Kigali, Rwanda</span>
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5 font-semibold">
            <Link href="/login" className="text-ink no-underline hover:text-cta">
              Log in
            </Link>
            <Link href="/signup" className="text-ink no-underline hover:text-cta">
              Sign up
            </Link>
            <Link href="/install" className="text-ink no-underline hover:text-cta">
              Install the app
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Band({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-16 ${className ?? ''}`}>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {children}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="flex max-w-[640px] flex-col gap-3">
      <span className="text-xs font-bold tracking-[0.1em] text-cta uppercase">{eyebrow}</span>
      <h2 className="m-0 font-display text-[30px] leading-[1.08] font-extrabold tracking-[-0.03em] lg:text-[38px]">
        {title}
      </h2>
      {lead && <p className="m-0 text-[15px] leading-[1.55] text-muted">{lead}</p>}
    </div>
  );
}

/** A stylised booking, built from the app's own pieces. Decorative. */
function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end"
    >
      <div className="absolute -top-8 -right-6 size-[220px] rounded-full border-[34px] border-brand opacity-90" />
      <div className="relative flex flex-col gap-4 rounded-[26px] bg-ink p-5 text-white shadow-[0_30px_60px_-30px_rgba(19,41,75,0.6)] sm:p-6">
        <span className="text-sm text-mist">Good morning</span>
        <span className="font-display text-[24px] leading-[1.1] font-bold tracking-[-0.02em]">
          What do you need help with today?
        </span>
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 text-ink">
          <div className="flex items-start justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-bold">Cleaning</span>
              <span className="text-[13px] text-muted">Saturday · 9:00 · 4 hours</span>
            </span>
            <span className="rounded-full bg-peach px-2.5 py-1 text-xs font-bold text-cta-hover">
              Price ready
            </span>
          </div>
          <span className="text-[13px] text-muted">House · 3 bedrooms · kitchen, bathrooms</span>
          <StepBar total={4} done={1} color="bg-brand" thin />
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-[22px] font-extrabold">21,000 RWF</span>
            <span className={buttonClass('dark', 'sm', 'pointer-events-none')}>
              Review &amp; pay
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-ink shadow-[0_18px_40px_-24px_rgba(19,41,75,0.55)] sm:-left-8">
        <span className="flex size-10 items-center justify-center rounded-full bg-success-bg text-success">
          <BadgeCheck size={22} />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-bold">Worker confirmed</span>
          <span className="text-[13px] text-muted">ID and references checked</span>
        </span>
      </div>
    </div>
  );
}
