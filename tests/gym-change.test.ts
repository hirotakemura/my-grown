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
