import { db, newId } from '../db';
import { planForNewGym } from './gymPlan';
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

// ---- 支出 ----

/** 支出を保存し、品名→費目を覚える（次のレシートから同じ品名は同じ費目になる） */

/**
 * ジムを変える。この日から：
 * - 新しいジムのメニュー・回数に切り替え、期間を「この日から3か月後の月末まで」にする
 * - 引き継がない種目（マシン・ケーブルなど）は、前回・重さの提案・自己ベストに前のジムの記録を使わない
 * - マシンごとに覚えた「次の重さ」は前のジムのものなので外す
 * どれも取り消せば戻る。記録はそのまま。
 */
export async function changeGym(date: ISODate): Promise<void> {
  await db.transaction('rw', db.settings, db.exercises, async () => {
    const settings = await db.settings.get('main');
    if (!settings) return;
    const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    const plan = planForNewGym(date, settings, exercises);
    for (const [id, f] of Object.entries(plan.updates)) if (exercises.has(id)) await db.exercises.update(id, f);
    await db.exercises.toCollection().modify((e) => {
      if (e.carryOver || !e.nextWeights) return;
      e.nextWeightsBeforeGym = e.nextWeights;
      delete e.nextWeights;
    });
    await db.settings.update('main', {
      gymChangedOn: date, menuA: plan.menuA, menuB: plan.menuB, startDate: plan.startDate, goalDate: plan.goalDate, gymChangeBackup: plan.backup,
    });
  });
}

/** ジムを変えたのを取り消す（メニュー・回数・期間・外した「次の重さ」を戻す。新しいジムで覚えた分はそのまま優先） */
export async function undoGymChange(): Promise<void> {
  await db.transaction('rw', db.settings, db.exercises, async () => {
    const settings = await db.settings.get('main');
    const b = settings?.gymChangeBackup;
    if (b) {
      for (const [id, f] of Object.entries(b.exercises)) await db.exercises.update(id, f);
    }
    await db.settings.update('main', {
      gymChangedOn: undefined, gymChangeBackup: undefined,
      ...(b ? { startDate: b.startDate, goalDate: b.goalDate, menuA: b.menuA, menuB: b.menuB } : {}),
    });
    await db.exercises.toCollection().modify((e) => {
      if (!e.nextWeightsBeforeGym) return;
      e.nextWeights = { ...e.nextWeightsBeforeGym, ...e.nextWeights };
      delete e.nextWeightsBeforeGym;
    });
  });
}
