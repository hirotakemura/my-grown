import Dexie, { type Table } from 'dexie';
import type { CategoryRule, DayRecord, Exercise, Expense, MealItem, MealRecord, MySet, Product, Settings, WorkoutSet } from './types';
import { ADDED_IN, SEED_BY_ID, SEED_PRODUCTS, UPDATED_TO_OFFICIAL_V12, UPDATED_TO_OFFICIAL_V16 } from './data/products';
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
    breakfastTime: '07:30',
    lunchTime: '12:00',
    dinnerTime: '21:00',
    gymTime: '19:00',
    menuA: DEFAULT_MENU_A,
    menuB: DEFAULT_MENU_B,
  };
}

/** あとから増えた設定項目（朝ごはんの時刻など）を既定値で補う。古いデータ・古いバックアップ用 */
export function withSettingDefaults(s: Partial<Settings> & Pick<Settings, 'startDate'>): Settings {
  return { ...defaultSettings(s.startDate), ...s };
}

export class AppDB extends Dexie {
  settings!: Table<Settings, string>;
  products!: Table<Product, string>;
  mySets!: Table<MySet, string>;
  days!: Table<DayRecord, string>;
  meals!: Table<MealRecord, string>;
  exercises!: Table<Exercise, string>;
  workoutSets!: Table<WorkoutSet, string>;
  expenses!: Table<Expense, string>;
  categoryRules!: Table<CategoryRule, string>;

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
    // v3: セブンの商品（ブロッコリーチキンエッグ、炭火焼さばおむすび）
    // v4: 自炊の商品（SAVASソイ、ゆで卵、ベルクの豚バラ・キャベツ・サラダチキン・ソーセージ）
    // v5: ALPRON ソイプロテイン クッキー&クリーム味
    // v6: もやし、えのき
    // v7: 卵かけご飯、納豆かけご飯
    // v8: ザバス MILK PROTEIN ココア味 430ml
    // v9: セブン 蒸し鶏と玉子のサラダ、コク旨玉ねぎドレッシング
    for (const version of [3, 4, 5, 6, 7, 8, 9]) {
      this.version(version)
        .stores({})
        .upgrade(async (tx) => {
          const products = tx.table<Product, string>('products');
          const have = new Set(await products.toCollection().primaryKeys());
          await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[version].includes(p.id) && !have.has(p.id)));
        });
    }
    // v10: セブンの蒸し鶏と玉子のサラダ・コク旨玉ねぎドレッシングを公式の栄養成分に更新（自分で数値を書き換えていたらそのまま）
    this.version(10)
      .stores({})
      .upgrade(async (tx) => {
        for (const id of ['7-mushidori-egg-salad', '7-dressing-koku-onion']) {
          const seed = SEED_BY_ID.get(id)!;
          await tx.table<Product, string>('products').where('id').equals(id).modify((p) => {
            if (!p.estimate) return;
            Object.assign(p, { name: seed.name, kcal: seed.kcal, protein: seed.protein, fat: seed.fat, carbs: seed.carbs, estimate: false });
          });
        }
      });
    // v11: 豚こま肉とブロッコリーのレンジ蒸し
    this.version(11)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[11].includes(p.id) && !have.has(p.id)));
      });
    // v12: セブン・ローソンの商品を追加し、セブンの焼き鳥・ざるそば・豚汁・ななチキを公式の栄養成分に更新
    this.version(12)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[12].includes(p.id) && !have.has(p.id)));
        for (const id of UPDATED_TO_OFFICIAL_V12) {
          const seed = SEED_BY_ID.get(id)!;
          await products.where('id').equals(id).modify((p) => {
            if (!p.estimate) return; // 自分で書き換えた値は残す
            Object.assign(p, { name: seed.name, kcal: seed.kcal, protein: seed.protein, fat: seed.fat, carbs: seed.carbs, estimate: false });
          });
        }
      });
    // v13: セブン 7P 燻製風 半熟煮たまご
    this.version(13)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[13].includes(p.id) && !have.has(p.id)));
      });
    // v14: 支出（レシート）と、品名→費目の覚え書き
    this.version(14).stores({
      expenses: 'id, date',
      categoryRules: 'name',
    });
    // v15: ローソン サラダチキンスティック 柚子こしょう・冷しとろろそば
    this.version(15)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[15].includes(p.id) && !have.has(p.id)));
      });
    // v16: ローソンの商品を増やし、今ある商品もローソン公式サイトの栄養成分に見直す
    this.version(16)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[16].includes(p.id) && !have.has(p.id)));
        for (const id of UPDATED_TO_OFFICIAL_V16) {
          const seed = SEED_BY_ID.get(id)!;
          await products.where('id').equals(id).modify((p) => {
            if (!p.estimate) return; // 自分で書き換えた値は残す
            Object.assign(p, { name: seed.name, kcal: seed.kcal, protein: seed.protein, fat: seed.fat, carbs: seed.carbs, estimate: false });
          });
        }
      });
    // v17: ローソン 豆腐スティック 旨み昆布
    this.version(17)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[17].includes(p.id) && !have.has(p.id)));
      });
    // v18: セブン ピリ辛濃厚ごまだれ 冷し蒸し鶏そば
    this.version(18)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[18].includes(p.id) && !have.has(p.id)));
      });
    // v19: ザバス ミルクプロテイン 脂肪0 フルーツミックス風味 430ml
    this.version(19)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[19].includes(p.id) && !have.has(p.id)));
      });
    // v20: セブン たんぱく質が摂れる豚しゃぶサラダ
    this.version(20)
      .stores({})
      .upgrade(async (tx) => {
        const products = tx.table<Product, string>('products');
        const have = new Set(await products.toCollection().primaryKeys());
        await products.bulkAdd(SEED_PRODUCTS.filter((p) => ADDED_IN[20].includes(p.id) && !have.has(p.id)));
      });
    // v21: レッグエクステンションのマシンは1段階4kg（32kgの次が36kg）。自分で変えていなければ合わせる
    this.version(21)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table<Exercise, string>('exercises').where('id').equals('leg-extension').modify((e) => {
          if (e.increment === 5) e.increment = 4;
        });
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

export const TABLE_NAMES = [
  'settings', 'products', 'mySets', 'days', 'meals', 'exercises', 'workoutSets', 'expenses', 'categoryRules',
] as const;
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
