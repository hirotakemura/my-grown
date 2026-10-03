import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { AppDB, defaultSettings } from '../src/db';
import { SEED_EXERCISES } from '../src/data/exercises';
import { SEED_PRODUCTS } from '../src/data/products';
import { suggestWeight } from '../src/lib/progression';
import type { WorkoutSet } from '../src/types';

const names: string[] = [];
afterEach(async () => { for (const n of names.splice(0)) await Dexie.delete(n); });

const done = (weight: number, reps: number, index: number): WorkoutSet => ({
  id: `d|leg-extension|${index}`, date: '2026-10-01', exerciseId: 'leg-extension', index, weight, reps, done: true,
});

describe('マシンの1段階の重さ', () => {
  it('上限回数に届いたら、そのマシンの1段階分だけ重くする（32kg → 36kg）', () => {
    const ex = { ...SEED_EXERCISES.find((e) => e.id === 'leg-extension')!, increment: 4 };
    const sug = suggestWeight(ex, { date: '2026-10-01', sets: [done(32, 15, 0), done(32, 15, 1), done(32, 15, 2)] });
    expect(sug).toMatchObject({ weight: 36, increase: true, text: '今日は+4kg（36kg）' });
  });

  it('v21：レッグエクステンションの1段階を4kgにする（自分で変えた値は残す）', async () => {
    for (const [name, inc, expected] of [['v20-default', 5, 4], ['v20-edited', 2.5, 2.5]] as const) {
      names.push(name);
      const v20 = new Dexie(name);
      v20.version(20).stores({
        settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
        expenses: 'id, date', categoryRules: 'name',
      });
      await v20.table('settings').put(defaultSettings('2026-10-01'));
      await v20.table('products').bulkAdd(SEED_PRODUCTS);
      await v20.table('exercises').bulkAdd(SEED_EXERCISES.map((e) => (e.id === 'leg-extension' ? { ...e, increment: inc } : e)));
      v20.close();
      const db = new AppDB(name);
      expect((await db.exercises.get('leg-extension'))?.increment).toBe(expected);
      expect((await db.exercises.get('leg-press'))?.increment).toBe(5);
      db.close();
    }
  });
});
