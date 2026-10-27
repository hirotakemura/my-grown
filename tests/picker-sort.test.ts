import { describe, expect, it } from 'vitest';
import { lastEatenOf, sortProducts } from '../src/components/ProductPicker';
import type { MealRecord, Product } from '../src/types';

const prod = (id: string, useCount: number, protein = 10): Product => ({
  id, name: id, category: 'おにぎり', store: 'seven', kcal: 200, protein, fat: 5, carbs: 30, estimate: false, favorite: false, useCount,
});
const meal = (date: string, slot: MealRecord['slot'], ids: string[], updatedAt: number, status: MealRecord['status'] = 'eaten'): MealRecord => ({
  id: `${date}|${slot}`, date, slot, status, updatedAt,
  items: ids.map((productId) => ({ productId, name: productId, kcal: 200, protein: 10, fat: 5, carbs: 30, qty: 1 })),
});

describe('食べたものを選ぶ：並び順', () => {
  it('最近食べた商品から順に並び、食べたことがない商品はよく選ぶ順で後ろに続く', () => {
    const products = [prod('a', 9), prod('b', 1), prod('c', 5), prod('d', 0, 30)];
    const meals = [
      meal('2026-10-20', 'lunch', ['a'], 100),
      meal('2026-10-26', 'breakfast', ['b'], 200),
      meal('2026-10-26', 'dinner', ['c'], 300),
      meal('2026-10-27', 'lunch', ['d'], 50, 'skipped'), // 食べなかった記録は数えない
    ];
    expect(sortProducts(products, lastEatenOf(meals)).map((p) => p.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('同じ商品を何度も食べていたら、いちばん新しい記録で比べる', () => {
    const products = [prod('a', 0), prod('b', 0)];
    const meals = [meal('2026-10-01', 'lunch', ['a'], 1), meal('2026-10-10', 'lunch', ['b'], 2), meal('2026-10-15', 'dinner', ['a'], 3)];
    expect(sortProducts(products, lastEatenOf(meals)).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('記録がなければ今までどおり（よく選ぶ → たんぱく質が多い順）', () => {
    expect(sortProducts([prod('a', 1), prod('b', 3), prod('c', 1, 20)]).map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
});
