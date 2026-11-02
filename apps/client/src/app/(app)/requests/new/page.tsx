'use client';

import {
  Alert,
  Button,
  ChipGroup,
  cx,
  Field,
  Input,
  MultiChipGroup,
  Select,
  TextArea,
} from '@trustedhands/ui';
import type { GenderPreference, HomeArea, HomeType, Language } from '@trustedhands/api';
import { HOME_AREA_LABELS, HOME_AREAS, HOME_TYPE_LABELS } from '@trustedhands/api/household';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AddressFields, emptyAddress, type AddressValue } from '@/components/address-fields';
import { FlowScreen, PageHeader } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import { COPY } from '@/lib/copy';
import { kigaliDateIn, kigaliDateTime, kigaliToday } from '@/lib/format';
import { GENDER_PREFERENCE_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/labels';
import { keys, useMe, useServiceTypes } from '@/lib/queries';

/** 6:00 to 19:30 in half hours */
const START_TIMES = Array.from(
  { length: 28 },
  (_, i) => `${6 + Math.floor(i / 2)}:${i % 2 ? '30' : '00'}`,
);
/** 1 to 8 hours in half hours */
const DURATIONS = Array.from({ length: 15 }, (_, i) => 1 + i / 2);
const BEDROOMS = Array.from({ length: 11 }, (_, i) => i);
const BATHROOMS = Array.from({ length: 10 }, (_, i) => i + 1);
const HOME_TYPE_OPTIONS = (Object.keys(HOME_TYPE_LABELS) as HomeType[]).map((value) => ({
  value,
  label: HOME_TYPE_LABELS[value],
}));
const AREA_OPTIONS = HOME_AREAS.map((value) => ({ value, label: HOME_AREA_LABELS[value] }));

export default function NewRequestPage() {
  return (
    <Suspense>
      <NewRequestForm />
    </Suspense>
  );
}

function NewRequestForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe().data!;
  const preset = useSearchParams().get('category');
  const servicesQuery = useServiceTypes();
  const services = servicesQuery.data ?? [];
  const home = me.homeAddress;

  const [picked, setCategory] = useState<string | null>(null);
  // A shortcut from Home preselects the service, if it's still offered
  const category = picked ?? (services.some((st) => st.key === preset) ? preset : null);
  const service = services.find((st) => st.key === category);
  const [kind, setKind] = useState<'VISIT' | 'PLACEMENT'>('VISIT');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('9:00');
  const [duration, setDuration] = useState(4);
  // Long-term placements
  const [arrangement, setArrangement] = useState<'LIVE_OUT' | 'LIVE_IN'>('LIVE_OUT');
  const [daysPerWeek, setDaysPerWeek] = useState(6);
  const [salary, setSalary] = useState('');
  const isPlacement =
    service?.feeType === 'MATCH' || (service?.feeType === 'EITHER' && kind === 'PLACEMENT');
  // The home being serviced, for services that ask
  const [homeType, setHomeType] = useState<HomeType | null>(null);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [areas, setAreas] = useState<HomeArea[]>([]);
  const asksHomeSize = Boolean(service?.asksHomeSize);
  const asksAreas = Boolean(service?.asksAreas);
  const [gender, setGender] = useState<GenderPreference>('ANY');
  const [languages, setLanguages] = useState<Language[]>(me.profile!.preferredLanguages);
  const [useHome, setUseHome] = useState(Boolean(home));
  const [otherAddress, setOtherAddress] = useState<AddressValue>(emptyAddress());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const address =
      useHome && home
        ? {
            district: home.district,
            sector: home.sector,
            street: home.street,
            latitude: home.latitude ?? undefined,
            longitude: home.longitude ?? undefined,
          }
        : { ...otherAddress, street: otherAddress.street.trim() };
    // Placements have a start date; 8:00 keeps it on the right day in Kigali
    const scheduledAt = date ? kigaliDateTime(date, isPlacement ? '8:00' : startTime) : null;
    const salaryRwf = salary.trim() ? Number(salary.replace(/[\s,]/g, '')) : undefined;

    const next: Record<string, string> = {};
    if (!category) next.category = 'Choose a type of service';
    if (!description.trim()) next.description = 'Tell us what needs doing';
    if (!scheduledAt) next.date = 'Choose a date';
    else if (new Date(scheduledAt) <= new Date())
      next.date = isPlacement ? 'Choose a start date in the future' : 'Choose a time in the future';
    else if (new Date(scheduledAt).getTime() > Date.now() + 365 * 864e5)
      next.date = 'Choose a date within the next year';
    if (isPlacement && salaryRwf !== undefined && (!Number.isInteger(salaryRwf) || salaryRwf <= 0))
      next.salary = 'Enter a monthly amount in RWF, or leave it blank';
    if (asksHomeSize && !homeType) next.homeType = 'Choose the type of home';
    if (asksAreas && !areas.length) next.areas = 'Choose at least one part of the home';
    if (address.street.length < 2) next.street = 'Add a street, house number or landmark';
    setErrors(next);
    if (Object.keys(next).length) {
      // The first problem may be far above the button on a phone
      requestAnimationFrame(() =>
        document
          .querySelector('[role="alert"], [aria-invalid="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }

    setSending(true);
    setFormError(null);
    try {
      const created = await unwrap(
        api.POST('/v1/service-requests', {
          body: {
            category: category!,
            description: description.trim(),
            scheduledAt: scheduledAt!,
            ...(isPlacement
              ? { placement: { arrangement, daysPerWeek, salaryRwf } }
              : { durationHours: duration }),
            ...(asksHomeSize || asksAreas
              ? {
                  household: {
                    ...(asksHomeSize ? { homeType: homeType!, bedrooms, bathrooms } : {}),
                    ...(asksAreas ? { areas } : {}),
                  },
                }
              : {}),
            preferredGender: gender,
            preferredLanguages: languages,
            address,
            // Only "either" services let the client choose
            kind: service?.feeType === 'EITHER' ? kind : undefined,
          },
        }),
      );
      queryClient.setQueryData(keys.request(created.id), created);
      await queryClient.invalidateQueries({ queryKey: ['requests'] });
      router.replace(`/requests/${created.id}`);
    } catch (err) {
      setSending(false);
      setFormError((err as Error).message);
    }
  };

  return (
    <FlowScreen wide>
      <PageHeader backHref="/" title="New request" />
      <p className="-mt-2 mb-0 text-[15px] leading-[1.45] text-muted">
        Tell us what you need. We'll find a verified worker and send you a price to confirm —
        nothing to pay yet.
      </p>

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-[22px]">
        <div className="flex flex-col gap-1.5">
          <ChipGroup
            legend="Type of service"
            legendClassName="mb-2.5 font-bold"
            options={services.map((st) => ({ value: st.key, label: st.label }))}
            value={category}
            onChange={setCategory}
          />
          {service?.feeType === 'EITHER' && (
            <ChipGroup
              legend="How long do you need them?"
              legendClassName="mt-3 mb-2 text-[13px] text-muted"
              options={[
                { value: 'VISIT' as const, label: 'One-time' },
                { value: 'PLACEMENT' as const, label: 'Long-term' },
              ]}
              value={kind}
              onChange={setKind}
            />
          )}
          {(service?.feeType === 'MATCH' ||
            (service?.feeType === 'EITHER' && kind === 'PLACEMENT')) && (
            <p className="m-0 mt-2 text-[13px] leading-[1.45] text-muted">
              Long-term: we match you with a verified worker for a one-off match fee. Their pay is
              agreed between you.
            </p>
          )}
          {errors.category && !category && (
            <span role="alert" className="text-[13px] font-medium text-danger">
              {errors.category}
            </span>
          )}
        </div>

        <Field
          label={<span className="font-bold">Describe the job</span>}
          error={errors.description}
          className="gap-2"
        >
          <TextArea
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 3-bedroom house, full clean incl. kitchen and 2 bathrooms. Supplies are at home."
            aria-invalid={Boolean(errors.description) || undefined}
          />
        </Field>

        {(asksHomeSize || asksAreas) && (
          <section className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-4">
            <span className="text-sm font-bold">Your home</span>
            {asksHomeSize && (
              <>
                <div className="flex flex-col gap-1.5">
                  <ChipGroup
                    legend="Type of home"
                    legendClassName="mb-1.5 text-[13px] text-muted"
                    options={HOME_TYPE_OPTIONS}
                    value={homeType}
                    onChange={setHomeType}
                  />
                  {errors.homeType && !homeType && (
                    <span role="alert" className="text-[13px] font-medium text-danger">
                      {errors.homeType}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Bedrooms" small className="gap-1.5 font-semibold">
                    <Select
                      className="h-[46px]"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value))}
                    >
                      {BEDROOMS.map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? 'Studio' : n === 10 ? '10 or more' : n}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Bathrooms" small className="gap-1.5 font-semibold">
                    <Select
                      className="h-[46px]"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(Number(e.target.value))}
                    >
                      {BATHROOMS.map((n) => (
                        <option key={n} value={n}>
                          {n === 10 ? '10 or more' : n}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </>
            )}
            {asksAreas && (
              <div className="flex flex-col gap-1.5">
                <MultiChipGroup
                  legend="Which parts of the home?"
                  legendClassName="mb-1.5 text-[13px] text-muted"
                  options={AREA_OPTIONS}
                  value={areas}
                  onChange={setAreas}
                />
                {errors.areas && !areas.length && (
                  <span role="alert" className="text-[13px] font-medium text-danger">
                    {errors.areas}
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-4">
          <span className="text-sm font-bold">{isPlacement ? 'Start date' : 'When'}</span>
          <Field
            label={isPlacement ? 'They start on' : 'Date'}
            small
            error={errors.date}
            className="gap-1.5 font-semibold"
          >
            <Input
              type="date"
              className="h-[46px]"
              min={kigaliToday()}
              // Requests can be booked up to a year ahead
              max={kigaliDateIn(364)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={Boolean(errors.date) || undefined}
            />
          </Field>
          {!isPlacement && (
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Start time" small className="gap-1.5 font-semibold">
                <Select
                  className="h-[46px]"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                >
                  {START_TIMES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Duration" small className="gap-1.5 font-semibold">
                <Select
                  className="h-[46px]"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'hour' : 'hours'}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </section>

        {isPlacement && (
          <section className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-4">
            <span className="text-sm font-bold">Working arrangement</span>
            <ChipGroup
              legend="Where will they live?"
              legendClassName="mb-1.5 text-[13px] text-muted"
              options={[
                { value: 'LIVE_OUT' as const, label: 'Live-out' },
                { value: 'LIVE_IN' as const, label: 'Live-in' },
              ]}
              value={arrangement}
              onChange={setArrangement}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Days a week" small className="gap-1.5 font-semibold">
                <Select
                  className="h-[46px]"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? 'day' : 'days'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Monthly salary (optional)"
                small
                error={errors.salary}
                className="gap-1.5 font-semibold"
              >
                <Input
                  className="h-[46px]"
                  inputMode="numeric"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. 80,000"
                  aria-invalid={Boolean(errors.salary) || undefined}
                />
              </Field>
            </div>
            <span className="text-[13px] leading-[1.4] text-muted">
              You agree the salary with the worker and pay them directly. It helps us suggest the
              right people.
            </span>
          </section>
        )}

        <section className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-white p-4">
          <span className="text-sm font-bold">Worker preferences</span>
          <ChipGroup
            legend="Gender"
            legendClassName="mb-1.5 text-[13px] text-muted"
            options={GENDER_PREFERENCE_OPTIONS}
            value={gender}
            onChange={setGender}
          />
          <MultiChipGroup
            legend="Speaks (from your profile)"
            legendClassName="mb-1.5 text-[13px] text-muted"
            options={LANGUAGE_OPTIONS}
            value={languages}
            onChange={setLanguages}
          />
        </section>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2.5 text-sm font-bold">Service address</legend>
          {home && (
            <AddressOption checked={useHome} onSelect={() => setUseHome(true)}>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">My home</span>
                <span className="text-[13px] text-muted">
                  {home.street} · {home.sector}, {home.district}
                </span>
              </span>
            </AddressOption>
          )}
          <AddressOption checked={!useHome} onSelect={() => setUseHome(false)}>
            <span className="text-[15px] font-bold">A different address</span>
          </AddressOption>
          {!useHome && (
            <div className="rounded-[14px] border border-line bg-white p-4">
              <AddressFields
                value={otherAddress}
                onChange={setOtherAddress}
                streetError={errors.street}
              />
            </div>
          )}
        </fieldset>

        {formError && <Alert>{formError}</Alert>}

        <div className="mt-auto flex flex-col gap-2.5">
          <Button type="submit" loading={sending || servicesQuery.isPending}>
            Send request
          </Button>
          <span className="text-center text-[13px] text-muted">{COPY.priceResponse}</span>
        </div>
      </form>
    </FlowScreen>
  );
}

function AddressOption({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-[14px] bg-white px-4 py-3.5',
        checked ? 'border-2 border-ink' : 'border border-field',
      )}
    >
      <input
        type="radio"
        name="address"
        checked={checked}
        onChange={onSelect}
        className="m-0 mt-0.5 size-[18px] accent-ink"
      />
      {children}
    </label>
  );
}
