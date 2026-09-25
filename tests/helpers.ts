import { defaultSettings } from '../src/db';
import { SEED_EXERCISES } from '../src/data/exercises';
import type { Snapshot } from '../src/lib/plan';
import type { DayRecord, MealRecord, Settings, WorkoutSet } from '../src/types';

export function snap(opts: { settings?: Partial<Settings>; days?: DayRecord[]; meals?: MealRecord[]; sets?: WorkoutSet[] } = {}): Snapshot {
  return {
    settings: { ...defaultSettings('2026-09-01'), ...opts.settings },
    days: new Map((opts.days ?? []).map((d) => [d.date, d])),
    meals: opts.meals ?? [],
    sets: opts.sets ?? [],
    exercises: new Map(SEED_EXERCISES.map((e) => [e.id, e])),
  };
}

export function meal(date: string, protein: number, slot: MealRecord['slot'] = 'lunch'): MealRecord {
  return { id: `${date}|${slot}`, date, slot, status: 'eaten', items: [{ name: 'x', kcal: 500, protein, qty: 1 }], updatedAt: 0 };
}

export function doneSets(date: string, count: number, exerciseId = 'leg-press'): WorkoutSet[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${date}|${exerciseId}|${i}`, date, exerciseId, index: i, weight: 40, reps: 10, done: true,
  }));
}
