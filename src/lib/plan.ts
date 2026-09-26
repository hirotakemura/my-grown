import type {
  DayKind, DayRecord, Exercise, ISODate, MealItem, MealRecord, MealSlot, Place, Settings, WorkoutMenu, WorkoutSet,
} from '../types';
import { HOLIDAYS } from '../data/holidays';
import { HOLIDAY_MENUS, WEEKDAY_MENUS, type Suggestion } from '../data/menus';
import { addDays, dateRange, dayNumber, minutesToTime, timeToMinutes, weekday } from './date';

/** 画面と計算に必要な全データ（量が少ないので丸ごと読む） */
export interface Snapshot {
  settings: Settings;
  days: Map<ISODate, DayRecord>;
  meals: MealRecord[];
  sets: WorkoutSet[];
  exercises: Map<string, Exercise>;
}

export const PROTEIN_RATIO = 0.9;
export const SET_RATIO = 0.8;
export const POST_WORKOUT_OFFSET_MIN = 75;

export function holidayName(date: ISODate): string | undefined {
  return HOLIDAYS[date];
}

export function autoDayKind(date: ISODate): DayKind {
  const w = weekday(date);
  return w === 0 || w === 6 || HOLIDAYS[date] ? 'off' : 'work';
}

export function dayKind(date: ISODate, day?: DayRecord): DayKind {
  return day?.kind ?? autoDayKind(date);
}

/** その日より前で、最後に実際にトレしたメニュー */
export function lastTrainedMenuBefore(date: ISODate, days: Map<ISODate, DayRecord>): 'A' | 'B' | undefined {
  let best: DayRecord | undefined;
  for (const d of days.values()) {
    if (d.date >= date || !d.gymStatus || (d.menu !== 'A' && d.menu !== 'B')) continue;
    if (!best || d.date > best.date) best = d;
  }
  return best?.menu as 'A' | 'B' | undefined;
}

/** 予定：トレ曜日なら前回と逆のメニュー（A→B→A…）、それ以外は休み */
export function resolveMenu(date: ISODate, snap: Pick<Snapshot, 'settings' | 'days'>): WorkoutMenu {
  const day = snap.days.get(date);
  if (day?.menu) return day.menu;
  if (!snap.settings.trainWeekdays.includes(weekday(date))) return 'rest';
  return lastTrainedMenuBefore(date, snap.days) === 'A' ? 'B' : 'A';
}

export function targetsFor(settings: Settings, menu: WorkoutMenu) {
  return menu === 'rest'
    ? { kcal: settings.restKcal, protein: settings.restProtein }
    : { kcal: settings.trainKcal, protein: settings.trainProtein };
}

export function menuExerciseIds(settings: Settings, menu: WorkoutMenu): string[] {
  if (menu === 'A') return settings.menuA;
  if (menu === 'B') return settings.menuB;
  return [];
}

export function plannedSetCount(settings: Settings, menu: WorkoutMenu, exercises: Map<string, Exercise>): number {
  return menuExerciseIds(settings, menu).reduce((n, id) => n + (exercises.get(id)?.sets ?? 3), 0);
}

export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function itemsTotal(items: MealItem[]): Nutrition {
  return items.reduce(
    (t, i) => ({
      kcal: t.kcal + i.kcal * i.qty,
      protein: t.protein + i.protein * i.qty,
      fat: t.fat + (i.fat ?? 0) * i.qty,
      carbs: t.carbs + (i.carbs ?? 0) * i.qty,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
}

export const FAT_ENERGY_RATIO = 0.25;

/** PFCの目安：たんぱく質は設定値、脂質はカロリーの25%、残りを炭水化物 */
export function pfcTargets(target: { kcal: number; protein: number }): Nutrition {
  const fat = (target.kcal * FAT_ENERGY_RATIO) / 9;
  const carbs = Math.max(0, (target.kcal - target.protein * 4 - fat * 9) / 4);
  return { kcal: target.kcal, protein: target.protein, fat, carbs };
}

/** エネルギーに占める P・F・C の割合（%） */
export function pfcRatio(n: Nutrition) {
  const total = n.protein * 4 + n.fat * 9 + n.carbs * 4;
  if (total <= 0) return null;
  return {
    protein: Math.round((n.protein * 4 * 100) / total),
    fat: Math.round((n.fat * 9 * 100) / total),
    carbs: Math.round((n.carbs * 4 * 100) / total),
  };
}

export interface DayStatus {
  date: ISODate;
  kind: DayKind;
  menu: WorkoutMenu;
  target: { kcal: number; protein: number };
  eaten: Nutrition;
  plannedSets: number;
  doneSets: number;
  proteinOk: boolean;
  trainingOk: boolean;
  achieved: boolean;
}

export function dayStatus(date: ISODate, snap: Snapshot): DayStatus {
  const menu = resolveMenu(date, snap);
  const target = targetsFor(snap.settings, menu);
  const eaten = itemsTotal(snap.meals.filter((m) => m.date === date && m.status === 'eaten').flatMap((m) => m.items));
  const plannedSets = plannedSetCount(snap.settings, menu, snap.exercises);
  const doneSets = snap.sets.filter((s) => s.date === date && s.done).length;
  const proteinOk = eaten.protein >= target.protein * PROTEIN_RATIO;
  const trainingOk = menu === 'rest' || doneSets >= plannedSets * SET_RATIO;
  return {
    date,
    kind: dayKind(date, snap.days.get(date)),
    menu,
    target,
    eaten,
    plannedSets,
    doneSets,
    proteinOk,
    trainingOk,
    achieved: proteinOk && trainingOk,
  };
}

/**
 * 連続記録。今日から過去へさかのぼり、未達成が2日続いたところで止める。
 * 1日だけの未達成はセーフ（数には入らないが途切れない）。今日が未達成なのは「まだ途中」として無視する。
 */
export function currentStreak(achievedByDate: Map<ISODate, boolean>, startDate: ISODate, today: ISODate): number {
  let count = 0;
  let misses = 0;
  for (let d = today; d >= startDate; d = addDays(d, -1)) {
    if (achievedByDate.get(d)) {
      count++;
      misses = 0;
    } else if (d !== today) {
      misses++;
      if (misses >= 2) break;
    }
  }
  return count;
}

export interface Progress {
  statuses: DayStatus[]; // 開始日〜今日
  achievedDays: number;
  streak: number;
  daysLeft: number;
  totalDays: number;
}

export function goalProgress(snap: Snapshot, today: ISODate): Progress {
  const { startDate, goalDate } = snap.settings;
  const end = today < goalDate ? today : goalDate;
  const statuses = today >= startDate ? dateRange(startDate, end).map((d) => dayStatus(d, snap)) : [];
  const map = new Map(statuses.map((s) => [s.date, s.achieved]));
  return {
    statuses,
    achievedDays: statuses.filter((s) => s.achieved).length,
    streak: currentStreak(map, startDate, end),
    daysLeft: Math.max(0, dateRange(today, goalDate).length - 1),
    totalDays: dateRange(startDate, goalDate).length,
  };
}

// ---- 食事の提案 ----

export function slotsFor(menu: WorkoutMenu): MealSlot[] {
  return menu === 'rest' ? ['breakfast', 'lunch', 'dinner'] : ['breakfast', 'lunch', 'post', 'dinner'];
}

export function suggestionList(slot: MealSlot, kind: DayKind): Suggestion[] {
  return (kind === 'work' ? WEEKDAY_MENUS : HOLIDAY_MENUS)[slot];
}

/** その食事の提案に出てくる場所（ローソン・セブン・外食…） */
const PLACE_ORDER: Place[] = ['lawson', 'seven', 'eatout', 'home', 'belc'];

export function placesFor(slot: MealSlot, kind: DayKind): Place[] {
  const used = new Set(suggestionList(slot, kind).map((s) => s.place));
  return PLACE_ORDER.filter((p) => used.has(p));
}

/** 日付でローテーション。場所を選んでいればその場所の案だけから選ぶ */
export function suggestionFor(date: ISODate, slot: MealSlot, kind: DayKind, day?: DayRecord): Suggestion {
  const all = suggestionList(slot, kind);
  const place = day?.place?.[slot];
  const list = place && all.some((s) => s.place === place) ? all.filter((s) => s.place === place) : all;
  const i = (dayNumber(date) + (day?.rotation?.[slot] ?? 0)) % list.length;
  return list[i];
}

// ---- 次にやること ----

export type NextAction =
  | { type: 'meal'; slot: MealSlot; time: string }
  | { type: 'gym'; time: string; started: boolean }
  | { type: 'done' };

export interface NextActionInput {
  menu: WorkoutMenu;
  settings: Settings;
  day?: DayRecord;
  meals: MealRecord[]; // その日の分
  nowMinutes: number | null; // 今日以外の日は null
}

export function gymTimeOf(settings: Settings, day?: DayRecord): string {
  return day?.gymTime ?? settings.gymTime;
}

export function nextAction({ menu, settings, day, meals, nowMinutes }: NextActionInput): NextAction {
  const resolved = (slot: MealSlot) => meals.some((m) => m.slot === slot);
  const gymDone = menu === 'rest' || day?.gymStatus === 'done';
  if (menu !== 'rest' && day?.gymStatus === 'started') {
    return { type: 'gym', time: gymTimeOf(settings, day), started: true };
  }

  type Ev = { action: NextAction; at: number; done: boolean };
  const events: Ev[] = [
    { action: { type: 'meal', slot: 'breakfast', time: settings.breakfastTime }, at: timeToMinutes(settings.breakfastTime), done: resolved('breakfast') },
    { action: { type: 'meal', slot: 'lunch', time: settings.lunchTime }, at: timeToMinutes(settings.lunchTime), done: resolved('lunch') },
    { action: { type: 'meal', slot: 'dinner', time: settings.dinnerTime }, at: timeToMinutes(settings.dinnerTime), done: resolved('dinner') },
  ];
  if (menu !== 'rest') {
    const gymAt = timeToMinutes(gymTimeOf(settings, day));
    const postAt = gymAt + POST_WORKOUT_OFFSET_MIN;
    events.push({ action: { type: 'gym', time: minutesToTime(gymAt), started: false }, at: gymAt, done: gymDone });
    // トレ後の食事はジムが終わってから
    if (gymDone) {
      events.push({ action: { type: 'meal', slot: 'post', time: minutesToTime(postAt) }, at: postAt, done: resolved('post') });
    }
  }
  const open = events.filter((e) => !e.done).sort((a, b) => a.at - b.at);
  if (open.length === 0) return { type: 'done' };
  if (nowMinutes === null) return open[0].action;
  // 時刻を過ぎたものがあれば一番新しいもの、なければ次に来るもの
  const due = open.filter((e) => e.at <= nowMinutes);
  return (due.length ? due[due.length - 1] : open[0]).action;
}
