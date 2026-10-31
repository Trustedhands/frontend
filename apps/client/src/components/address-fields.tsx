'use client';

import { Alert, Button, Field, Input, Select } from '@trustedhands/ui';
import { CircleCheck, MapPin } from 'lucide-react';
import { useState } from 'react';
import { KIGALI_DISTRICTS, KIGALI_SECTORS } from '@/lib/kigali';

export interface AddressValue {
  district: string;
  sector: string;
  street: string;
  latitude?: number;
  longitude?: number;
}

export const emptyAddress = (): AddressValue => ({
  district: 'Gasabo',
  sector: 'Kacyiru',
  street: '',
});

/** District / sector / street, plus an optional GPS pin. */
export function AddressFields({
  value,
  onChange,
  streetError,
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  streetError?: string | null;
}) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const sectors = KIGALI_SECTORS[value.district] ?? [];
  const pinned = value.latitude !== undefined && value.longitude !== undefined;

  const pin = () => {
    if (!('geolocation' in navigator)) {
      setLocationError("Your browser can't share a location. Type a landmark instead.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ ...value, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setLocationError(
          'No problem. Type your street and a landmark instead; our team calls if the worker needs directions.',
        );
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="District" small>
          <Select
            className="h-[46px]"
            value={value.district}
            onChange={(e) => {
              const district = e.target.value;
              onChange({ ...value, district, sector: KIGALI_SECTORS[district]?.[0] ?? '' });
            }}
          >
            {KIGALI_DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Field>
        <Field label="Sector" small>
          <Select
            className="h-[46px]"
            value={value.sector}
            onChange={(e) => onChange({ ...value, sector: e.target.value })}
          >
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Street, house no. or landmark" small error={streetError}>
        <Input
          className="h-[46px]"
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          placeholder="e.g. KG 9 Ave, house 14 — blue gate"
          autoComplete="street-address"
          aria-invalid={Boolean(streetError) || undefined}
        />
      </Field>
      {pinned ? (
        <span className="flex min-h-11 items-center gap-2 rounded-xl bg-success-bg px-3 text-sm font-bold text-success-ink">
          <CircleCheck size={18} aria-hidden="true" />
          Location pinned · {value.sector}, {value.district}
        </span>
      ) : (
        <Button variant="soft" size="sm" onClick={pin} loading={locating}>
          {!locating && <MapPin size={18} aria-hidden="true" />}
          Pin my location on the map
        </Button>
      )}
      {locationError ? (
        <Alert tone="warn">{locationError}</Alert>
      ) : (
        <span className="text-[13px] leading-[1.4] text-muted">
          Your browser will ask to share your location. We only use it to place this pin. You can
          type a landmark instead.
        </span>
      )}
    </div>
  );
}
