import { afterEach, describe, expect, it } from 'vitest';
import { AppDB } from '../src/db';
import { SEED_PRODUCTS } from '../src/data/products';

// 「アプリを閉じて開き直す」＝ DB 接続を閉じて、同じ名前で新しく開き直す
const NAME = 'persist-test';
afterEach(async () => { await new AppDB(NAME).delete(); });

describe('IndexedDB への保存', () => {
  it('初回起動で初期データ（設定・商品・種目）が入る', async () => {
    const db = new AppDB(NAME);
    expect(await db.settings.get('main')).toMatchObject({ goalDate: '2026-11-30', trainProtein: 135, restSeconds: 90 });
    expect(await db.products.count()).toBe(SEED_PRODUCTS.length);
    expect(await db.exercises.count()).toBe(24);
    db.close();
  });

  it('開き直しても記録が残り、初期データが二重に入らない', async () => {
    const a = new AppDB(NAME);
    await a.days.put({ date: '2026-09-25', weight: 71.8, menu: 'A', gymStatus: 'done' });
    await a.meals.put({
      id: '2026-09-25|lunch', date: '2026-09-25', slot: 'lunch', status: 'eaten', updatedAt: 1,
      items: [{ name: 'サラダチキン プレーン', kcal: 115, protein: 24, qty: 2, productId: 'salad-chicken' }],
    });
    await a.workoutSets.put({ id: '2026-09-25|leg-press|0', date: '2026-09-25', exerciseId: 'leg-press', index: 0, weight: 60, reps: 12, done: true });
    await a.products.update('salad-chicken', { kcal: 113, protein: 25, estimate: false });
    await a.settings.update('main', { restSeconds: 120 });
    a.close();

    const b = new AppDB(NAME);
    expect(await b.days.get('2026-09-25')).toMatchObject({ weight: 71.8, menu: 'A', gymStatus: 'done' });
    expect((await b.meals.get('2026-09-25|lunch'))?.items[0]).toMatchObject({ qty: 2, protein: 24 });
    expect(await b.workoutSets.where('exerciseId').equals('leg-press').count()).toBe(1);
    expect(await b.products.get('salad-chicken')).toMatchObject({ kcal: 113, protein: 25, estimate: false });
    expect((await b.settings.get('main'))?.restSeconds).toBe(120);
    expect(await b.products.count()).toBe(SEED_PRODUCTS.length);
    b.close();
  });
});
