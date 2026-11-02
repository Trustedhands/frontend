import type { HomeArea, HomeType, Household } from './index';

export const HOME_TYPE_LABELS: Record<HomeType, string> = {
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  VILLA: 'Villa',
};

/** In the order the API stores them */
export const HOME_AREA_LABELS: Record<HomeArea, string> = {
  KITCHEN: 'Kitchen',
  LIVING_ROOM: 'Living room',
  DINING: 'Dining area',
  BEDROOMS: 'Bedrooms',
  BATHROOMS: 'Bathrooms',
  WINDOWS: 'Windows',
  LAUNDRY_AREA: 'Laundry area',
  COMPOUND: 'Compound / yard',
  GARDEN: 'Garden',
};

export const HOME_AREAS = Object.keys(HOME_AREA_LABELS) as HomeArea[];

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "House · 3 bedrooms · 2 bathrooms", or "Studio apartment · 1 bathroom" */
export function describeHomeSize(h: Household): string | null {
  if (!h.homeType) return null;
  const type = HOME_TYPE_LABELS[h.homeType];
  const parts =
    h.bedrooms === 0
      ? [`Studio ${type.toLowerCase()}`]
      : [type, h.bedrooms !== null ? plural(h.bedrooms, 'bedroom') : null];
  if (h.bathrooms !== null) parts.push(plural(h.bathrooms, 'bathroom'));
  return parts.filter(Boolean).join(' · ');
}

export const describeAreas = (areas: HomeArea[]) =>
  areas.map((a) => HOME_AREA_LABELS[a]).join(', ');
