import type { ISODate } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now = new Date()): ISODate {
  return toISO(now);
}

export function parseISO(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: ISODate, n: number): ISODate {
  const d = parseISO(date);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** b - a の日数 */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export function weekday(date: ISODate): number {
  return parseISO(date).getDay();
}

export const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'];

export function formatMD(date: ISODate): string {
  const d = parseISO(date);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABEL[d.getDay()]})`;
}

/** 日付の並び [from, to]（両端を含む） */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** 日付ごとの提案ローテーションに使う通し番号 */
export function dayNumber(date: ISODate): number {
  return diffDays('2000-01-01', date);
}

export const MAX_PERIOD_DAYS = 366;

/** 期間（開始日〜ゴール日）が正しければ null、だめなら理由 */
export function validatePeriod(start: ISODate, goal: ISODate): string | null {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(start) || !re.test(goal)) return '開始日とゴール日を入れてください';
  if (goal <= start) return 'ゴール日は開始日より後にしてください';
  if (diffDays(start, goal) + 1 > MAX_PERIOD_DAYS) return `期間は${MAX_PERIOD_DAYS}日以内にしてください`;
  return null;
}
