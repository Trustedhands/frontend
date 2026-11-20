'use client';

import { Alert, Button, Field, Input } from '@trustedhands/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth-card';
import { api, ApiError, unwrap } from '@/lib/api';
import { session } from '@/lib/session';
import { meKey } from '@/lib/staff';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

const errorMessage = (err: unknown) =>
  err instanceof ApiError && err.status === 429
    ? 'Too many attempts. Wait a minute and try again.'
    : (err as Error).message;

/** Forgot password: email a code, then set a new password with it. */
function ResetPassword() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(useSearchParams().get('email') ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!isEmail(email)) return setError('Enter your work email');
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await unwrap(api.POST('/v1/auth/password/forgot', { body: { email: email.trim() } }));
      if (sent) setNotice('We sent a new code. Use the latest one.');
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the email');
    if (password.length < 8 || !/\d/.test(password))
      return setError('Use at least 8 characters, with a number.');
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const auth = await unwrap(
        api.POST('/v1/auth/password/reset', {
          params: { query: session.query },
          body: { email: email.trim(), code, newPassword: password },
        }),
      );
      queryClient.clear();
      session.signIn(auth);
      // Staff only: a client account's password is reset, but it can't use the console
      await queryClient.fetchQuery({
        queryKey: meKey,
        queryFn: () => unwrap(api.GET('/v1/admin/me')),
      });
      router.replace('/');
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === 403) {
        await session.signOut();
        router.replace('/login?denied=1');
        return;
      }
      setError(errorMessage(err));
    }
  };

  if (!sent) {
    return (
      <AuthCard title="Reset your password" lead="We'll email you a code to choose a new password.">
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <Field label="Work email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={busy}>
            Email me a code
          </Button>
          <Link href="/login" className="text-center text-[13px] font-bold text-cta">
            Back to sign in
          </Link>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Check your email"
      lead={
        <>
          If <strong className="text-ink">{email.trim()}</strong> has an account, we've sent it a
          6-digit code. It expires in 10 minutes.
        </>
      }
    >
      <form onSubmit={reset} className="flex flex-col gap-4">
        <Field label="Code">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
          />
        </Field>
        <Field label="New password" hint="At least 8 characters, with a number.">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        {notice && !error && <Alert tone="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}
        <Button type="submit" loading={busy}>
          Set new password
        </Button>
        <div className="flex justify-between text-[13px]">
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="bg-transparent p-0 font-bold text-cta"
          >
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode('');
              setError(null);
              setNotice(null);
            }}
            className="bg-transparent p-0 font-bold text-muted"
          >
            Use a different email
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
