import { strings } from '@/lib/i18n';

const DAY = 24 * 60 * 60 * 1000;

/** "today", "yesterday", "5 days ago", "3 months ago", "2 years ago" in the current language. */
export function daysAgo(iso: string, now = Date.now()): string {
  const t = strings().time;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - then.getTime()) / DAY);
  if (days <= 0) return t.today;
  if (days === 1) return t.yesterday;
  if (days < 30) return t.days(days);
  if (days < 365) return t.months(Math.floor(days / 30));
  return t.years(Math.floor(days / 365));
}

export function distance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', strings().format.decimal)} km`;
}

export function catName(name: string | null | undefined): string {
  return name?.trim() || strings().format.unnamed;
}
