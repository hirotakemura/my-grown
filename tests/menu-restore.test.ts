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

describe('押す日に入った背中の種目を引く日へ戻す', () => {
  it('ラットプルダウンを押す日から外し、引く日になければ足す（枠で選べる種目も対象）', async () => {
    const { movePullBackToB } = await import('../src/lib/menuRestore');
    const opts = (id: string) => (id === 'lat-pulldown' ? ['assisted-pullup'] : []);
    const pullBackIds = ['lat-pulldown', 'seated-row'];
    expect(movePullBackToB({ menuA: [...DEFAULT_MENU_A, 'lat-pulldown'], menuB: ['leg-curl', 'pec-fly'], pullBackIds, optionsOf: opts }))
      .toEqual({ menuA: DEFAULT_MENU_A, menuB: ['leg-curl', 'pec-fly', 'lat-pulldown'] });
    // 引く日にもうあれば外すだけ
    expect(movePullBackToB({ menuA: [...DEFAULT_MENU_A, 'assisted-pullup'], menuB: DEFAULT_MENU_B, pullBackIds, optionsOf: opts }))
      .toEqual({ menuA: DEFAULT_MENU_A, menuB: DEFAULT_MENU_B });
    // 何もなければそのまま
    expect(movePullBackToB({ menuA: DEFAULT_MENU_A, menuB: DEFAULT_MENU_B, pullBackIds, optionsOf: opts }))
      .toEqual({ menuA: DEFAULT_MENU_A, menuB: DEFAULT_MENU_B });
  });

  it('v70：保存されたメニューも直る（押す日のほかの種目・記録はそのまま）', async () => {
    const name = 'v69-pull-in-a';
    names.push(name);
    const v69 = new Dexie(name);
    v69.version(69).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
      expenses: 'id, date', categoryRules: 'name',
    });
    await v69.table('settings').put({ ...defaultSettings('2026-10-01'), menuA: [...DEFAULT_MENU_A, 'lat-pulldown'], menuB: DEFAULT_MENU_B.filter((id) => id !== 'lat-pulldown') });
    await v69.table('products').bulkAdd(SEED_PRODUCTS);
    await v69.table('exercises').bulkAdd(SEED_EXERCISES);
    await v69.table('workoutSets').add(done('2026-11-09', 'lat-pulldown', 1));
    v69.close();
    const db = new AppDB(name);
    const s = await db.settings.get('main');
    expect(s?.menuA).toEqual(DEFAULT_MENU_A);
    expect(s?.menuB).toContain('lat-pulldown');
    expect(await db.workoutSets.count()).toBe(1);
    db.close();
  });
});
