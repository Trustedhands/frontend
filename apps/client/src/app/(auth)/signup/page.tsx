'use client';

import { Alert, Button, cx, Field, Input, StepBar } from '@trustedhands/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { AccountType } from '@trustedhands/api';
import { BrandLockup } from '@/components/brand-mark';
import { FlowScreen, Heading } from '@/components/screen';
import { api, ApiError, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { onboardingStep, useMe } from '@/lib/queries';
import { session } from '@/lib/session';
import { isEmail, isStrongEnoughPassword, normalizeLocalPhone } from '@/lib/validation';

export default function SignupAccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useAuth();
  const me = useMe();

  const [accountType, setAccountType] = useState<AccountType>('INDIVIDUAL');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in: carry on where sign-up left off
  useEffect(() => {
    if (status === 'authenticated' && me.data && !submitting) {
      router.replace(onboardingStep(me.data) ?? '/');
    }
  }, [status, me.data, submitting, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const localPhone = normalizeLocalPhone(phone);
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (accountType === 'COMPANY' && companyName.trim().length < 2)
      next.companyName = 'Enter the company name';
    if (!isEmail(email)) next.email = 'Enter a valid email address';
    if (!localPhone) next.phone = 'Enter a Rwandan mobile number, e.g. 78 123 4567';
    if (!isStrongEnoughPassword(password))
      next.password = 'Use at least 8 characters, with a number';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const auth = await unwrap(
        api.POST('/v1/auth/register', {
          body: {
            email: email.trim(),
            password,
            phone: `+250${localPhone}`,
            fullName: fullName.trim(),
            accountType,
            companyName: accountType === 'COMPANY' ? companyName.trim() : undefined,
          },
        }),
      );
      queryClient.clear();
      session.signIn(auth);
      router.push('/signup/about');
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.code === 'email_taken') {
        setErrors({ email: 'An account with this email already exists. Log in instead.' });
      } else {
        setFormError((err as Error).message);
      }
    }
  };

  return (
    <FlowScreen>
      <div className="flex items-center justify-between">
        <BrandLockup />
        <span className="text-[13px] font-semibold text-muted">Step 1 of 3</span>
      </div>
      <StepBar total={3} done={1} />
      <Heading
        title="Create your account"
        lead="Verified help for home, errands and repairs in Kigali."
      />

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-[22px]">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">I'm signing up as</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                ['INDIVIDUAL', 'Individual', 'For my home'],
                ['COMPANY', 'Company', 'For a business'],
              ] as const
            ).map(([value, title, hint]) => (
              <label
                key={value}
                className={cx(
                  'flex cursor-pointer flex-col gap-1 rounded-[14px] bg-white p-3.5',
                  accountType === value ? 'border-2 border-ink' : 'border border-field',
                )}
              >
                <span className="flex items-center gap-2 text-[15px] font-bold">
                  <input
                    type="radio"
                    name="accountType"
                    checked={accountType === value}
                    onChange={() => setAccountType(value)}
                    className="m-0 size-[18px] accent-ink"
                  />
                  {title}
                </span>
                <span className="text-[13px] text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3.5">
          <Field label="Full name" error={errors.fullName}>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Claire Dubois"
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName) || undefined}
            />
          </Field>
          {accountType === 'COMPANY' && (
            <Field label="Company name" error={errors.companyName}>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
                aria-invalid={Boolean(errors.companyName) || undefined}
              />
            </Field>
          )}
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email) || undefined}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-semibold">
              Phone number
            </label>
            <div className="flex gap-2">
              <span className="flex h-12 items-center rounded-xl border border-field bg-white px-3 text-[15px] font-semibold">
                +250
              </span>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                className="min-w-0 flex-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="78 123 4567"
                autoComplete="tel-national"
                aria-invalid={Boolean(errors.phone) || undefined}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
            </div>
            {errors.phone && (
              <span id="phone-error" role="alert" className="text-[13px] font-medium text-danger">
                {errors.phone}
              </span>
            )}
          </div>
          <Field
            label="Password"
            hint="At least 8 characters, with a number."
            error={errors.password}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password) || undefined}
            />
          </Field>
        </div>

        {formError && <Alert>{formError}</Alert>}

        <div className="mt-auto flex flex-col gap-3.5">
          <Button type="submit" loading={submitting}>
            Continue
          </Button>
          <p className="m-0 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-bold">
              Log in
            </Link>
          </p>
        </div>
      </form>
    </FlowScreen>
  );
}
