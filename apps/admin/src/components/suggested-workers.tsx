'use client';

import { Avatar, Badge, Button, Chip, Select, Spinner, cx } from '@trustedhands/ui';
import type { AdminServiceRequestDetail, SuggestedWorker } from '@trustedhands/api';
import { formatDay } from '@trustedhands/ui/format';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { api, unwrap } from '@/lib/api';
import { LANGUAGE_LABELS } from '@/lib/labels';

type Sort = 'best' | 'rating' | 'distance';

/**
 * "Suggested workers": ranked by the matching priority in Settings, with the
 * design's filter chips applied on top. `selectedId` is the worker being held.
 */
export function SuggestedWorkers({
  request,
  selectedId,
  onSelect,
  actionLabel = 'Assign',
  disabled = false,
}: {
  request: AdminServiceRequestDetail;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  actionLabel?: string;
  disabled?: boolean;
}) {
  const [sort, setSort] = useState<Sort>('best');
  const wantsGender = request.preferredGender !== 'ANY';
  const wantsLanguage = request.preferredLanguages.length > 0;
  const [filters, setFilters] = useState({
    available: true,
    gender: wantsGender,
    language: wantsLanguage,
    near: false,
  });
  const toggle = (key: keyof typeof filters) => setFilters((f) => ({ ...f, [key]: !f[key] }));

  const suggestions = useQuery({
    queryKey: ['admin', 'suggestions', request.id, sort],
    queryFn: () =>
      unwrap(
        api.GET('/v1/admin/service-requests/{id}/suggested-workers', {
          params: { path: { id: request.id }, query: { sort } },
        }),
      ),
  });

  const shown = (suggestions.data ?? []).filter(
    (w) =>
      w.isAssigned ||
      ((!filters.available || w.available) &&
        (!filters.gender || w.genderMatch) &&
        (!filters.language || w.languageMatch) &&
        (!filters.near || (w.distanceKm !== null && w.distanceKm <= 5))),
  );
  const when =
    request.kind === 'PLACEMENT'
      ? `from ${formatDay(request.scheduledAt)}`
      : formatDay(request.scheduledAt);

  return (
    <section className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[22px] font-bold">Suggested workers</h2>
        <label className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          Sort by
          <Select
            className="h-10 w-auto rounded-[10px] text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="best">Best match</option>
            <option value="rating">Rating</option>
            <option value="distance">Distance</option>
          </Select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip
          className="min-h-[38px] px-3 text-[13px]"
          pressed={filters.available}
          onToggle={() => toggle('available')}
        >
          Available {when}
        </Chip>
        {wantsGender && (
          <Chip
            className="min-h-[38px] px-3 text-[13px]"
            pressed={filters.gender}
            onToggle={() => toggle('gender')}
          >
            {request.preferredGender === 'FEMALE' ? 'Female' : 'Male'}
          </Chip>
        )}
        {wantsLanguage && (
          <Chip
            className="min-h-[38px] px-3 text-[13px]"
            pressed={filters.language}
            onToggle={() => toggle('language')}
          >
            {request.preferredLanguages.map((l) => LANGUAGE_LABELS[l]).join(' or ')}
          </Chip>
        )}
        <Chip
          className="min-h-[38px] px-3 text-[13px]"
          pressed={filters.near}
          onToggle={() => toggle('near')}
        >
          Within 5 km
        </Chip>
      </div>

      {suggestions.isPending ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-field bg-white p-6 text-center text-sm text-muted">
          {suggestions.data?.length
            ? 'No one matches these filters. Turn some off to see more workers.'
            : `No verified, active workers offer ${request.categoryLabel.toLowerCase()} yet.`}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {shown.map((w) => (
            <WorkerRow
              key={w.id}
              worker={w}
              selected={w.id === selectedId}
              actionLabel={actionLabel}
              disabled={disabled}
              onToggle={() => onSelect(w.id === selectedId ? null : w.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function WorkerRow({
  worker: w,
  selected,
  actionLabel,
  disabled,
  onToggle,
}: {
  worker: SuggestedWorker;
  selected: boolean;
  actionLabel: string;
  disabled: boolean;
  onToggle: () => void;
}) {
  const place = [
    w.sector,
    w.distanceKm !== null ? `${w.distanceKm} km` : null,
    w.categories.join(', ').toLowerCase(),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li
      className={cx(
        'flex flex-wrap items-center gap-4 rounded-2xl border bg-white px-[18px] py-4',
        selected ? 'border-cta' : 'border-line',
      )}
    >
      <Avatar name={w.fullName} size={52} className="font-extrabold" />
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">{w.fullName}</span>
          <span className="flex items-center gap-1 text-[13px] font-bold">
            <Star size={14} className="fill-brand text-brand" aria-hidden="true" />
            {w.ratingAverage !== null ? w.ratingAverage.toFixed(1) : 'New'}
          </span>
          <span className="text-[13px] text-muted">
            {w.completedJobs} {w.completedJobs === 1 ? 'job' : 'jobs'}
          </span>
        </div>
        <span className="text-[13px] text-muted">{place || 'Location not set'}</span>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {w.available ? (
            <Badge tone="success" className="rounded-lg">
              Free
            </Badge>
          ) : (
            <Badge tone="warn" className="rounded-lg">
              Busy{w.conflict ? ` · #${w.conflict.reference}` : ''}
            </Badge>
          )}
          <Badge tone="info" className="rounded-lg">
            {w.languages.map((l) => LANGUAGE_LABELS[l]).join(' · ') || 'No languages set'}
          </Badge>
          {!w.genderMatch && (
            <Badge tone="neutral" className="rounded-lg">
              Not the preferred gender
            </Badge>
          )}
        </div>
      </div>
      {selected ? (
        <Button
          variant="soft"
          size="sm"
          disabled={disabled}
          onClick={onToggle}
          className="border-2 border-cta bg-peach text-cta-hover hover:bg-peach"
        >
          Unassign
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={disabled} onClick={onToggle}>
          {actionLabel}
        </Button>
      )}
    </li>
  );
}
