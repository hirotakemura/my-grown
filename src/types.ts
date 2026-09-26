export type ISODate = string; // 'YYYY-MM-DD'（端末のローカル日付）

export type Category =
  | 'おにぎり'
  | 'チキン・肉'
  | '卵・乳製品'
  | 'プロテイン'
  | '麺'
  | '汁物・サラダ'
  | 'ホットスナック'
  | 'パン'
  | '外食・定食'
  | '自炊'
  | 'その他';

export const CATEGORIES: Category[] = [
  'おにぎり',
  'チキン・肉',
  '卵・乳製品',
  'プロテイン',
  '麺',
  '汁物・サラダ',
  'ホットスナック',
  'パン',
  '外食・定食',
  '自炊',
  'その他',
];

/** 商品の買える場所。common はローソンでもセブンでも買えるもの */
export type Store = 'lawson' | 'seven' | 'common' | 'other';
export const STORE_LABEL: Record<Store, string> = {
  lawson: 'ローソン',
  seven: 'セブン',
  common: 'コンビニ共通',
  other: '外食・自炊',
};

/** 食事をどこで調達するか（提案の絞り込みに使う） */
export type Place = 'lawson' | 'seven' | 'eatout' | 'home' | 'belc';
export const PLACE_LABEL: Record<Place, string> = {
  lawson: 'ローソン',
  seven: 'セブン',
  eatout: '外食',
  home: '家で食べる',
  belc: 'ベルクで買って自炊',
};

export interface Product {
  id: string;
  name: string;
  category: Category;
  store: Store;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** true = 初期データの目安値。パッケージの表示で上書きすると false になる */
  estimate: boolean;
  favorite: boolean;
  useCount: number;
}

export interface MySet {
  id: string;
  name: string;
  items: { productId: string; qty: number }[];
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'post';
export const SLOT_LABEL: Record<MealSlot, string> = { breakfast: '朝', lunch: '昼', dinner: '夜', post: 'トレ後' };

export interface MealItem {
  name: string;
  kcal: number; // 1個あたり
  protein: number; // 1個あたり（g）
  fat?: number; // 1個あたり（g）。PFC対応前の記録にはない
  carbs?: number; // 1個あたり（g）
  qty: number;
  productId?: string;
}

export interface MealRecord {
  id: string; // `${date}|${slot}`
  date: ISODate;
  slot: MealSlot;
  status: 'eaten' | 'skipped';
  items: MealItem[];
  updatedAt: number;
}

export type WorkoutMenu = 'A' | 'B' | 'rest';
export type DayKind = 'work' | 'off'; // 出社日 / 休日

export interface DayRecord {
  date: ISODate;
  kind?: DayKind; // 未設定なら曜日と祝日から自動判定
  menu?: WorkoutMenu; // 未設定なら予定から自動判定
  gymTime?: string; // 'HH:MM'。未設定なら設定の既定値
  gymStatus?: 'started' | 'done';
  weight?: number;
  rotation?: Partial<Record<MealSlot, number>>; // 「別の案」で進めた数
  place?: Partial<Record<MealSlot, Place>>; // 提案をこの場所に絞る
  swaps?: Record<string, string>; // 元の種目id -> 代替種目id
  shoppingChecked?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  repMin: number;
  repMax: number;
  increment: number; // 前回上限回数に届いたら増やす重さ（kg）
  howTo: string;
  altId?: string;
  sets: number;
}

export interface WorkoutSet {
  id: string; // `${date}|${exerciseId}|${index}`
  date: ISODate;
  exerciseId: string;
  index: number;
  weight: number | null;
  reps: number | null;
  done: boolean;
  doneAt?: number;
}

export interface Settings {
  id: 'main';
  startDate: ISODate;
  goalDate: ISODate;
  trainKcal: number;
  trainProtein: number;
  restKcal: number;
  restProtein: number;
  trainWeekdays: number[]; // 0=日 … 6=土
  restSeconds: number;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  gymTime: string;
  menuA: string[];
  menuB: string[];
}
