'use client';

import { Button, Input, Select, Spinner } from '@trustedhands/ui';
import type { AdminServiceType } from '@trustedhands/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { IconButton } from '@/components/controls';
import { Empty, ErrorNote, PageHeader, Panel, Table, Td, Th } from '@/components/page';
import { api, unwrap } from '@/lib/api';
import { useCan } from '@/lib/staff';

const FEE_TYPES: Record<AdminServiceType['feeType'], string> = {
  SERVICE: 'Service fee',
  MATCH: 'Match fee',
  EITHER: 'Either',
};
const serviceTypesKey = ['admin', 'service-types'] as const;

export default function ServicesPage() {
  const can = useCan();
  const queryClient = useQueryClient();
  const types = useQuery({
    queryKey: serviceTypesKey,
    queryFn: () => unwrap(api.GET('/v1/admin/settings/service-types')),
  });
  const [adding, setAdding] = useState(false);
  const manage = can('settings.manage');

  // Renumbers the list in steps of 10 and saves only what changed
  const reorder = useMutation({
    mutationFn: async ({ from, to }: { from: number; to: number }) => {
      const list = [...types.data!];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved!);
      await Promise.all(
        list.flatMap((t, i) =>
          t.sortOrder === (i + 1) * 10
            ? []
            : [
                unwrap(
                  api.PATCH('/v1/admin/settings/service-types/{key}', {
                    params: { path: { key: t.key } },
                    body: { sortOrder: (i + 1) * 10 },
                  }),
                ),
              ],
        ),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: serviceTypesKey }),
  });

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="What clients can book, how each one is charged, and what the request form asks about their home. Changes apply to new requests only."
        actions={
          manage &&
          !adding && (
            <Button size="md" onClick={() => setAdding(true)}>
              <Plus size={18} aria-hidden="true" />
              Add service
            </Button>
          )
        }
      />
      {types.error && <ErrorNote error={types.error} />}
      {reorder.error && <ErrorNote error={reorder.error} />}
      {!types.data ? (
        <Spinner />
      ) : types.data.length === 0 && !adding ? (
        <Empty>No services yet. Add the first one so clients can book it.</Empty>
      ) : (
        <Panel className="p-0">
          <Table minWidth={1120}>
            <thead>
              <tr>
                <Th className="w-[84px]">Order</Th>
                <Th>Service</Th>
                <Th>Pricing guide (worker fee)</Th>
                <Th>Fee type</Th>
                <Th>Asks home size</Th>
                <Th>Asks which areas</Th>
                <Th>Shown to clients</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {adding && (
                <ServiceRow
                  onDone={() => setAdding(false)}
                  nextOrder={(types.data.length + 1) * 10}
                  manage
                />
              )}
              {types.data.map((t, i) => (
                <ServiceRow
                  key={t.key}
                  type={t}
                  manage={manage}
                  order={
                    manage && (
                      <div className="flex gap-1.5">
                        <IconButton
                          label={`Move ${t.label} up`}
                          disabled={i === 0 || reorder.isPending}
                          onClick={() => reorder.mutate({ from: i, to: i - 1 })}
                        >
                          <ArrowUp size={16} />
                        </IconButton>
                        <IconButton
                          label={`Move ${t.label} down`}
                          disabled={i === types.data.length - 1 || reorder.isPending}
                          onClick={() => reorder.mutate({ from: i, to: i + 1 })}
                        >
                          <ArrowDown size={16} />
                        </IconButton>
                      </div>
                    )
                  }
                />
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
      <p className="m-0 max-w-3xl text-[13px] leading-normal text-muted">
        <strong className="text-ink">Home size</strong> asks for the type of home and the number of
        bedrooms and bathrooms. <strong className="text-ink">Areas</strong> asks which parts of the
        home to service (kitchen, bathrooms, compound…). Both help you price and brief the worker.
      </p>
    </>
  );
}

/** One editable row; with no `type` it's the "Add service" row. */
function ServiceRow({
  type: t,
  onDone,
  nextOrder = 0,
  manage,
  order,
}: {
  type?: AdminServiceType;
  onDone?: () => void;
  nextOrder?: number;
  manage: boolean;
  order?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(t?.label ?? '');
  const [guide, setGuide] = useState(t?.pricingGuide ?? '');
  const [feeType, setFeeType] = useState<AdminServiceType['feeType']>(t?.feeType ?? 'SERVICE');
  const [visible, setVisible] = useState(t?.visible ?? true);
  const [asksHomeSize, setAsksHomeSize] = useState(t?.asksHomeSize ?? false);
  const [asksAreas, setAsksAreas] = useState(t?.asksAreas ?? false);
  const key = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/^(?=[^A-Z])/, 'S_')
    .slice(0, 40);
  const fields = { feeType, visible, asksHomeSize, asksAreas };
  const save = useMutation({
    mutationFn: () =>
      t
        ? unwrap(
            api.PATCH('/v1/admin/settings/service-types/{key}', {
              params: { path: { key: t.key } },
              body: { label: label.trim(), pricingGuide: guide.trim(), ...fields },
            }),
          )
        : unwrap(
            api.POST('/v1/admin/settings/service-types', {
              body: {
                key,
                label: label.trim(),
                pricingGuide: guide.trim() || undefined,
                sortOrder: nextOrder,
                ...fields,
              },
            }),
          ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: serviceTypesKey });
      onDone?.();
    },
  });
  const dirty =
    !t ||
    label.trim() !== t.label ||
    guide.trim() !== (t.pricingGuide ?? '') ||
    feeType !== t.feeType ||
    visible !== t.visible ||
    asksHomeSize !== t.asksHomeSize ||
    asksAreas !== t.asksAreas;
  const name = label.trim() || 'new service';
  return (
    <tr>
      <Td>{order}</Td>
      <Td>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={!manage}
          aria-label="Service name"
          placeholder="e.g. Gardening"
          className="h-10 min-w-[200px] rounded-lg text-sm font-semibold"
        />
      </Td>
      <Td>
        <Input
          value={guide}
          onChange={(e) => setGuide(e.target.value)}
          disabled={!manage}
          aria-label={`Pricing guide for ${name}`}
          placeholder="e.g. 5,000 / hour"
          className="h-10 rounded-lg text-sm"
        />
      </Td>
      <Td>
        <Select
          value={feeType}
          onChange={(e) => setFeeType(e.target.value as AdminServiceType['feeType'])}
          disabled={!manage}
          aria-label={`Fee type for ${name}`}
          className="h-10 min-w-[148px] rounded-lg text-sm"
        >
          {Object.entries(FEE_TYPES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Td>
      <Td>
        <Switch
          label={`${name} asks home size`}
          checked={asksHomeSize}
          disabled={!manage}
          onChange={setAsksHomeSize}
        />
      </Td>
      <Td>
        <Switch
          label={`${name} asks which areas`}
          checked={asksAreas}
          disabled={!manage}
          onChange={setAsksAreas}
        />
      </Td>
      <Td>
        <Switch
          label={`${name} shown to clients`}
          checked={visible}
          disabled={!manage}
          onChange={setVisible}
        />
      </Td>
      <Td className="text-right whitespace-nowrap">
        {save.error && (
          <div className="mb-1 text-[13px] text-danger">{(save.error as Error).message}</div>
        )}
        {manage && dirty && (
          <Button
            size="sm"
            disabled={!label.trim() || !key}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {t ? 'Save' : 'Add'}
          </Button>
        )}
        {onDone && (
          <Button size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </Td>
    </tr>
  );
}

function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-5 w-9 accent-ink disabled:opacity-60"
    />
  );
}
