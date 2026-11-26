import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { AppDB, db, defaultSettings } from '../src/db';
import { SEED_EXERCISES } from '../src/data/exercises';
import { SEED_PRODUCTS } from '../src/data/products';
import { changeGym, undoGymChange } from '../src/lib/actions';
import { lastSession, setsForProgress } from '../src/lib/progression';
import type { WorkoutSet } from '../src/types';

const set = (date: string, exerciseId: string, weight: number): WorkoutSet => ({
  id: `${date}|${exerciseId}|0`, date, exerciseId, index: 0, weight, reps: 12, done: true,
});
const ex = (id: string) => SEED_EXERCISES.find((e) => e.id === id)!;

describe('ジムを変える', () => {
  const sets = [set('2026-11-20', 'leg-press', 80), set('2026-11-20', 'smith-squat', 40), set('2026-12-06', 'leg-press', 60)];

  it('マシンはジムを変えた日より前の記録を前回に使わない。スミスは引き継ぐ', () => {
    const lp = setsForProgress(ex('leg-press'), sets, '2026-12-05', '2026-12-05');
    expect(lastSession('leg-press', '2026-12-05', lp)).toBeUndefined();
    expect(lastSession('leg-press', '2026-12-08', setsForProgress(ex('leg-press'), sets, '2026-12-08', '2026-12-05'))?.sets[0].weight).toBe(60);
    const sq = setsForProgress(ex('smith-squat'), sets, '2026-12-05', '2026-12-05');
    expect(lastSession('smith-squat', '2026-12-05', sq)?.sets[0].weight).toBe(40);
  });

  it('ジムを変えた日より前の日を見ているときは、今までどおり', () => {
    expect(setsForProgress(ex('leg-press'), sets, '2026-11-25', '2026-12-05')).toBe(sets);
    expect(setsForProgress(ex('leg-press'), sets, '2026-12-05', undefined)).toBe(sets);
  });

  it('スミス系は初めから「引き継ぐ」', () => {
    expect(['smith-squat', 'smith-shoulder-press', 'smith-chest-press'].every((id) => ex(id).carryOver)).toBe(true);
    expect(ex('leg-press').carryOver).toBeUndefined();
  });
});

describe('ジムを変える（保存）', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('変えた日を保存し、マシンの「次の重さ」は外す。取り消すと戻る', async () => {
    await db.exercises.update('leg-press', { nextWeights: { '80': 85 } });
    await db.exercises.update('smith-squat', { nextWeights: { '40': 42.5 } });
    await changeGym('2026-12-05');
    expect((await db.settings.get('main'))?.gymChangedOn).toBe('2026-12-05');
    expect((await db.exercises.get('leg-press'))?.nextWeights).toBeUndefined();
    expect((await db.exercises.get('smith-squat'))?.nextWeights).toEqual({ '40': 42.5 });
    // 新しいジムで覚えた分
    await db.exercises.update('leg-press', { nextWeights: { '60': 65 } });
    await undoGymChange();
    expect((await db.settings.get('main'))?.gymChangedOn).toBeUndefined();
    expect((await db.exercises.get('leg-press'))?.nextWeights).toEqual({ '80': 85, '60': 65 });
  });
});

describe('v82', () => {
  const names: string[] = [];
  afterEach(async () => { for (const n of names.splice(0)) await Dexie.delete(n); });

  it('スミス・自分で作ったパワーラックなどに「引き継ぐ」の印を付ける（マシンは付けない）', async () => {
    const name = 'v81-carry';
    names.push(name);
    const v81 = new Dexie(name);
    v81.version(81).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
      expenses: 'id, date', categoryRules: 'name',
    });
    await v81.table('settings').put(defaultSettings('2026-10-01'));
    await v81.table('products').bulkAdd(SEED_PRODUCTS);
    await v81.table('exercises').bulkAdd([
      ...SEED_EXERCISES.map(({ carryOver: _, ...e }) => e),
      { id: 'mine', name: 'パワーラック', repMin: 8, repMax: 10, increment: 2.5, howTo: '', sets: 3 },
      { id: 'mine2', name: 'ケーブル フェイスプル', repMin: 12, repMax: 15, increment: 2.5, howTo: '', sets: 3 },
    ]);
    v81.close();
    const d = new AppDB(name);
    expect((await d.exercises.get('smith-squat'))?.carryOver).toBe(true);
    expect((await d.exercises.get('mine'))?.carryOver).toBe(true);
    expect((await d.exercises.get('mine2'))?.carryOver).toBeUndefined();
    expect((await d.exercises.get('leg-press'))?.carryOver).toBeUndefined();
    expect((await d.exercises.get('assisted-pullup'))?.carryOver).toBeUndefined();
    d.close();
  });
});

describe('新しいジムのメニュー・期間', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('3か月後の月末までにする', async () => {
    const { endOfMonthAfter } = await import('../src/lib/date');
    expect(endOfMonthAfter('2026-12-05', 3)).toBe('2027-03-31');
    expect(endOfMonthAfter('2026-12-31', 3)).toBe('2027-03-31');
    expect(endOfMonthAfter('2026-11-30', 3)).toBe('2027-02-28');
  });

  it('ジムを変えると、新しいメニュー・回数・期間になり、取り消すと元に戻る', async () => {
    // 自分で作ったパワーラックが押す日にある（記録をつなげたい）
    await db.exercises.add({ id: 'mine-rack', name: 'パワーラック', repMin: 10, repMax: 12, increment: 2.5, howTo: '', sets: 3, altIds: ['chest-press'] });
    const before = (await db.settings.get('main'))!;
    await db.settings.update('main', { menuA: [...before.menuA.filter((id) => id !== 'chest-press'), 'mine-rack'] });
    const prev = (await db.settings.get('main'))!;
    const latBefore = await db.exercises.get('lat-pulldown');

    await changeGym('2026-12-05');
    const s = (await db.settings.get('main'))!;
    expect(s.menuA).toEqual(['mine-rack', 'leg-press', 'shoulder-press', 'leg-extension', 'pushdown', 'abdominal']);
    expect(s.menuB[0]).toBe('lat-pulldown');
    expect(s).toMatchObject({ startDate: '2026-12-05', goalDate: '2027-03-31', gymChangedOn: '2026-12-05' });
    expect(await db.exercises.get('mine-rack')).toMatchObject({ name: 'パワーラック ベンチプレス', repMin: 6, repMax: 8, sets: 4, carryOver: true, altIds: ['smith-chest-press', 'chest-press'] });
    expect(await db.exercises.get('lat-pulldown')).toMatchObject({ repMin: 6, repMax: 8, sets: 4 });
    expect(await db.exercises.get('assisted-pullup')).toMatchObject({ repMin: 6, repMax: 8, sets: 4 });
    expect((await db.exercises.get('cable-lateral'))?.altIds).toEqual(['dumbbell-lateral']);
    expect((await db.exercises.get('leg-curl'))?.altIds).toEqual([]);

    await undoGymChange();
    const u = (await db.settings.get('main'))!;
    expect(u).toMatchObject({ menuA: prev.menuA, menuB: prev.menuB, startDate: prev.startDate, goalDate: prev.goalDate });
    expect(u.gymChangedOn).toBeUndefined();
    expect(await db.exercises.get('mine-rack')).toMatchObject({ name: 'パワーラック', repMin: 10, repMax: 12, sets: 3, altIds: ['chest-press'] });
    expect(await db.exercises.get('lat-pulldown')).toMatchObject({ repMin: latBefore!.repMin, repMax: latBefore!.repMax, sets: latBefore!.sets, altIds: latBefore!.altIds });
  });

  it('自分のパワーラックがなければ、用意したパワーラック ベンチプレスを使う', async () => {
    await changeGym('2026-12-05');
    expect((await db.settings.get('main'))!.menuA[0]).toBe('rack-bench-press');
    expect(await db.exercises.get('rack-bench-press')).toMatchObject({ category: '胸', carryOver: true });
  });
});

describe('停滞したら10%軽く', () => {
  const sess = (date: string, weight: number, reps: number[]) => ({ date, sets: reps.map((r, i) => ({ id: `${date}|x|${i}`, date, exerciseId: 'x', index: i, weight, reps: r, done: true })) });
  it('同じ重さで2回続けて回数が落ちたら、10%軽くを提案する', async () => {
    const { isStalling, suggestWeight } = await import('../src/lib/progression');
    const lp = ex('lat-pulldown');
    const h = [sess('11-09', 45, [12, 12, 12]), sess('11-13', 45, [12, 11, 10]), sess('11-17', 45, [10, 8, 8])];
    expect(isStalling(lp, h)).toBe(true);
    expect(suggestWeight(lp, h[2], h)).toMatchObject({ weight: 40.5, reset: true });
    // 回数が戻っていれば、いつもどおり
    const ok = [h[0], h[1], sess('11-24', 45, [12, 12, 11])];
    expect(isStalling(lp, ok)).toBe(false);
    // 重さを変えていたら停滞とは見ない
    expect(isStalling(lp, [h[0], h[1], sess('11-17', 50, [8, 8, 8])])).toBe(false);
    // アシストは補助を10%増やす
    const ap = ex('assisted-pullup');
    expect(suggestWeight(ap, h[2], h)).toMatchObject({ weight: 49.5, reset: true });
  });
});

describe('体重の週平均', () => {
  it('直近7日と前の7日の平均と差', async () => {
    const { weeklyWeight } = await import('../src/lib/plan');
    const days = new Map([
      ['2026-12-20', { date: '2026-12-20', weight: 66.0 }],
      ['2026-12-18', { date: '2026-12-18', weight: 66.4 }],
      ['2026-12-12', { date: '2026-12-12', weight: 67.0 }],
      ['2026-12-10', { date: '2026-12-10', weight: 66.8 }],
      ['2026-12-01', { date: '2026-12-01', weight: 70 }],
    ]);
    expect(weeklyWeight('2026-12-20', days)).toEqual({ thisWeek: { avg: 66.2, count: 2 }, lastWeek: { avg: 66.9, count: 2 }, diff: -0.7 });
  });
});
