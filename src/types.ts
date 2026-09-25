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
  'その他',
];

export interface Product {
  id: string;
  name: string;
  category: Category;
  kcal: number;
  protein: number;
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

export type MealSlot = 'lunch' | 'dinner' | 'post';
export const SLOT_LABEL: Record<MealSlot, string> = { lunch: '昼', dinner: '夜', post: 'トレ後' };

export interface MealItem {
  name: string;
  kcal: number; // 1個あたり
  protein: number; // 1個あたり
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
  lunchTime: string;
  dinnerTime: string;
  gymTime: string;
  menuA: string[];
  menuB: string[];
}
