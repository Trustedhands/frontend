'use client';

import { Alert, Badge, Button, buttonClass, Card, Field, Input, StepBar } from '@trustedhands/ui';
import type { Me } from '@trustedhands/api';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, IdCard, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { OtpInput } from '@/components/otp-input';
import { RequireProfile } from '@/components/require-profile';
import { BackLink, FlowScreen, Heading } from '@/components/screen';
import { COPY } from '@/lib/copy';
import { api, ApiError, unwrap } from '@/lib/api';
import { maskPhone } from '@/lib/format';
import { keys } from '@/lib/queries';
import { normalizeLocalPhone } from '@/lib/validation';

const RESEND_SECONDS = 60;

export default function VerifyPage() {
  return (
    <Suspense>
      <RequireProfile>{(me) => <Verify me={me} />}</RequireProfile>
    </Suspense>
  );
}

/** Sign-up step 3, and "Verification & ID" from Profile (?edit=1). */
function Verify({ me }: { me: Me }) {
  const editing = useSearchParams().get('edit') === '1';
  const next = editing ? '/profile' : '/signup/permissions';

  return (
    <FlowScreen className="gap-5">
      <div className="flex items-center justify-between">
        <BackLink href={editing ? '/profile' : '/signup/about'} />
        {!editing && <span className="text-[13px] font-semibold text-muted">Step 3 of 3</span>}
      </div>
      {!editing && <StepBar total={3} done={3} />}
      <Heading
        title="Verify it's you"
        lead="Workers enter your home, so we verify everyone on both sides."
      />

      <PhoneSection me={me} />
      <EmailSection me={me} />
      <IdentitySection me={me} />

      <div className="mt-auto flex flex-col gap-3">
        <Link href={next} className={buttonClass('primary')}>
          {editing ? 'Done' : 'Finish sign up'}
        </Link>
        {!editing && me.profile?.kycStatus === 'NOT_STARTED' && (
          <Link href={next} className="p-3 text-center text-sm font-bold">
            Upload ID later
          </Link>
        )}
      </div>
    </FlowScreen>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 text-[15px] font-bold">
      {icon}
      {children}
    </span>
  );
}

const verifiedBadge = (
  <Badge tone="success" icon={<CircleCheck size={14} aria-hidden="true" />}>
    Verified
  </Badge>
);

function PhoneSection({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState(me.phone?.replace(/^\+250/, '') ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async () => {
    const local = normalizeLocalPhone(phone);
    if (!local) {
      setError('Enter a Rwandan mobile number, e.g. 78 123 4567');
      return;
    }
    setBusy(true);
    setError(null);
    const e164 = `+250${local}`;
    try {
      await unwrap(api.POST('/v1/auth/phone/send-code', { body: { phone: e164 } }));
      setSentTo(e164);
      setCode('');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      await unwrap(api.POST('/v1/auth/phone/verify', { body: { code: token } }));
      await queryClient.invalidateQueries({ queryKey: keys.me });
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'invalid_code'
          ? "That code didn't work. Check it and try again, or resend a new one."
          : (err as Error).message,
      );
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (me.phoneVerified) {
    return (
      <Card className="flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <SectionTitle icon={<Smartphone size={20} aria-hidden="true" />}>Phone</SectionTitle>
          {me.phone && <span className="text-[13px] text-muted">{maskPhone(me.phone)}</span>}
        </div>
        {verifiedBadge}
      </Card>
    );
  }

  return (
    <Card className="gap-3.5">
      <div className="flex items-center justify-between">
        <SectionTitle icon={<Smartphone size={20} aria-hidden="true" />}>Phone</SectionTitle>
        <Badge tone="warn">{sentTo ? 'Enter code' : 'Not verified'}</Badge>
      </div>
      {sentTo ? (
        <>
          <p className="m-0 text-sm text-muted">We sent a 6-digit code to {maskPhone(sentTo)}</p>
          <OtpInput
            value={code}
            disabled={busy}
            onChange={(value) => {
              setCode(value);
              if (value.length === 6) void verify(value);
            }}
          />
          {resendIn > 0 ? (
            <span className="text-[13px] text-muted">
              Resend code in {Math.floor(resendIn / 60)}:{String(resendIn % 60).padStart(2, '0')}
            </span>
          ) : (
            <button
              type="button"
              onClick={sendCode}
              className="self-start bg-transparent p-0 text-[13px] font-bold text-cta"
            >
              Resend code
            </button>
          )}
        </>
      ) : (
        <>
          <Field label="Mobile number" small>
            <div className="flex gap-2">
              <span className="flex h-12 items-center rounded-xl border border-field bg-white px-3 text-[15px] font-semibold text-ink">
                +250
              </span>
              <Input
                type="tel"
                inputMode="tel"
                className="min-w-0 flex-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="78 123 4567"
              />
            </div>
          </Field>
          <Button variant="dark" size="md" onClick={sendCode} loading={busy}>
            Send me a code
          </Button>
        </>
      )}
      {error && <Alert>{error}</Alert>}
    </Card>
  );
}

function EmailSection({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    setError(null);
    try {
      await unwrap(api.POST('/v1/auth/email/send-code'));
      setNotice('New code sent. Check your inbox.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await unwrap(api.POST('/v1/auth/email/verify', { body: { code: value } }));
      await queryClient.invalidateQueries({ queryKey: keys.me });
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'invalid_code'
          ? "That code didn't work. Check it, or send a new one."
          : (err as Error).message,
      );
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (me.emailVerified) {
    return (
      <Card className="flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <SectionTitle icon={<Mail size={20} aria-hidden="true" />}>Email</SectionTitle>
          <span className="truncate text-[13px] text-muted">{me.email}</span>
        </div>
        {verifiedBadge}
      </Card>
    );
  }

  return (
    <Card className="gap-3.5">
      <div className="flex items-center justify-between">
        <SectionTitle icon={<Mail size={20} aria-hidden="true" />}>Email</SectionTitle>
        <Badge tone="warn">Enter code</Badge>
      </div>
      <p className="m-0 text-sm text-muted">
        We emailed a 6-digit code to <span className="font-semibold text-ink">{me.email}</span>
      </p>
      <OtpInput
        value={code}
        disabled={busy}
        onChange={(value) => {
          setCode(value);
          if (value.length === 6) void verify(value);
        }}
      />
      <button
        type="button"
        onClick={resend}
        className="self-start bg-transparent p-0 text-[13px] font-bold text-cta"
      >
        Send a new code
      </button>
      {notice && !error && <span className="text-[13px] text-muted">{notice}</span>}
      {error && <Alert>{error}</Alert>}
    </Card>
  );
}

const KYC_BADGES = {
  NOT_STARTED: <Badge tone="neutral">Not started</Badge>,
  PENDING: <Badge tone="warn">In review</Badge>,
  VERIFIED: verifiedBadge,
  REJECTED: <Badge tone="danger">Needs another look</Badge>,
} as const;

function IdentitySection({ me }: { me: Me }) {
  const status = me.profile?.kycStatus ?? 'NOT_STARTED';
  return (
    <Card className="gap-3.5">
      <div className="flex items-center justify-between">
        <SectionTitle icon={<IdCard size={20} aria-hidden="true" />}>Identity (KYC)</SectionTitle>
        {KYC_BADGES[status]}
      </div>
      {status === 'VERIFIED' ? (
        <span className="text-[13px] text-muted">Your ID has been checked by our team.</span>
      ) : (
        <span className="text-[13px] leading-[1.4] text-muted">
          You'll be able to upload a passport, national ID or driving licence here soon.{' '}
          {COPY.idReview}
        </span>
      )}
    </Card>
  );
}
