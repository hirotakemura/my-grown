import type { Exercise, ISODate, WorkoutSet } from '../types';

export interface Session {
  date: ISODate;
  sets: WorkoutSet[]; // 完了したセットのみ、セット順
}

export function sessionsOf(exerciseId: string, sets: WorkoutSet[]): Session[] {
  const byDate = new Map<ISODate, WorkoutSet[]>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !s.done || s.weight == null || s.reps == null) continue;
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, list]) => ({ date, sets: list.sort((a, b) => a.index - b.index) }));
}

export function lastSession(exerciseId: string, before: ISODate, sets: WorkoutSet[]): Session | undefined {
  const list = sessionsOf(exerciseId, sets).filter((s) => s.date < before);
  return list[list.length - 1];
}

export interface WeightSuggestion {
  weight: number | null;
  increase: boolean;
  text: string;
}

export function suggestWeight(ex: Exercise, last: Session | undefined): WeightSuggestion {
  if (!last) {
    return { weight: null, increase: false, text: `はじめて。${ex.repMin}〜${ex.repMax}回で限界が来る重さを探しましょう` };
  }
  const top = Math.max(...last.sets.map((s) => s.weight ?? 0));
  const allHit = last.sets.length >= ex.sets && last.sets.every((s) => (s.reps ?? 0) >= ex.repMax);
  if (allHit) {
    const w = round(top + ex.increment);
    return { weight: w, increase: true, text: `今日は+${ex.increment}kg（${w}kg）` };
  }
  return { weight: top, increase: false, text: `前回と同じ${top}kgで、全セット${ex.repMax}回を目指す` };
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface Best {
  weight: number;
  reps: number;
}

/** 重さが最大のセット（同じ重さなら回数が多い方） */
export function bestOf(sets: WorkoutSet[]): Best | undefined {
  let best: Best | undefined;
  for (const s of sets) {
    if (!s.done || s.weight == null || s.reps == null || s.reps <= 0) continue;
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
      best = { weight: s.weight, reps: s.reps };
    }
  }
  return best;
}

/** 以前の記録があり、それを上回ったら自己ベスト。はじめての記録ではお知らせしない */
export function isPersonalBest(set: WorkoutSet, previous: WorkoutSet[]): boolean {
  if (set.weight == null || set.reps == null || set.reps <= 0) return false;
  if (!previous.some((s) => s.exerciseId === set.exerciseId && s.done && s.date < set.date)) return false;
  const best = bestOf(previous.filter((s) => s.exerciseId === set.exerciseId && s.id !== set.id));
  if (!best) return false;
  return set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps);
}

export function totalVolume(sets: WorkoutSet[]): number {
  return sets.reduce((t, s) => (s.done && s.weight && s.reps ? t + s.weight * s.reps : t), 0);
}
