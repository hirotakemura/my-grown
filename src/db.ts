import Dexie, { type Table } from 'dexie';
import type { DayRecord, Exercise, MealRecord, MySet, Product, Settings, WorkoutSet } from './types';
import { SEED_PRODUCTS } from './data/products';
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
    // 初回だけ初期データを入れる
    this.on('populate', async (tx) => {
      await tx.table('settings').add(defaultSettings());
      await tx.table('products').bulkAdd(SEED_PRODUCTS);
      await tx.table('exercises').bulkAdd(SEED_EXERCISES);
    });
  }
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
