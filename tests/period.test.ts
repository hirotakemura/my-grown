import { describe, expect, it } from 'vitest';
import { validatePeriod } from '../src/lib/date';
import { goalProgress } from '../src/lib/plan';
import { snap } from './helpers';

describe('期間（いつからいつまで）', () => {
  it('ゴール日は開始日より後、1年以内', () => {
    expect(validatePeriod('2026-10-01', '2026-12-31')).toBeNull();
    expect(validatePeriod('2026-10-01', '2026-10-01')).toMatch('開始日より後');
    expect(validatePeriod('2026-10-01', '2026-09-30')).toMatch('開始日より後');
    expect(validatePeriod('2026-10-01', '')).toMatch('入れてください');
    expect(validatePeriod('2026-01-01', '2027-01-01')).toBeNull(); // 366日
    expect(validatePeriod('2026-01-01', '2027-01-02')).toMatch('366日以内');
  });

  it('期間を変えると残り日数・マスの数が変わる', () => {
    const p = goalProgress(snap({ settings: { startDate: '2026-10-01', goalDate: '2026-12-31' } }), '2026-10-10');
    expect(p.totalDays).toBe(92);
    expect(p.daysLeft).toBe(82);
    expect(p.statuses).toHaveLength(10);
  });

  it('開始前は達成日を数えず、終了後はゴール日までで数える', () => {
    const before = goalProgress(snap({ settings: { startDate: '2026-11-01', goalDate: '2026-11-30' } }), '2026-10-20');
    expect(before.statuses).toHaveLength(0);
    expect(before.achievedDays).toBe(0);
    const after = goalProgress(snap({ settings: { startDate: '2026-09-01', goalDate: '2026-09-30' } }), '2026-10-20');
    expect(after.statuses).toHaveLength(30);
    expect(after.daysLeft).toBe(0);
  });
});
