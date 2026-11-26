import type { Exercise, Settings } from '../types';
import { NEW_GYM_PLAN, SEED_EXERCISES } from '../data/exercises';
import { endOfMonthAfter } from './date';

const SEED_IDS = new Set(SEED_EXERCISES.map((e) => e.id));
type Backup = NonNullable<Settings['gymChangeBackup']>;
type Fields = Backup['exercises'][string];

/**
 * ジムを変えた日に、新しいジムのメニュー・回数・期間（3か月後の月末まで）に切り替える内容を作る。
 * 自分で作った「パワーラック」の種目があれば、それをベンチプレスの枠に使う（記録がつながるように）。
 */
export function planForNewGym(date: string, settings: Settings, exercises: Map<string, Exercise>) {
  const inMenus = new Set([...settings.menuA, ...settings.menuB].flatMap((id) => [id, ...(exercises.get(id)?.altIds ?? [])]));
  const myRack = [...exercises.values()].find((e) => !SEED_IDS.has(e.id) && /パワーラック/.test(e.name) && inMenus.has(e.id));
  const swap = (id: string) => (id === 'rack-bench-press' && myRack ? myRack.id : id);

  const menuA = NEW_GYM_PLAN.menuA.map(swap);
  const menuB = NEW_GYM_PLAN.menuB.map(swap);
  const updates: Record<string, Fields> = {};
  for (const [main, opts] of Object.entries(NEW_GYM_PLAN.options)) {
    const id = swap(main);
    const [repMin, repMax, sets] = NEW_GYM_PLAN.reps[main];
    updates[id] = { ...updates[id], altIds: opts.map(swap), repMin, repMax, sets };
    for (const o of opts) updates[swap(o)] = { ...updates[swap(o)], repMin, repMax, sets };
  }
  if (myRack) {
    const seed = SEED_EXERCISES.find((e) => e.id === 'rack-bench-press')!;
    updates[myRack.id] = { ...updates[myRack.id], name: seed.name, category: '胸', carryOver: true, howTo: myRack.howTo || seed.howTo };
  }
  // 取り消せるように、書き換える項目の今の値をとっておく
  const backup: Backup = { startDate: settings.startDate, goalDate: settings.goalDate, menuA: settings.menuA, menuB: settings.menuB, exercises: {} };
  for (const [id, f] of Object.entries(updates)) {
    const cur = exercises.get(id);
    if (!cur) continue;
    backup.exercises[id] = Object.fromEntries(Object.keys(f).map((k) => [k, cur[k as keyof Fields]])) as Fields;
  }
  return { menuA, menuB, startDate: date, goalDate: endOfMonthAfter(date, 3), updates, backup };
}
