'use client';

import { Alert, Button, Field, Input } from '@trustedhands/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { BrandLockup } from '@/components/brand-mark';
import { FlowScreen, Heading } from '@/components/screen';
import { api, ApiError, unwrap } from '@/lib/api';
import { keys, onboardingStep } from '@/lib/queries';
import { session } from '@/lib/session';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

/** Only allow returning to paths inside this app. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = safeNext(useSearchParams().get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = await unwrap(
        api.POST('/v1/auth/login', { body: { email: email.trim(), password } }),
      );
      queryClient.clear();
      session.signIn(auth);
      const me = await queryClient.fetchQuery({
        queryKey: keys.me,
        queryFn: () => unwrap(api.GET('/v1/me')),
      });
      router.replace(onboardingStep(me) ?? next);
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Too many attempts. Wait a minute and try again.'
          : (err as Error).message,
      );
    }
  };

  return (
    <FlowScreen>
      <BrandLockup />
      <Heading title="Welcome back" lead="Log in to manage your requests and payments." />
      <form onSubmit={submit} className="flex flex-1 flex-col gap-[22px]">
        <div className="flex flex-col gap-3.5">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Link
            href={`/reset-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
            className="self-start text-sm font-bold"
          >
            Forgot password?
          </Link>
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="mt-auto flex flex-col gap-3.5">
          <Button type="submit" loading={busy}>
            Log in
          </Button>
          <p className="m-0 text-center text-sm text-muted">
            New to TrustedHands?{' '}
            <Link href="/signup" className="font-bold">
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </FlowScreen>
  );
}
