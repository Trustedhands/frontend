'use client';

import { Alert, Button, Field, Input, Spinner } from '@trustedhands/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth-card';
import { api, unwrap } from '@/lib/api';
import { STAFF_ROLES } from '@/lib/labels';
import { session } from '@/lib/session';

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInvite />
    </Suspense>
  );
}

function AcceptInvite() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSearchParams().get('token') ?? '';
  const invitation = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => unwrap(api.GET('/v1/team/invitations/{token}', { params: { path: { token } } })),
    enabled: token.length > 0,
    retry: false,
  });
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/\d/.test(password))
      return setError('Use at least 8 characters, with a number.');
    setError(null);
    setBusy(true);
    try {
      const auth = await unwrap(
        api.POST('/v1/team/invitations/accept', {
          body: { token, fullName: fullName.trim(), phone, password },
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

  if (!token || invitation.error) {
    return (
      <AuthCard
        title="Invitation not valid"
        lead="This link is invalid, already used or expired. Ask a super admin for a new invitation."
      >
        <span />
      </AuthCard>
    );
  }
  if (!invitation.data) {
    return (
      <AuthCard title="Join TrustedHands Ops">
        <Spinner />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Join TrustedHands Ops"
      lead={
        <>
          {invitation.data.invitedBy} invited{' '}
          <strong className="text-ink">{invitation.data.email}</strong> as{' '}
          <strong className="text-ink">{STAFF_ROLES[invitation.data.staffRole].label}</strong>.
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Full name">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
            minLength={2}
          />
        </Field>
        <Field label="Mobile number" hint="Rwandan number, e.g. 078 123 4567">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
          />
        </Field>
        <Field label="Password" hint="At least 8 characters, with a number.">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" loading={busy}>
          Create my account
        </Button>
      </form>
    </AuthCard>
  );
}
