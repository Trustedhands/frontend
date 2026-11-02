'use client';

import { Alert, Badge, Button, Field, Input, Select, Spinner, cx } from '@trustedhands/ui';
import { formatShortDate } from '@trustedhands/ui/format';
import type { Settings, StaffRole } from '@trustedhands/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { useState } from 'react';
import { IconButton, Toggle } from '@/components/controls';
import { ErrorNote, PageHeader, Panel, PanelTitle, Table, Td, Th } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { STAFF_ROLES } from '@/lib/labels';
import { useCan, useStaff } from '@/lib/staff';

type Criterion = Settings['matchingPriority'][number];
const CRITERIA: Record<Criterion, string> = {
  AVAILABILITY: 'Available for the schedule',
  LANGUAGE: "Speaks client's language",
  GENDER: 'Matches gender preference',
  RATING: 'Highest rating',
  DISTANCE: 'Closest to the address',
};
const ROLES = Object.keys(STAFF_ROLES) as StaffRole[];
const settingsKey = ['admin', 'settings'] as const;
const teamKey = ['admin', 'team'] as const;

const toInt = (s: string) => (s.trim() ? Number(s.replace(/[\s,]/g, '')) : NaN);
const inRange = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;

export default function SettingsPage() {
  const can = useCan();
  return (
    <>
      <PageHeader
        title="Settings & team"
        subtitle="Changes apply to new requests only. Every change is logged with who made it."
      />
      {can('settings.manage') && <PlatformSettings />}
      {can('team.manage') && <TeamSection />}
    </>
  );
}

function PlatformSettings() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: () => unwrap(api.GET('/v1/admin/settings')),
  });
  if (settings.error) return <ErrorNote error={settings.error} />;
  if (!settings.data) return <Spinner />;
  return (
    <SettingsForm
      settings={settings.data}
      onSaved={(next) => queryClient.setQueryData(settingsKey, next)}
    />
  );
}

function SettingsForm({
  settings: s,
  onSaved,
}: {
  settings: Settings;
  onSaved: (s: Settings) => void;
}) {
  const [serviceFee, setServiceFee] = useState(String(s.serviceFeeRwf));
  const [matchFee, setMatchFee] = useState(String(s.matchFeeRwf));
  const [releaseHours, setReleaseHours] = useState(String(s.releaseAfterHours));
  const [priority, setPriority] = useState<Criterion[]>(s.matchingPriority);
  const [momo, setMomo] = useState(s.momoEnabled);
  const [wallet, setWallet] = useState(s.clientWalletEnabled);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH('/v1/admin/settings', {
          body: {
            serviceFeeRwf: toInt(serviceFee),
            matchFeeRwf: toInt(matchFee),
            releaseAfterHours: toInt(releaseHours),
            matchingPriority: priority,
            momoEnabled: momo,
            clientWalletEnabled: wallet,
          },
        }),
      ),
    onSuccess: (next) => {
      onSaved(next);
      setSaved(true);
    },
  });
  const errors = {
    serviceFee: inRange(toInt(serviceFee), 1_000_000) ? null : 'Whole RWF, up to 1,000,000',
    matchFee: inRange(toInt(matchFee), 10_000_000) ? null : 'Whole RWF, up to 10,000,000',
    releaseHours: inRange(toInt(releaseHours), 720) ? null : 'Whole hours, 0 to 720',
  };
  const valid = !errors.serviceFee && !errors.matchFee && !errors.releaseHours;
  const dirty =
    toInt(serviceFee) !== s.serviceFeeRwf ||
    toInt(matchFee) !== s.matchFeeRwf ||
    toInt(releaseHours) !== s.releaseAfterHours ||
    priority.join() !== s.matchingPriority.join() ||
    momo !== s.momoEnabled ||
    wallet !== s.clientWalletEnabled;
  const move = (i: number, by: -1 | 1) => {
    setSaved(false);
    setPriority((p) => {
      const next = [...p];
      [next[i], next[i + by]] = [next[i + by]!, next[i]!];
      return next;
    });
  };
  const edit = (fn: (v: string) => void) => (e: { target: { value: string } }) => {
    setSaved(false);
    fn(e.target.value);
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-[18px]">
        <Panel>
          <PanelTitle>Platform fees</PanelTitle>
          <FeeField
            label="Service fee per visit (short tasks & one-time)"
            hint="RWF, added to the client price"
            value={serviceFee}
            onChange={edit(setServiceFee)}
            error={errors.serviceFee}
          />
          <FeeField
            label="Match fee (long-term placement, e.g. house help, driver)"
            hint="RWF, one-off"
            value={matchFee}
            onChange={edit(setMatchFee)}
            error={errors.matchFee}
          />
          <FeeField
            label="Release worker share"
            hint={`When the client confirms, or ${releaseHours || '…'} h after the visit`}
            value={releaseHours}
            onChange={edit(setReleaseHours)}
            error={errors.releaseHours}
            suffix="hours"
          />
        </Panel>
        <Panel>
          <PanelTitle>Matching priority</PanelTitle>
          <p className="m-0 text-[13px] text-muted">
            How suggested workers are sorted. Admins always make the final pick.
          </p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {priority.map((c, i) => (
              <li
                key={c}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm font-semibold"
              >
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="flex-1">{CRITERIA[c]}</span>
                <IconButton
                  label={`Move ${CRITERIA[c]} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={16} />
                </IconButton>
                <IconButton
                  label={`Move ${CRITERIA[c]} down`}
                  disabled={i === priority.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={16} />
                </IconButton>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel>
          <PanelTitle>Payment methods</PanelTitle>
          <Toggle
            label="Mobile Money"
            hint="MTN MoMo · turning it off pauses new payments"
            checked={momo}
            onChange={(v) => {
              setSaved(false);
              setMomo(v);
            }}
          />
          <Toggle
            label="Client wallet"
            hint="clients top up with MoMo and pay bookings from their balance"
            checked={wallet}
            onChange={(v) => {
              setSaved(false);
              setWallet(v);
            }}
          />
          <Toggle label="Voucher codes" hint="Later phase" checked={s.vouchersEnabled} disabled />
        </Panel>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="md"
          disabled={!dirty || !valid}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          Save changes
        </Button>
        {save.error && <ErrorNote error={save.error} />}
        {saved && !dirty && <span className="text-sm font-semibold text-success-ink">Saved.</span>}
        <span className="text-[13px] text-muted">Last changed {formatShortDate(s.updatedAt)}</span>
      </div>
    </>
  );
}

function FeeField({
  label,
  hint,
  value,
  onChange,
  error,
  suffix = 'RWF',
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  error: string | null;
  suffix?: string;
}) {
  return (
    <Field label={label} small error={error} hint={hint} className="gap-1.5 font-semibold text-ink">
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          className="h-11 max-w-40 rounded-[10px] text-sm"
        />
        <span className="text-sm text-muted">{suffix}</span>
      </div>
    </Field>
  );
}

function lastActive(at: string | null): string {
  if (!at) return 'Never';
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 864e5);
  if (Date.now() - new Date(at).getTime() < 10 * 60_000) return 'Now';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return formatShortDate(at);
}

function TeamSection() {
  const me = useStaff();
  const queryClient = useQueryClient();
  const team = useQuery({ queryKey: teamKey, queryFn: () => unwrap(api.GET('/v1/admin/team')) });
  const [inviting, setInviting] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: teamKey });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; staffRole?: StaffRole; disabled?: boolean }) =>
      unwrap(api.PATCH('/v1/admin/team/{id}', { params: { path: { id } }, body })),
    onSuccess: refresh,
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE('/v1/admin/team/invitations/{id}', { params: { path: { id } } })),
    onSuccess: refresh,
  });

  return (
    <Panel className="p-0 pt-5">
      <div className="px-5">
        <PanelTitle
          action={
            !inviting && (
              <Button size="sm" onClick={() => setInviting(true)}>
                <Plus size={16} aria-hidden="true" />
                Invite team member
              </Button>
            )
          }
        >
          Team & roles
        </PanelTitle>
      </div>
      {inviting && <InviteForm onDone={() => setInviting(false)} />}
      {(team.error ?? update.error ?? revoke.error) && (
        <div className="px-5">
          <ErrorNote error={team.error ?? update.error ?? revoke.error} />
        </div>
      )}
      {!team.data ? (
        <Spinner />
      ) : (
        <Table minWidth={820}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Can</Th>
              <Th>Last active</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {team.data.members.map((m) => {
              const self = m.id === me.id;
              return (
                <tr key={m.id} className={cx(m.disabled && 'opacity-60')}>
                  <Td>
                    <div className="font-bold">
                      {m.fullName}
                      {self && <span className="font-normal text-muted"> (you)</span>}
                    </div>
                    <div className="text-[13px] text-muted">{m.email}</div>
                  </Td>
                  <Td>
                    <Select
                      value={m.staffRole}
                      disabled={self || m.disabled || update.isPending}
                      onChange={(e) =>
                        update.mutate({ id: m.id, staffRole: e.target.value as StaffRole })
                      }
                      aria-label={`Role for ${m.fullName}`}
                      className="h-10 min-w-44 rounded-lg text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {STAFF_ROLES[r].label}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td className="text-muted">{STAFF_ROLES[m.staffRole].can}</Td>
                  <Td>
                    {m.disabled ? (
                      <Badge tone="neutral">Access removed</Badge>
                    ) : (
                      lastActive(m.lastActiveAt)
                    )}
                  </Td>
                  <Td className="text-right">
                    {!self && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: m.id, disabled: !m.disabled })}
                      >
                        {m.disabled ? 'Restore access' : 'Remove access'}
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
            {team.data.pendingInvitations.map((i) => (
              <tr key={i.id}>
                <Td>
                  <div className="font-semibold">{i.email}</div>
                  <div className="text-[13px] text-muted">
                    Invited by {i.invitedBy} · expires {formatShortDate(i.expiresAt)}
                  </div>
                </Td>
                <Td>{STAFF_ROLES[i.staffRole].label}</Td>
                <Td className="text-muted">{STAFF_ROLES[i.staffRole].can}</Td>
                <Td>
                  <Badge tone="warn">Invited</Badge>
                </Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(i.id)}
                  >
                    Revoke
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('CUSTOMER_SERVICE');
  const invite = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST('/v1/admin/team/invitations', { body: { email: email.trim(), staffRole: role } }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamKey });
      onDone();
    },
  });
  return (
    <form
      className="mx-5 flex flex-wrap items-end gap-3 rounded-xl bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        invite.mutate();
      }}
    >
      <Field label="Email" small className="flex-[2_1_240px] gap-1.5 font-semibold text-ink">
        <Input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-[10px] text-sm"
        />
      </Field>
      <Field label="Role" small className="flex-[1_1_200px] gap-1.5 font-semibold text-ink">
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          className="h-11 rounded-[10px] text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {STAFF_ROLES[r].label}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        type="submit"
        size="sm"
        className="h-11"
        disabled={!email.trim()}
        loading={invite.isPending}
      >
        Send invite
      </Button>
      <Button size="sm" variant="ghost" className="h-11" onClick={onDone}>
        Cancel
      </Button>
      <span className="w-full text-[13px] text-muted">
        They get an email link to set their password. {STAFF_ROLES[role].can}.
      </span>
      {invite.error && (
        <div className="w-full">
          <Alert>{(invite.error as Error).message}</Alert>
        </div>
      )}
    </form>
  );
}
