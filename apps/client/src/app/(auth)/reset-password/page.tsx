'use client';

import { Alert, Button, Field, Input } from '@trustedhands/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { OtpInput } from '@/components/otp-input';
import { BackLink, FlowScreen, Heading } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import { session } from '@/lib/session';
import { isEmail, isStrongEnoughPassword } from '@/lib/validation';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}

/** Forgot password: email a code, then set a new password with it. */
function ResetPassword() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(useSearchParams().get('email') ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!isEmail(email)) return setError('Enter the email you signed up with');
    setError(null);
    setBusy(true);
    try {
      await unwrap(api.POST('/v1/auth/password/forgot', { body: { email: email.trim() } }));
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError('Enter the 6-digit code from the email');
    if (!isStrongEnoughPassword(password))
      return setError('Use at least 8 characters, with a number');
    setError(null);
    setBusy(true);
    try {
      const auth = await unwrap(
        api.POST('/v1/auth/password/reset', {
          body: { email: email.trim(), code, newPassword: password },
        }),
      );
      queryClient.clear();
      session.signIn(auth);
      router.replace('/');
    } catch (err) {
      setBusy(false);
      setError((err as Error).message);
    }
  };

  return (
    <FlowScreen>
      <div>
        <BackLink href="/login" />
      </div>
      {!sent ? (
        <>
          <Heading
            title="Reset your password"
            lead="We'll email you a code to choose a new password."
          />
          <form onSubmit={sendCode} className="flex flex-1 flex-col gap-[22px]">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            {error && <Alert>{error}</Alert>}
            <div className="mt-auto">
              <Button type="submit" className="w-full" loading={busy}>
                Email me a code
              </Button>
            </div>
          </form>
        </>
      ) : (
        <>
          <Heading
            title="Check your email"
            lead={
              <>
                If <strong className="text-ink">{email.trim()}</strong> has an account, we've sent
                it a 6-digit code.
              </>
            }
          />
          <form onSubmit={reset} className="flex flex-1 flex-col gap-[22px]">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Code</span>
              <OtpInput value={code} onChange={setCode} disabled={busy} />
            </div>
            <Field label="New password" hint="At least 8 characters, with a number.">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            {error && <Alert>{error}</Alert>}
            <div className="mt-auto flex flex-col gap-2">
              <Button type="submit" loading={busy}>
                Set new password
              </Button>
              <button
                type="button"
                onClick={() => void sendCode()}
                className="bg-transparent p-3 text-sm font-bold text-cta"
              >
                Send a new code
              </button>
            </div>
          </form>
        </>
      )}
    </FlowScreen>
  );
}
