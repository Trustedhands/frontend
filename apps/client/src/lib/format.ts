/** All times are shown in Kigali time (UTC+2, no DST), whatever the device's zone. */
export const KIGALI_TZ = 'Africa/Kigali';

const dayFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: KIGALI_TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const shortDateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: KIGALI_TZ,
  day: 'numeric',
  month: 'short',
});
const monthFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: KIGALI_TZ,
  month: 'long',
  year: 'numeric',
});
const monthNameFmt = new Intl.DateTimeFormat('en-GB', { timeZone: KIGALI_TZ, month: 'long' });
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: KIGALI_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});
const numberFmt = new Intl.NumberFormat('en-US');

const toDate = (d: string | Date) => (typeof d === 'string' ? new Date(d) : d);

/** 21000 → "21,000" */
export const formatNumber = (n: number) => numberFmt.format(n);
/** 21000 → "21,000 RWF" */
export const formatRwf = (n: number) => `${numberFmt.format(n)} RWF`;
/** "Thu 30 Oct" */
export const formatDay = (d: string | Date) => dayFmt.format(toDate(d)).replace(',', '');
/** "30 Oct" */
export const formatShortDate = (d: string | Date) => shortDateFmt.format(toDate(d));
/** "October 2026" */
export const formatMonth = (d: string | Date) => monthFmt.format(toDate(d));
/** "October" */
export const formatMonthName = (d: string | Date) => monthNameFmt.format(toDate(d));
/** "9:00" */
export const formatTime = (d: string | Date) => timeFmt.format(toDate(d)).replace(/^0(\d)/, '$1');
/** 4 → "4 h", 1.5 → "1.5 h" */
export const formatHours = (h: number) => `${h} h`;
/** "Sat 1 Nov, 8:00 · 3 h" */
export const formatWhen = (scheduledAt: string, durationHours: number) =>
  `${formatDay(scheduledAt)}, ${formatTime(scheduledAt)} · ${formatHours(durationHours)}`;

/** Hour of day in Kigali, for greetings. */
export function kigaliHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: KIGALI_TZ,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  );
}

export function greeting(now = new Date()): string {
  const h = kigaliHour(now);
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Today's date in Kigali as YYYY-MM-DD (for <input type="date" min>). */
export function kigaliToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: KIGALI_TZ }).format(now);
}

/** "2026-11-01" + "8:30" → ISO timestamp at that Kigali wall-clock time. */
export function kigaliDateTime(date: string, time: string): string {
  const [h, m] = time.split(':');
  return new Date(`${date}T${h!.padStart(2, '0')}:${m}:00+02:00`).toISOString();
}

/** "250781234567" or "+250781234567" → "+250 78 *** 4567" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('250') ? digits.slice(3) : digits;
  return `+250 ${local.slice(0, 2)} *** ${local.slice(-4)}`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** "Jeanne Mukamana" → "Jeanne M." */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]}.` : fullName;
}

/** "Sat 1 Nov, 8:00 · 3 h" for visits; "Long-term · starts Mon 3 Nov" for placements. */
export function describeSchedule(r: {
  kind: 'VISIT' | 'PLACEMENT';
  scheduledAt: string;
  durationHours: number | null;
}): string {
  return r.kind === 'PLACEMENT' || r.durationHours === null
    ? `Long-term · starts ${formatDay(r.scheduledAt)}`
    : formatWhen(r.scheduledAt, r.durationHours);
}

/** "Live-out · 6 days a week · about 90,000 RWF a month" */
export function describePlacement(p: {
  arrangement: 'LIVE_IN' | 'LIVE_OUT';
  daysPerWeek: number;
  salaryRwf: number | null;
}): string {
  const parts = [
    p.arrangement === 'LIVE_IN' ? 'Live-in' : 'Live-out',
    `${p.daysPerWeek} ${p.daysPerWeek === 1 ? 'day' : 'days'} a week`,
  ];
  if (p.salaryRwf) parts.push(`about ${formatRwf(p.salaryRwf)} a month`);
  return parts.join(' · ');
}
