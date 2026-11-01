'use client';

import {
  Alert,
  Button,
  Chip,
  Field,
  Input,
  MultiChipGroup,
  Select,
  TextArea,
  cx,
} from '@trustedhands/ui';
import { countryOptions, KIGALI_DISTRICTS, KIGALI_SECTORS } from '@trustedhands/ui/kigali';
import type { Gender, Language, WorkerDetail } from '@trustedhands/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CircleCheck, MapPin, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, unwrap } from '@/lib/api';
import { uploadWorkerDocument } from '@/lib/files';
import { LANGUAGE_OPTIONS } from '@/lib/labels';
import { useStaff } from '@/lib/staff';

const PROVINCES = ['Kigali City', 'Northern', 'Southern', 'Eastern', 'Western'];
const BANKS = [
  'Bank of Kigali',
  'BPR Bank',
  'I&M Bank',
  'Equity Bank',
  'Access Bank',
  'Ecobank',
  'NCBA Bank',
  'GT Bank',
  'Cogebanque',
  'Urwego Bank',
  'Zigama CSS',
];
const ACCEPT_IMAGE = 'image/jpeg,image/png';
const ACCEPT_ID = 'image/jpeg,image/png,application/pdf';
const MAX_BYTES = 4 * 1024 * 1024;

type DocKind = 'PHOTO' | 'ID_FRONT' | 'ID_BACK';

interface FormState {
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  nationality: string;
  countryOfResidence: string;
  languages: Language[];
  phone: string;
  email: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  gps: string;
  categories: string[];
  experience: string;
  idType: 'NATIONAL_ID' | 'PASSPORT' | 'DRIVING_LICENCE';
  idNumber: string;
  nextOfKinName: string;
  nextOfKinRelation: string;
  nextOfKinPhone: string;
  nextOfKinAddress: string;
  nextOfKinIdNumber: string;
  payoutMsisdn: string;
  payoutBankName: string;
  payoutBankAccount: string;
}

const fromWorker = (w?: WorkerDetail): FormState => ({
  fullName: w?.fullName ?? '',
  gender: w?.gender ?? 'FEMALE',
  dateOfBirth: w?.dateOfBirth ? w.dateOfBirth.slice(0, 10) : '',
  nationality: w?.nationality ?? 'Rwanda',
  countryOfResidence: w?.countryOfResidence ?? 'Rwanda',
  languages: w?.languages ?? ['RW'],
  phone: w?.phone ?? '',
  email: w?.email ?? '',
  province: w?.province ?? 'Kigali City',
  district: w?.district ?? 'Gasabo',
  sector: w?.sector ?? 'Kimironko',
  cell: w?.cell ?? '',
  village: w?.village ?? '',
  gps: w?.latitude != null && w.longitude != null ? `${w.latitude}, ${w.longitude}` : '',
  categories: w?.categories ?? [],
  experience: w?.experience ?? '',
  idType: w?.idType ?? 'NATIONAL_ID',
  idNumber: w?.idNumber ?? '',
  nextOfKinName: w?.nextOfKinName ?? '',
  nextOfKinRelation: w?.nextOfKinRelation ?? '',
  nextOfKinPhone: w?.nextOfKinPhone ?? '',
  nextOfKinAddress: w?.nextOfKinAddress ?? '',
  nextOfKinIdNumber: w?.nextOfKinIdNumber ?? '',
  payoutMsisdn: w?.payoutMsisdn ?? '',
  payoutBankName: w?.payoutBankName ?? '',
  payoutBankAccount: w?.payoutBankAccount ?? '',
});

/** "-1.9441, 30.1269" → coordinates, or null when blank/invalid. */
function parseGps(text: string): { latitude: number; longitude: number } | null {
  const m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

/** "Add a worker" and "Edit details". */
export function WorkerForm({ worker }: { worker?: WorkerDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useStaff();
  const countries = useMemo(() => countryOptions(), []);
  const services = useQuery({
    queryKey: ['admin', 'service-types'],
    queryFn: () => unwrap(api.GET('/v1/admin/settings/service-types')),
  });
  const [f, setF] = useState<FormState>(() => fromWorker(worker));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));
  const [files, setFiles] = useState<Partial<Record<DocKind, File>>>({});
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Set once the worker exists, so a retry after a failed upload updates it
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<DocKind[]>([]);
  const hasDoc = (kind: DocKind) =>
    Boolean(files[kind]) ||
    uploaded.includes(kind) ||
    Boolean(worker?.documents.some((d) => d.kind === kind));
  const needsBack = f.idType !== 'PASSPORT';
  const gps = parseGps(f.gps);

  // Mirrors the server's checklist; the server re-checks on submit
  const checklist: Array<{ label: string; missing: string | null }> = [
    {
      label: 'Personal details',
      missing: !f.fullName.trim()
        ? 'name'
        : !f.dateOfBirth
          ? 'date of birth'
          : !f.languages.length
            ? 'languages'
            : !hasDoc('PHOTO')
              ? 'photo'
              : null,
    },
    {
      label: 'Contact & address',
      missing: !f.phone.trim()
        ? 'phone'
        : !f.district.trim() || !f.sector.trim()
          ? 'address'
          : null,
    },
    { label: 'Services', missing: f.categories.length ? null : 'at least one' },
    {
      label: 'ID',
      missing: !f.idNumber.trim()
        ? 'number missing'
        : !hasDoc('ID_FRONT')
          ? 'front missing'
          : needsBack && !hasDoc('ID_BACK')
            ? 'back missing'
            : null,
    },
    {
      label: 'Next of kin',
      missing: !f.nextOfKinName.trim() ? 'name' : !f.nextOfKinPhone.trim() ? 'phone' : null,
    },
    {
      label: 'Payout',
      missing:
        f.payoutMsisdn.trim() || (f.payoutBankName && f.payoutBankAccount.trim())
          ? null
          : 'MoMo or bank',
    },
  ];
  const complete = checklist.every((c) => !c.missing);
  const canSubmit = !worker || worker.status === 'DRAFT' || worker.status === 'DECLINED';

  const body = () => {
    const opt = (v: string) => (v.trim() ? v.trim() : worker || createdId ? '' : undefined);
    return {
      fullName: f.fullName.trim(),
      gender: f.gender,
      dateOfBirth: f.dateOfBirth || undefined,
      nationality: opt(f.nationality),
      countryOfResidence: opt(f.countryOfResidence),
      languages: f.languages,
      categories: f.categories,
      phone: f.phone,
      email: opt(f.email),
      province: opt(f.province),
      district: opt(f.district),
      sector: opt(f.sector),
      cell: opt(f.cell),
      village: opt(f.village),
      ...(gps ?? {}),
      experience: opt(f.experience),
      idType: f.idType,
      idNumber: opt(f.idNumber),
      nextOfKinName: opt(f.nextOfKinName),
      nextOfKinRelation: opt(f.nextOfKinRelation),
      nextOfKinPhone: opt(f.nextOfKinPhone),
      nextOfKinAddress: opt(f.nextOfKinAddress),
      nextOfKinIdNumber: opt(f.nextOfKinIdNumber),
      payoutMsisdn: opt(f.payoutMsisdn),
      payoutBankName: opt(f.payoutBankName),
      payoutBankAccount: opt(f.payoutBankAccount),
    };
  };

  const save = async (andSubmit: boolean) => {
    setError(null);
    if (!f.fullName.trim() || !f.phone.trim())
      return setError('Add at least the full name and phone to save.');
    if (f.gps.trim() && !gps) return setError('Location should look like -1.9441, 30.1269');
    setBusy(andSubmit ? 'submit' : 'draft');
    try {
      // The API takes YYYY-MM-DD as a date. Once created, retries update that
      // record (e.g. after an upload failed) instead of creating a duplicate.
      const existingId = worker?.id ?? createdId;
      const saved = existingId
        ? await unwrap(
            api.PATCH('/v1/admin/workers/{id}', {
              params: { path: { id: existingId } },
              body: body() as never,
            }),
          )
        : await unwrap(api.POST('/v1/admin/workers', { body: body() as never }));
      setCreatedId(saved.id);
      for (const kind of ['PHOTO', 'ID_FRONT', 'ID_BACK'] as const) {
        const file = files[kind];
        if (!file) continue;
        await uploadWorkerDocument(saved.id, kind, file);
        // Uploaded: don't send it again on a retry
        setFiles((prev) => ({ ...prev, [kind]: undefined }));
        setUploaded((prev) => [...prev, kind]);
      }
      if (andSubmit)
        await unwrap(
          api.POST('/v1/admin/workers/{id}/submit', { params: { path: { id: saved.id } } }),
        );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'workers'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'worker', saved.id] });
      router.push(`/workers/${saved.id}`);
    } catch (err) {
      setBusy(null);
      setError((err as Error).message);
    }
  };

  const locate = () => {
    if (!('geolocation' in navigator))
      return setError("This browser can't share a location; type it instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        set('gps', `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      () => {
        setLocating(false);
        setError('Location not shared. Type the coordinates instead.');
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const kigali = f.province === 'Kigali City';
  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex min-w-0 flex-[3_1_600px] flex-col gap-[18px]"
      >
        <Section title="1 · Personal details">
          <div className="flex flex-wrap items-center gap-4">
            <PhotoPicker
              file={files.PHOTO}
              existing={hasDoc('PHOTO')}
              onPick={(file) => setFiles((p) => ({ ...p, PHOTO: file }))}
              onError={setError}
            />
            <span className="text-[13px] text-muted">
              Clear face photo. Clients see this before the visit.
            </span>
          </div>
          <Grid>
            <Field label="Full name" small className="gap-1.5 font-semibold text-ink">
              <Input
                value={f.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
            <Field label="Gender" small className="gap-1.5 font-semibold text-ink">
              <Select
                value={f.gender}
                onChange={(e) => set('gender', e.target.value as Gender)}
                className="h-11 rounded-[10px] text-sm"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </Select>
            </Field>
            <Field label="Date of birth" small className="gap-1.5 font-semibold text-ink">
              <Input
                type="date"
                value={f.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
            <Field label="Nationality" small className="gap-1.5 font-semibold text-ink">
              <Select
                value={f.nationality}
                onChange={(e) => set('nationality', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              >
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Country of residence" small className="gap-1.5 font-semibold text-ink">
              <Select
                value={f.countryOfResidence}
                onChange={(e) => set('countryOfResidence', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              >
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </Grid>
          <MultiChipGroup
            legend="Languages spoken"
            legendClassName="text-[13px]"
            options={LANGUAGE_OPTIONS}
            value={f.languages}
            onChange={(v) => set('languages', v)}
          />
        </Section>

        <Section title="2 · Contact & address">
          <Grid>
            <Field label="Phone" small className="gap-1.5 font-semibold text-ink">
              <Input
                type="tel"
                value={f.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+250 79 000 2210"
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
            <Field label="Email (optional)" small className="gap-1.5 font-semibold text-ink">
              <Input
                type="email"
                value={f.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="name@example.com"
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
          </Grid>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3.5">
            <Field label="Province" small className="gap-1.5 font-semibold text-ink">
              <Select
                value={f.province}
                onChange={(e) => set('province', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              >
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="District" small className="gap-1.5 font-semibold text-ink">
              {kigali ? (
                <Select
                  value={f.district}
                  onChange={(e) =>
                    setF((p) => ({
                      ...p,
                      district: e.target.value,
                      sector: KIGALI_SECTORS[e.target.value]?.[0] ?? '',
                    }))
                  }
                  className="h-11 rounded-[10px] text-sm"
                >
                  {withCurrent(KIGALI_DISTRICTS, f.district).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={f.district}
                  onChange={(e) => set('district', e.target.value)}
                  className="h-11 rounded-[10px] text-sm"
                />
              )}
            </Field>
            <Field label="Sector" small className="gap-1.5 font-semibold text-ink">
              {kigali ? (
                <Select
                  value={f.sector}
                  onChange={(e) => set('sector', e.target.value)}
                  className="h-11 rounded-[10px] text-sm"
                >
                  {withCurrent(KIGALI_SECTORS[f.district] ?? [], f.sector).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={f.sector}
                  onChange={(e) => set('sector', e.target.value)}
                  className="h-11 rounded-[10px] text-sm"
                />
              )}
            </Field>
            <Field label="Cell" small className="gap-1.5 font-semibold text-ink">
              <Input
                value={f.cell}
                onChange={(e) => set('cell', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
            <Field label="Village" small className="gap-1.5 font-semibold text-ink">
              <Input
                value={f.village}
                onChange={(e) => set('village', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-2.5">
            <Field
              label="Location (GPS)"
              small
              className="flex-[1_1_260px] gap-1.5 font-semibold text-ink"
            >
              <Input
                value={f.gps}
                onChange={(e) => set('gps', e.target.value)}
                placeholder="-1.9441, 30.1269"
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
            <Button variant="soft" size="sm" onClick={locate} loading={locating}>
              {!locating && <MapPin size={16} aria-hidden="true" />}
              Use my location
            </Button>
          </div>
        </Section>

        <Section title="3 · Services offered">
          <div className="flex flex-wrap gap-2">
            {services.data?.map((s) => {
              const on = f.categories.includes(s.key);
              return (
                <Chip
                  key={s.key}
                  pressed={on}
                  className="min-h-10 text-[13px]"
                  onToggle={() =>
                    set(
                      'categories',
                      on ? f.categories.filter((c) => c !== s.key) : [...f.categories, s.key],
                    )
                  }
                >
                  {s.label}
                </Chip>
              );
            })}
          </div>
          <Field label="Experience & references" small className="gap-1.5 font-semibold text-ink">
            <TextArea
              rows={3}
              value={f.experience}
              onChange={(e) => set('experience', e.target.value)}
              className="rounded-[10px] text-sm"
            />
          </Field>
        </Section>

        <Section title="4 · Identity (KYC)">
          <Grid>
            <Field label="ID type" small className="gap-1.5 font-semibold text-ink">
              <Select
                value={f.idType}
                onChange={(e) => set('idType', e.target.value as FormState['idType'])}
                className="h-11 rounded-[10px] text-sm"
              >
                <option value="NATIONAL_ID">National ID</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVING_LICENCE">Driving licence</option>
              </Select>
            </Field>
            <Field label="ID number" small className="gap-1.5 font-semibold text-ink">
              <Input
                value={f.idNumber}
                onChange={(e) => set('idNumber', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              />
            </Field>
          </Grid>
          <Grid>
            <DocPicker
              label="ID front"
              file={files.ID_FRONT}
              existing={hasDoc('ID_FRONT')}
              onPick={(file) => setFiles((p) => ({ ...p, ID_FRONT: file }))}
              onError={setError}
            />
            {needsBack && (
              <DocPicker
                label="ID back"
                file={files.ID_BACK}
                existing={hasDoc('ID_BACK')}
                onPick={(file) => setFiles((p) => ({ ...p, ID_BACK: file }))}
                onError={setError}
              />
            )}
          </Grid>
        </Section>

        <Section title="5 · Next of kin">
          <Grid>
            <TextInput
              label="Full name"
              value={f.nextOfKinName}
              onChange={(v) => set('nextOfKinName', v)}
            />
            <TextInput
              label="Relationship"
              value={f.nextOfKinRelation}
              onChange={(v) => set('nextOfKinRelation', v)}
              placeholder="e.g. brother"
            />
            <TextInput
              label="Phone"
              value={f.nextOfKinPhone}
              onChange={(v) => set('nextOfKinPhone', v)}
              placeholder="+250"
            />
            <TextInput
              label="Address"
              value={f.nextOfKinAddress}
              onChange={(v) => set('nextOfKinAddress', v)}
              placeholder="District, sector"
            />
            <TextInput
              label="ID number"
              value={f.nextOfKinIdNumber}
              onChange={(v) => set('nextOfKinIdNumber', v)}
              placeholder="National ID"
            />
          </Grid>
        </Section>

        <Section title="6 · Payout details">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5">
            <TextInput
              label="Mobile Money number"
              value={f.payoutMsisdn}
              onChange={(v) => set('payoutMsisdn', v)}
              placeholder="+250 79 000 2210"
            />
            <Field label="Bank (optional)" small className="gap-1.5 font-semibold text-ink">
              <Select
                value={f.payoutBankName}
                onChange={(e) => set('payoutBankName', e.target.value)}
                className="h-11 rounded-[10px] text-sm"
              >
                <option value="">Select bank</option>
                {BANKS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
            </Field>
            <TextInput
              label="Account number"
              value={f.payoutBankAccount}
              onChange={(v) => set('payoutBankAccount', v)}
            />
          </div>
        </Section>
      </form>

      <aside className="sticky top-6 flex min-w-0 flex-[1_1_260px] flex-col gap-3.5 rounded-[18px] border border-line bg-white p-5">
        <h2 className="m-0 text-[15px] font-bold">Checklist</h2>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cx(
                  'size-5 flex-none rounded-full',
                  c.missing ? 'border-[5px] border-brand' : 'bg-success',
                )}
              />
              {c.missing ? `${c.label} — ${c.missing}` : c.label}
            </li>
          ))}
        </ul>
        {error && <Alert>{error}</Alert>}
        {canSubmit && (
          <Button
            size="md"
            disabled={!complete || busy !== null}
            loading={busy === 'submit'}
            onClick={() => void save(true)}
          >
            {worker ? 'Save & send to verification' : 'Create & send to verification'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          loading={busy === 'draft'}
          onClick={() => void save(false)}
        >
          {worker ? 'Save changes' : 'Save draft'}
        </Button>
        {worker?.status === 'VERIFIED' && (
          <span className="text-[13px] text-muted">
            Changing name, date of birth, ID or documents sends them back to verification.
          </span>
        )}
        <span className="text-[13px] text-muted">
          Logged as {worker ? 'edited' : 'created'} by {me.fullName}.
        </span>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-[22px]">
      <h2 className="m-0 font-display text-[19px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3.5">
      {children}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} small className="gap-1.5 font-semibold text-ink">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-[10px] text-sm"
      />
    </Field>
  );
}

function usePicker(accept: string, onPick: (f: File) => void, onError: (m: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!accept.split(',').includes(file.type))
          return onError(`${file.name}: unsupported file type`);
        if (file.size > MAX_BYTES) return onError(`${file.name} is over 4 MB`);
        onPick(file);
      }}
    />
  );
  return { open: () => ref.current?.click(), input };
}

function PhotoPicker({
  file,
  existing,
  onPick,
  onError,
}: {
  file?: File;
  existing: boolean;
  onPick: (f: File) => void;
  onError: (m: string) => void;
}) {
  const picker = usePicker(ACCEPT_IMAGE, onPick, onError);
  // A data URL needs no cleanup, unlike an object URL
  const [loaded, setLoaded] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLoaded({ file, url: reader.result as string });
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  const preview = file && loaded?.file === file ? loaded.url : null;
  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 flex-none items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-brand bg-peach text-cta-hover">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
          <img src={preview} alt="" className="size-full object-cover" />
        ) : existing ? (
          <CircleCheck size={28} aria-label="Photo on file" />
        ) : (
          <Camera size={28} aria-hidden="true" />
        )}
      </div>
      <Button variant="outline" size="sm" onClick={picker.open}>
        {existing || file ? 'Replace photo' : 'Upload photo'}
      </Button>
      {picker.input}
    </div>
  );
}

function DocPicker({
  label,
  file,
  existing,
  onPick,
  onError,
}: {
  label: string;
  file?: File;
  existing: boolean;
  onPick: (f: File) => void;
  onError: (m: string) => void;
}) {
  const picker = usePicker(ACCEPT_ID, onPick, onError);
  if (file || existing) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-success-bg p-3.5 text-sm font-semibold text-success-ink">
        <CircleCheck size={18} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {file ? `${file.name} ready to upload` : `${label} on file`}
        </span>
        <button
          type="button"
          onClick={picker.open}
          className="border-0 bg-transparent p-0 text-sm font-bold text-success-ink underline"
        >
          Replace
        </button>
        {picker.input}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={picker.open}
      className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-field bg-canvas text-sm font-semibold text-ink"
    >
      <Upload size={18} aria-hidden="true" />
      Upload {label}
      {picker.input}
    </button>
  );
}

/** Keeps a saved value selectable even if it isn't in today's list. */
function withCurrent(options: readonly string[], current: string): readonly string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}
