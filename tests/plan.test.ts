import { describe, expect, it } from 'vitest';
import { currentStreak, dayStatus, goalProgress, nextAction, resolveMenu, slotsFor, suggestionFor } from '../src/lib/plan';
import { doneSets, meal, snap } from './helpers';

describe('メニューの割り当て', () => {
  it('トレ曜日はAから始まり、実際にやったメニューの逆が次に来る', () => {
    // 2026-09-28 は月曜
    expect(resolveMenu('2026-09-28', snap())).toBe('A');
    expect(resolveMenu('2026-09-29', snap())).toBe('rest'); // 火曜
    const s = snap({ days: [{ date: '2026-09-28', menu: 'A', gymStatus: 'done' }] });
    expect(resolveMenu('2026-09-30', s)).toBe('B');
    // 休んだ日（トレしていない）は数えない
    const skipped = snap({ days: [{ date: '2026-09-28', menu: 'rest' }] });
    expect(resolveMenu('2026-09-30', skipped)).toBe('A');
  });

  it('初期設定では土日もトレ日', () => {
    expect(resolveMenu('2026-10-03', snap())).not.toBe('rest'); // 土
    expect(resolveMenu('2026-10-04', snap())).not.toBe('rest'); // 日
  });
});

describe('達成条件', () => {
  it('休養日はたんぱく質が目標の9割以上で達成', () => {
    const date = '2026-09-29'; // 火曜＝休養日（目標120g → 108g以上）
    expect(dayStatus(date, snap({ meals: [meal(date, 107)] })).achieved).toBe(false);
    expect(dayStatus(date, snap({ meals: [meal(date, 108)] })).achieved).toBe(true);
  });

  it('トレ日はたんぱく質9割（135g→121.5g）に加えて、予定18セットの8割（15セット）が必要', () => {
    const date = '2026-09-28';
    const base = { days: [{ date, menu: 'A' as const, gymStatus: 'done' as const }], meals: [meal(date, 122)] };
    expect(dayStatus(date, snap({ ...base, sets: doneSets(date, 14) })).achieved).toBe(false);
    expect(dayStatus(date, snap({ ...base, sets: doneSets(date, 15) })).achieved).toBe(true);
    expect(dayStatus(date, snap({ ...base, meals: [meal(date, 121)], sets: doneSets(date, 18) })).achieved).toBe(false);
  });
});

describe('連続記録', () => {
  const m = (entries: [string, boolean][]) => new Map(entries);
  it('1日休んでも途切れない', () => {
    const map = m([['2026-09-20', true], ['2026-09-21', false], ['2026-09-22', true], ['2026-09-23', true]]);
    expect(currentStreak(map, '2026-09-20', '2026-09-23')).toBe(3);
  });
  it('2日続けて未達成だと途切れる', () => {
    const map = m([['2026-09-20', true], ['2026-09-21', false], ['2026-09-22', false], ['2026-09-23', true]]);
    expect(currentStreak(map, '2026-09-20', '2026-09-23')).toBe(1);
  });
  it('今日がまだ未達成でも、昨日までの記録は途切れない', () => {
    const map = m([['2026-09-22', true], ['2026-09-23', true]]);
    expect(currentStreak(map, '2026-09-20', '2026-09-24')).toBe(2);
  });
  it('昨日と今日（終わっていない）で未達成なら、まだ途切れない', () => {
    const map = m([['2026-09-21', true], ['2026-09-22', true]]);
    expect(currentStreak(map, '2026-09-20', '2026-09-24')).toBe(2);
    expect(currentStreak(m([['2026-09-21', true]]), '2026-09-20', '2026-09-24')).toBe(0);
  });

  it('ゴールまでの残り日数', () => {
    const p = goalProgress(snap({ settings: { startDate: '2026-09-25' } }), '2026-09-25');
    expect(p.daysLeft).toBe(66);
    expect(p.totalDays).toBe(67);
  });
});

describe('次にやること', () => {
  const s = snap().settings; // 朝7:30 昼12:00 ジム19:00 夜21:00
  const at = (h: number, mm = 0) => h * 60 + mm;
  const bf = meal('d', 20, 'breakfast');

  it('朝は朝ごはん。済んだら昼、昼が済んだらジム', () => {
    expect(nextAction({ menu: 'A', settings: s, meals: [], nowMinutes: at(7) })).toMatchObject({ type: 'meal', slot: 'breakfast' });
    expect(nextAction({ menu: 'A', settings: s, meals: [bf], nowMinutes: at(9) })).toMatchObject({ type: 'meal', slot: 'lunch' });
    expect(nextAction({ menu: 'A', settings: s, meals: [bf, meal('d', 40)], nowMinutes: at(15) })).toMatchObject({ type: 'gym' });
  });

  it('朝ごはんを食べ忘れたまま昼を過ぎたら、昼を出す', () => {
    expect(nextAction({ menu: 'rest', settings: s, meals: [], nowMinutes: at(12, 30) })).toMatchObject({ type: 'meal', slot: 'lunch' });
  });

  it('ジムを終えるとトレ後の食事、その後に夜', () => {
    const day = { date: 'd', gymStatus: 'done' as const };
    expect(nextAction({ menu: 'A', settings: s, day, meals: [bf, meal('d', 40)], nowMinutes: at(20) })).toMatchObject({ type: 'meal', slot: 'post' });
    const meals = [bf, meal('d', 40), meal('d', 20, 'post')];
    expect(nextAction({ menu: 'A', settings: s, day, meals, nowMinutes: at(21, 30) })).toMatchObject({ type: 'meal', slot: 'dinner' });
  });

  it('トレ中は他より優先して表示し、休養日はジムが出ない', () => {
    expect(nextAction({ menu: 'B', settings: s, day: { date: 'd', gymStatus: 'started' }, meals: [], nowMinutes: at(12) }))
      .toMatchObject({ type: 'gym', started: true });
    expect(nextAction({ menu: 'rest', settings: s, meals: [bf, meal('d', 40)], nowMinutes: at(19) })).toMatchObject({ type: 'meal', slot: 'dinner' });
  });

  it('その日のジムの時間を変えると順番も変わる', () => {
    const day = { date: 'd', gymTime: '07:00' };
    expect(nextAction({ menu: 'A', settings: s, day, meals: [], nowMinutes: at(7, 10) })).toMatchObject({ type: 'gym', time: '07:00' });
  });

  it('すべて済んだら完了（食べないを選んだ食事も済み扱い）', () => {
    const skipped = { ...meal('d', 0, 'breakfast'), status: 'skipped' as const, items: [] };
    const meals = [skipped, meal('d', 40), meal('d', 40, 'dinner')];
    expect(nextAction({ menu: 'rest', settings: s, meals, nowMinutes: at(22) })).toEqual({ type: 'done' });
  });
});

describe('提案メニュー', () => {
  it('日付でローテーションし、「別の案」でずれる。平日はローソン、休日は作り方付き', () => {
    const a = suggestionFor('2026-09-28', 'lunch', 'work');
    const b = suggestionFor('2026-09-29', 'lunch', 'work');
    expect(a.id).not.toBe(b.id);
    expect(suggestionFor('2026-09-28', 'lunch', 'work', { date: '2026-09-28', rotation: { lunch: 1 } }).id).toBe(b.id);
    expect(suggestionFor('2026-10-03', 'dinner', 'off').recipe?.steps.length).toBeGreaterThan(0);
    expect(suggestionFor('2026-10-03', 'breakfast', 'off').recipe?.steps.length).toBeGreaterThan(0);
    expect(slotsFor('rest')).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(slotsFor('A')).toEqual(['breakfast', 'lunch', 'post', 'dinner']);
  });
});
