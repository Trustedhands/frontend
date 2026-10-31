import type { BadgeTone } from '@trustedhands/ui';
import type {
  ReviewTag,
  TicketStatus,
  Gender,
  GenderPreference,
  Language,
  ServiceCategory,
  ServiceRequestStatus,
} from '@trustedhands/api';

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  CLEANING: 'Cleaning',
  COOKING: 'Cooking',
  ERRANDS: 'Errands & groceries',
  REPAIRS: 'Repairs',
  LAUNDRY: 'Laundry',
  DRIVER: 'Driver',
  OTHER: 'Other',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ServiceCategory[];

export const LANGUAGE_LABELS: Record<Language, string> = {
  EN: 'English',
  FR: 'French',
  RW: 'Kinyarwanda',
  SW: 'Swahili',
};
export const LANGUAGE_OPTIONS = (Object.keys(LANGUAGE_LABELS) as Language[]).map((value) => ({
  value,
  label: LANGUAGE_LABELS[value],
}));

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'UNDISCLOSED', label: 'Prefer not to say' },
];

export const GENDER_PREFERENCE_OPTIONS: { value: GenderPreference; label: string }[] = [
  { value: 'ANY', label: 'No preference' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
];

/** "Female · English or French" */
export function describeWorkerPreference(gender: GenderPreference, languages: Language[]): string {
  const parts: string[] = [];
  if (gender !== 'ANY') parts.push(gender === 'FEMALE' ? 'Female' : 'Male');
  if (languages.length) parts.push(languages.map((l) => LANGUAGE_LABELS[l]).join(' or '));
  return parts.join(' · ') || 'No preference';
}

/** "English, French, Kinyarwanda" */
export const listLanguages = (languages: Language[]) =>
  languages.map((l) => LANGUAGE_LABELS[l]).join(', ');

export interface StatusPresentation {
  label: string;
  tone: BadgeTone;
  /** Segments filled on the Requested · Priced · Paid · Done bar */
  progress: number;
  /** Tailwind background class for filled segments */
  barColor: string;
}

export const STATUS: Record<ServiceRequestStatus, StatusPresentation> = {
  REQUESTED: { label: 'Matching', tone: 'info', progress: 1, barColor: 'bg-ink-2' },
  ADJUSTMENT_REQUESTED: {
    label: 'Revising price',
    tone: 'warn',
    progress: 1,
    barColor: 'bg-ink-2',
  },
  PRICED: { label: 'Price ready', tone: 'brand', progress: 2, barColor: 'bg-brand' },
  PAID: { label: 'Paid', tone: 'success', progress: 3, barColor: 'bg-success' },
  ASSIGNED: { label: 'Confirmed', tone: 'success', progress: 3, barColor: 'bg-success' },
  IN_PROGRESS: { label: 'In progress', tone: 'success', progress: 3, barColor: 'bg-success' },
  COMPLETED: { label: 'Done', tone: 'success', progress: 4, barColor: 'bg-success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', progress: 0, barColor: 'bg-line' },
};

export const REVIEW_TAG_OPTIONS: { value: ReviewTag; label: string }[] = [
  { value: 'ON_TIME', label: 'On time' },
  { value: 'THOROUGH', label: 'Thorough' },
  { value: 'FRIENDLY', label: 'Friendly' },
  { value: 'RESPECTFUL', label: 'Respectful' },
  { value: 'COMMUNICATED_WELL', label: 'Communicated well' },
];

export const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const;

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: 'Received', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'brand' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};
