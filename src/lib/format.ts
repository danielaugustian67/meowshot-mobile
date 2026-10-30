const DAY = 24 * 60 * 60 * 1000;

/** "hari ini", "kemarin", "5 hari lalu", "3 bulan lalu", "2 tahun lalu". */
export function daysAgo(iso: string, now = Date.now()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  const days = Math.round((start.getTime() - then.getTime()) / DAY);
  if (days <= 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days < 30) return `${days} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

export function distance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function catName(name: string | null | undefined): string {
  return name?.trim() || 'Tanpa nama';
}
