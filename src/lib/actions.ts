import { db, newId } from '../db';
import type { DayRecord, ISODate, MealItem, MealSlot, MySet, Product, Settings, WorkoutSet } from '../types';
import type { Suggestion } from '../data/menus';

export async function patchDay(date: ISODate, patch: Partial<DayRecord>): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const cur = (await db.days.get(date)) ?? { date };
    await db.days.put({ ...cur, ...patch, date });
  });
}

export async function patchSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update('main', patch);
}

export function mealId(date: ISODate, slot: MealSlot) {
  return `${date}|${slot}`;
}

export function productToItem(p: Product, qty: number): MealItem {
  return { name: p.name, kcal: p.kcal, protein: p.protein, fat: p.fat, carbs: p.carbs, qty, productId: p.id };
}

/** 提案の品目を、今の商品データの数値で MealItem にする */
export function resolveSuggestion(s: Suggestion, products: Map<string, Product>): MealItem[] {
  return s.items.flatMap((it): MealItem[] => {
    if ('productId' in it) {
      const p = products.get(it.productId);
      return p ? [productToItem(p, it.qty)] : [];
    }
    return [{ name: it.name, kcal: it.kcal, protein: it.protein, fat: it.fat, carbs: it.carbs, qty: it.qty }];
  });
}

export async function recordMeal(date: ISODate, slot: MealSlot, items: MealItem[]): Promise<void> {
  await db.transaction('rw', db.meals, db.products, async () => {
    const prev = await db.meals.get(mealId(date, slot));
    const before = new Set(prev?.status === 'eaten' ? prev.items.map((i) => i.productId) : []);
    // 新しく選んだ商品だけ「よく選ぶ」回数を増やす
    for (const i of items) {
      if (i.productId && !before.has(i.productId)) {
        await db.products.where('id').equals(i.productId).modify((p) => { p.useCount += 1; });
      }
    }
    await db.meals.put({ id: mealId(date, slot), date, slot, status: 'eaten', items, updatedAt: Date.now() });
  });
}

export async function skipMeal(date: ISODate, slot: MealSlot): Promise<void> {
  await db.meals.put({ id: mealId(date, slot), date, slot, status: 'skipped', items: [], updatedAt: Date.now() });
}

export async function clearMeal(date: ISODate, slot: MealSlot): Promise<void> {
  await db.meals.delete(mealId(date, slot));
}

export async function saveProduct(p: Product): Promise<void> {
  await db.products.put(p);
}

export async function deleteProduct(id: string): Promise<void> {
  await db.transaction('rw', db.products, db.mySets, async () => {
    await db.products.delete(id);
    // マイセットからも外す
    const sets = await db.mySets.toArray();
    for (const s of sets) {
      if (s.items.some((i) => i.productId === id)) {
        await db.mySets.put({ ...s, items: s.items.filter((i) => i.productId !== id) });
      }
    }
  });
}

export async function saveMySet(name: string, items: MySet['items']): Promise<void> {
  await db.mySets.put({ id: newId(), name, items });
}

export async function deleteMySet(id: string): Promise<void> {
  await db.mySets.delete(id);
}

export function setId(date: ISODate, exerciseId: string, index: number) {
  return `${date}|${exerciseId}|${index}`;
}

export async function saveSet(set: WorkoutSet): Promise<void> {
  await db.workoutSets.put(set);
}
