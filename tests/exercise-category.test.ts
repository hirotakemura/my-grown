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
