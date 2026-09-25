import Dexie, { type Table } from 'dexie';
import type { DayRecord, Exercise, MealItem, MealRecord, MySet, Product, Settings, WorkoutSet } from './types';
import { ADDED_IN_V3, SEED_BY_ID, SEED_PRODUCTS } from './data/products';
import { DEFAULT_MENU_A, DEFAULT_MENU_B, SEED_EXERCISES } from './data/exercises';
import { todayISO } from './lib/date';

export const DB_NAME = 'my-grown';

export function defaultSettings(startDate = todayISO()): Settings {
  return {
    id: 'main',
    startDate,
    goalDate: '2026-11-30',
    trainKcal: 2000,
    trainProtein: 135,
    restKcal: 1750,
    restProtein: 120,
    trainWeekdays: [1, 3, 5, 6, 0], // 月・水・金・土・日
    restSeconds: 90,
    lunchTime: '12:00',
    dinnerTime: '21:00',
    gymTime: '19:00',
    menuA: DEFAULT_MENU_A,
    menuB: DEFAULT_MENU_B,
  };
}

export class AppDB extends Dexie {
  settings!: Table<Settings, string>;
  products!: Table<Product, string>;
  mySets!: Table<MySet, string>;
  days!: Table<DayRecord, string>;
  meals!: Table<MealRecord, string>;
  exercises!: Table<Exercise, string>;
  workoutSets!: Table<WorkoutSet, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      settings: 'id',
      products: 'id, category',
      mySets: 'id',
      days: 'date',
      meals: 'id, date',
      exercises: 'id',
      workoutSets: 'id, date, exerciseId',
    });
    // v2: セブン・外食の商品と PFC（脂質・炭水化物）を追加
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        await products.toCollection().modify((p) => { Object.assign(p, normalizeProduct(p)); });
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => !have.has(p.id)));
        await tx.table<MealRecord, string>('meals').toCollection().modify((m) => { m.items = m.items.map(fillItemPFC); });
      });
    // v3: セブンの商品を追加（ブロッコリーチキンエッグ、炭火焼さばおむすび）
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN_V3.includes(p.id) && !have.has(p.id)));
      });
    // 初回だけ初期データを入れる
    this.on('populate', async (tx) => {
      await tx.table('settings').add(defaultSettings());
      await tx.table('products').bulkAdd(SEED_PRODUCTS);
      await tx.table('exercises').bulkAdd(SEED_EXERCISES);
    });
  }
}

/** 古いデータ（PFC・購入場所なし）を今の形にそろえる。初期データの商品なら目安値で埋める */
export function normalizeProduct(p: Partial<Product> & { id: string }): Product {
  const seed = SEED_BY_ID.get(p.id);
  return {
    name: seed?.name ?? '',
    category: seed?.category ?? 'その他',
    kcal: 0,
    protein: 0,
    estimate: true,
    favorite: false,
    useCount: 0,
    ...p,
    store: p.store ?? seed?.store ?? 'lawson',
    // 脂質・炭水化物がない古い商品は、初期データの目安値で埋める（自作の商品は 0。編集で入れ直せる）
    fat: p.fat ?? (seed ? seed.fat : 0),
    carbs: p.carbs ?? (seed ? seed.carbs : 0),
  } as Product;
}

export function fillItemPFC(i: MealItem): MealItem {
  if (i.fat != null && i.carbs != null) return i;
  const seed = i.productId ? SEED_BY_ID.get(i.productId) : undefined;
  return { ...i, fat: i.fat ?? seed?.fat, carbs: i.carbs ?? seed?.carbs };
}

export const db = new AppDB();

export const TABLE_NAMES = ['settings', 'products', 'mySets', 'days', 'meals', 'exercises', 'workoutSets'] as const;
export type TableName = (typeof TABLE_NAMES)[number];

export interface StorageStatus {
  supported: boolean;
  persisted: boolean;
  usage?: number;
  quota?: number;
}

/** ブラウザに「このサイトのデータを勝手に消さないで」と頼む */
export async function requestPersistence(): Promise<StorageStatus> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.persist) return { supported: false, persisted: false };
  let persisted = (await storage.persisted?.()) ?? false;
  if (!persisted) persisted = await storage.persist();
  const est = await storage.estimate?.();
  return { supported: true, persisted, usage: est?.usage, quota: est?.quota };
}

export function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
