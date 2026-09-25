import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db';
import { deleteProduct, recordMeal, resolveSuggestion, saveMySet } from '../src/lib/actions';
import { WEEKDAY_MENUS } from '../src/data/menus';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('食事の記録', () => {
  it('提案の品目は今の商品データの数値で記録される', async () => {
    await db.products.update('salad-chicken', { protein: 25 });
    const products = new Map((await db.products.toArray()).map((p) => [p.id, p]));
    const items = resolveSuggestion(WEEKDAY_MENUS.lunch[0], products);
    expect(items.find((i) => i.productId === 'salad-chicken')?.protein).toBe(25);
  });

  it('新しく選んだ商品だけ「よく選ぶ」回数が増える', async () => {
    const item = { name: 'ゆで卵', kcal: 75, protein: 6, qty: 2, productId: 'boiled-egg' };
    await recordMeal('2026-09-25', 'lunch', [item]);
    await recordMeal('2026-09-25', 'lunch', [item]); // 編集し直しても二重に数えない
    expect((await db.products.get('boiled-egg'))?.useCount).toBe(1);
  });

  it('商品を消すとマイセットからも外れるが、過去の記録は残る', async () => {
    await saveMySet('定番', [{ productId: 'natto', qty: 1 }, { productId: 'tofu', qty: 1 }]);
    await recordMeal('2026-09-25', 'dinner', [{ name: '納豆', kcal: 90, protein: 8, qty: 1, productId: 'natto' }]);
    await deleteProduct('natto');
    expect((await db.mySets.toArray())[0].items).toEqual([{ productId: 'tofu', qty: 1 }]);
    expect((await db.meals.get('2026-09-25|dinner'))?.items[0].name).toBe('納豆');
  });
});
