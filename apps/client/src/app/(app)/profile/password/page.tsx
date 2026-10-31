'use client';

import { Alert, Button, Field, Input } from '@trustedhands/ui';
import { useState, type FormEvent } from 'react';
import { FlowScreen, PageHeader } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import { session } from '@/lib/session';
import { isStrongEnoughPassword } from '@/lib/validation';

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isStrongEnoughPassword(password))
      return setError('Use at least 8 characters, with a number.');
    if (password !== confirm) return setError("The new passwords don't match.");
    setError(null);
    setBusy(true);
    try {
      // The API signs out other devices and returns a fresh session for this one
      const auth = await unwrap(
        api.POST('/v1/auth/password/change', {
          body: { currentPassword: current, newPassword: password },
        }),
      );
      session.signIn(auth);
      setDone(true);
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen>
      <PageHeader backHref="/profile" title="Change password" />
      <p className="-mt-2 mb-0 text-[15px] leading-[1.45] text-muted">
        You'll stay signed in here and be signed out on your other devices.
      </p>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-[22px]">
        <div className="flex flex-col gap-3.5">
          <Field label="Current password">
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" hint="At least 8 characters, with a number.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>
        {error && <Alert>{error}</Alert>}
        {done && <Alert tone="success">Your password has been changed.</Alert>}
        <div className="mt-auto">
          <Button type="submit" className="w-full" loading={busy} disabled={!current}>
            Save password
          </Button>
        </div>
      </form>
    </FlowScreen>
  );
}
