'use client';

import { Alert, Button, ChipGroup, Field, Input, Select, StepBar } from '@trustedhands/ui';
import type { Gender, Me } from '@trustedhands/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { AddressFields, emptyAddress, type AddressValue } from '@/components/address-fields';
import { RequireProfile } from '@/components/require-profile';
import { BackLink, FlowScreen, Heading } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import { countryOptions } from '@/lib/kigali';
import { GENDER_OPTIONS } from '@/lib/labels';
import { keys } from '@/lib/queries';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function AboutPage() {
  return (
    <Suspense>
      <RequireProfile>{(me) => <AboutForm me={me} />}</RequireProfile>
    </Suspense>
  );
}

/** Sign-up step 2, and "Personal details & address" from Profile (?edit=1). */
function AboutForm({ me }: { me: Me }) {
  const router = useRouter();
  const editing = useSearchParams().get('edit') === '1';
  const queryClient = useQueryClient();
  const countries = useMemo(() => countryOptions(), []);
  const profile = me.profile!;

  const [fullName, setFullName] = useState(profile.fullName);
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [birthDay, setBirthDay] = useState(profile.birthDay?.toString() ?? '');
  const [birthMonth, setBirthMonth] = useState(profile.birthMonth?.toString() ?? '');
  const [nationality, setNationality] = useState(profile.nationality ?? '');
  const [residence, setResidence] = useState(profile.countryOfResidence ?? 'Rwanda');
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [address, setAddress] = useState<AddressValue>(
    me.homeAddress
      ? {
          district: me.homeAddress.district,
          sector: me.homeAddress.sector,
          street: me.homeAddress.street,
          latitude: me.homeAddress.latitude ?? undefined,
          longitude: me.homeAddress.longitude ?? undefined,
        }
      : emptyAddress(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (address.street.trim().length < 2) next.street = 'Add a street, house number or landmark';
    if (Boolean(birthDay) !== Boolean(birthMonth))
      next.birthday = 'Choose both day and month, or neither';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setFormError(null);
    try {
      await unwrap(
        api.PATCH('/v1/me/profile', {
          body: {
            fullName: fullName.trim(),
            gender: gender ?? undefined,
            birthDay: birthDay ? Number(birthDay) : undefined,
            birthMonth: birthMonth ? Number(birthMonth) : undefined,
            nationality: nationality || undefined,
            countryOfResidence: residence || undefined,
            occupation: occupation.trim() || undefined,
          },
        }),
      );
      const saved = await unwrap(
        api.PUT('/v1/me/home-address', { body: { ...address, street: address.street.trim() } }),
      );
      queryClient.setQueryData(keys.me, saved);
      router.push(editing ? '/profile' : '/signup/verify');
    } catch (err) {
      setSaving(false);
      setFormError((err as Error).message);
    }
  };

  return (
    <FlowScreen>
      <div className="flex items-center justify-between">
        <BackLink href={editing ? '/profile' : '/signup'} />
        {!editing && <span className="text-[13px] font-semibold text-muted">Step 2 of 3</span>}
      </div>
      {!editing && <StepBar total={3} done={2} />}
      <Heading
        title={editing ? 'Personal details' : 'About you'}
        lead="This helps us send the right worker to the right place."
      />

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-[22px]">
        {editing && (
          <Field label="Full name" error={errors.fullName}>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </Field>
        )}

        <ChipGroup legend="Gender" options={GENDER_OPTIONS} value={gender} onChange={setGender} />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Birthday</span>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Day" small>
              <Select value={birthDay} onChange={(e) => setBirthDay(e.target.value)}>
                <option value="">—</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Month" small>
              <Select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
                <option value="">—</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <span
            className={
              errors.birthday ? 'text-[13px] font-medium text-danger' : 'text-[13px] text-muted'
            }
          >
            {errors.birthday ?? "We don't ask for your birth year."}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Nationality">
            <Select value={nationality} onChange={(e) => setNationality(e.target.value)}>
              <option value="">Choose…</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Country of residence">
            <Select value={residence} onChange={(e) => setResidence(e.target.value)}>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Occupation">
          <Input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="e.g. Programme manager"
            autoComplete="organization-title"
          />
        </Field>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4">
          <span className="text-sm font-bold">Home address</span>
          <AddressFields value={address} onChange={setAddress} streetError={errors.street} />
        </div>

        {formError && <Alert>{formError}</Alert>}

        <div className="mt-auto">
          <Button type="submit" className="w-full" loading={saving}>
            {editing ? 'Save' : 'Continue'}
          </Button>
        </div>
      </form>
    </FlowScreen>
  );
}
