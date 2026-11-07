import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { AppDB, defaultSettings } from '../src/db';
import { DEFAULT_MENU_A, DEFAULT_MENU_B, SEED_EXERCISES } from '../src/data/exercises';
import { SEED_PRODUCTS } from '../src/data/products';
import { restoreMenu } from '../src/lib/menuRestore';
import type { DayRecord, WorkoutSet } from '../src/types';

const names: string[] = [];
afterEach(async () => { for (const n of names.splice(0)) await Dexie.delete(n); });

const ids = new Set(SEED_EXERCISES.map((e) => e.id));
const done = (date: string, exerciseId: string, at: number): WorkoutSet => ({
  id: `${date}|${exerciseId}|0`, date, exerciseId, index: 0, weight: 30, reps: 10, done: true, doneAt: at,
});

describe('メニューの種目を記録から戻す', () => {
  it('メニューBでトレした日の種目を、外した分だけ初期の並び順で戻す（代わりの種目は元の種目として）', () => {
    const days: DayRecord[] = [
      { date: '2026-11-02', menu: 'B', swaps: { 'lat-pulldown': 'assisted-pullup' } },
      { date: '2026-11-03', menu: 'A' },
    ];
    const sets = [
      done('2026-11-02', 'leg-curl', 1), done('2026-11-02', 'assisted-pullup', 2), done('2026-11-02', 'seated-row', 3),
      done('2026-11-02', 'pec-fly', 4), done('2026-11-02', 'cable-lateral', 5), done('2026-11-02', 'cable-curl', 6),
      done('2026-11-03', 'leg-press', 7), // メニューAの日は数えない
    ];
    const menu = restoreMenu({ menu: 'B', current: ['seated-row'], other: DEFAULT_MENU_A, defaults: DEFAULT_MENU_B, days, sets, exerciseIds: ids });
    expect(menu).toEqual(['seated-row', 'leg-curl', 'lat-pulldown', 'pec-fly', 'cable-lateral', 'cable-curl']);
  });

  it('記録がなく全部消えていたら初期メニューに戻す。残っている種目はそのまま', () => {
    expect(restoreMenu({ menu: 'B', current: [], other: DEFAULT_MENU_A, defaults: DEFAULT_MENU_B, days: [], sets: [], exerciseIds: ids })).toEqual(DEFAULT_MENU_B);
    expect(restoreMenu({ menu: 'B', current: [...DEFAULT_MENU_B], other: DEFAULT_MENU_A, defaults: DEFAULT_MENU_B, days: [], sets: [], exerciseIds: ids })).toEqual(DEFAULT_MENU_B);
  });

  it('v58：メニューBが空になっていたら記録から戻る（メニューA・ほかのデータはそのまま）', async () => {
    const name = 'v57-menu-b';
    names.push(name);
    const v57 = new Dexie(name);
    v57.version(57).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
      expenses: 'id, date', categoryRules: 'name',
    });
    await v57.table('settings').put({ ...defaultSettings('2026-10-01'), menuB: [] });
    await v57.table('products').bulkAdd(SEED_PRODUCTS);
    await v57.table('exercises').bulkAdd(SEED_EXERCISES);
    await v57.table('days').put({ date: '2026-11-02', menu: 'B' });
    await v57.table('workoutSets').bulkAdd(['leg-curl', 'lat-pulldown', 'seated-row'].map((id, i) => done('2026-11-02', id, i)));
    v57.close();
    const db = new AppDB(name);
    const s = await db.settings.get('main');
    expect(s?.menuB).toEqual(['leg-curl', 'lat-pulldown', 'seated-row']);
    expect(s?.menuA).toEqual(DEFAULT_MENU_A);
    expect(await db.workoutSets.count()).toBe(3);
    db.close();
  });
});
