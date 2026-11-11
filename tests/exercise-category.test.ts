import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { AppDB, defaultSettings } from '../src/db';
import { SEED_CATEGORY, SEED_EXERCISES } from '../src/data/exercises';
import { SEED_PRODUCTS } from '../src/data/products';
import { categoryOf, groupByCategory, guessCategory } from '../src/lib/exerciseCategory';

const names: string[] = [];
afterEach(async () => { for (const n of names.splice(0)) await Dexie.delete(n); });

describe('種目の分類', () => {
  it('名前から推測する（パワーラックは胸、レッグエクステンションは腕ではなく脚）', () => {
    expect(guessCategory('パワーラック')).toBe('胸');
    expect(guessCategory('ケーブル チェストプレス')).toBe('胸');
    expect(guessCategory('レッグエクステンション')).toBe('脚');
    expect(guessCategory('ケーブル オーバーヘッドエクステンション')).toBe('腕');
    expect(guessCategory('ハンギング レッグレイズ')).toBe('脚'); // 先に「レッグ」で脚になる（分類は編集で直せる）
    expect(guessCategory('ストレッチ')).toBe('その他');
  });

  it('初期の種目はすべて分類が付いていて、分類の順にまとまる', () => {
    expect(SEED_EXERCISES.every((e) => e.category && SEED_CATEGORY[e.id] === e.category)).toBe(true);
    const groups = groupByCategory(SEED_EXERCISES);
    expect(groups.map((g) => g.category)).toEqual(['胸', '背中', '肩', '腕', '脚', 'お腹']);
    expect(groups[0].items.map((e) => e.id)).toEqual(expect.arrayContaining(['chest-press', 'cable-chest-press']));
    expect(categoryOf({ ...SEED_EXERCISES[0], category: undefined, name: 'パワーラック' })).toBe('胸');
  });

  it('v66：初期の種目に分類を付ける（自分で作った種目・付けた分類はそのまま）', async () => {
    const name = 'v65-category';
    names.push(name);
    const v65 = new Dexie(name);
    v65.version(65).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
      expenses: 'id, date', categoryRules: 'name',
    });
    await v65.table('settings').put(defaultSettings('2026-10-01'));
    await v65.table('products').bulkAdd(SEED_PRODUCTS);
    await v65.table('exercises').bulkAdd([
      ...SEED_EXERCISES.map(({ category: _, ...e }) => (e.id === 'leg-press' ? { ...e, nextWeights: { '60': 65 } } : e)),
      { id: 'mine', name: 'パワーラック', repMin: 8, repMax: 10, increment: 2.5, howTo: '', sets: 3 },
    ]);
    v65.close();
    const db = new AppDB(name);
    expect(await db.exercises.get('chest-press')).toMatchObject({ category: '胸' });
    expect(await db.exercises.get('leg-press')).toMatchObject({ category: '脚', nextWeights: { '60': 65 } });
    expect((await db.exercises.get('mine'))?.category).toBeUndefined();
    db.close();
  });
});

describe('同じ枠で選べる種目', () => {
  it('v67：代わりの種目1つ（altId）を、選べる種目の一覧（altIds）にする', async () => {
    const name = 'v66-altids';
    names.push(name);
    const v66 = new Dexie(name);
    v66.version(66).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
      expenses: 'id, date', categoryRules: 'name',
    });
    await v66.table('settings').put(defaultSettings('2026-10-01'));
    await v66.table('products').bulkAdd(SEED_PRODUCTS);
    await v66.table('exercises').bulkAdd(SEED_EXERCISES.map(({ altIds, ...e }) => ({ ...e, ...(altIds ? { altId: altIds[0] } : {}) })));
    v66.close();
    const db = new AppDB(name);
    const chest = await db.exercises.get('chest-press');
    expect(chest?.altIds).toEqual(['cable-chest-press']);
    expect(chest?.altId).toBeUndefined();
    db.close();
  });
});

describe('メニューの枠がだぶらない', () => {
  const ex = new Map(SEED_EXERCISES.map((e) => [e.id, e]));
  it('ほかの枠で選べる種目は、別の枠としては出さない（前にあっても後ろにあっても）', async () => {
    const { menuSlots } = await import('../src/lib/exerciseCategory');
    expect(menuSlots(['leg-press', 'chest-press', 'cable-chest-press', 'shoulder-press'], ex)).toEqual(['leg-press', 'chest-press', 'shoulder-press']);
    expect(menuSlots(['cable-chest-press', 'leg-press', 'chest-press'], ex)).toEqual(['leg-press', 'chest-press']);
    expect(menuSlots(['chest-press', 'chest-press'], ex)).toEqual(['chest-press']);
    // お互いに選べる種目にしていても、どちらか1つは残る
    const mutual = new Map(ex);
    mutual.set('cable-chest-press', { ...ex.get('cable-chest-press')!, altIds: ['chest-press'] });
    expect(menuSlots(['chest-press', 'cable-chest-press'], mutual)).toEqual(['chest-press']);
  });

  it('予定のセット数もだぶって数えない', async () => {
    const { plannedSetCount } = await import('../src/lib/plan');
    const s = { ...defaultSettings('2026-10-01'), menuA: ['leg-press', 'chest-press', 'cable-chest-press'] };
    expect(plannedSetCount(s, 'A', ex)).toBe(6);
  });

  it('v68：保存されたメニューからも、だぶっている枠を外す', async () => {
    const name = 'v67-dup';
    names.push(name);
    const v67 = new Dexie(name);
    v67.version(67).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
      expenses: 'id, date', categoryRules: 'name',
    });
    await v67.table('settings').put({ ...defaultSettings('2026-10-01'), menuA: ['leg-press', 'chest-press', 'cable-chest-press'] });
    await v67.table('products').bulkAdd(SEED_PRODUCTS);
    await v67.table('exercises').bulkAdd(SEED_EXERCISES);
    v67.close();
    const db = new AppDB(name);
    expect((await db.settings.get('main'))?.menuA).toEqual(['leg-press', 'chest-press']);
    db.close();
  });
});
