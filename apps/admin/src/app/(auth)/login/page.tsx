'use client';

import { Alert, Button, Field, Input } from '@trustedhands/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth-card';
import { api, ApiError, unwrap } from '@/lib/api';
import { session } from '@/lib/session';
import { meKey } from '@/lib/staff';

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

/** Only allow returning to paths inside this app. */
const safeNext = (next: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.get('denied') ? "That account doesn't have access to the operations console." : null,
  );
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = await unwrap(
        api.POST('/v1/auth/login', {
          params: { query: session.query },
          body: { email: email.trim(), password },
        }),
      );
      queryClient.clear();
      session.signIn(auth);
      // Staff only: client accounts can't use the console
      await queryClient.fetchQuery({
        queryKey: meKey,
        queryFn: () => unwrap(api.GET('/v1/admin/me')),
      });
      router.replace(safeNext(params.get('next')));
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === 403) {
        await session.signOut();
        setError("That account doesn't have access to the operations console.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts. Wait a minute and try again.');
      } else {
        setError((err as Error).message);
      }
    }
  };

  return (
    <AuthCard title="Sign in" lead="For the TrustedHands operations team.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Work email">
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
        {error && <Alert>{error}</Alert>}
        <Button type="submit" loading={busy}>
          Sign in
        </Button>
        <p className="m-0 text-center text-[13px] text-muted">
          Forgot your password? Reset it from the TrustedHands app login, then sign in here.
        </p>
      </form>
    </AuthCard>
  );
}
