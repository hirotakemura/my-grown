import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { MySet, Product } from './types';
import type { Snapshot } from './lib/plan';
import { todayISO } from './lib/date';

export type AppData = Snapshot & { products: Product[]; mySets: MySet[] };

/** 全データをまとめて購読する。どこかが書き換わると自動で再描画される */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => {
    const [settings, days, meals, sets, exercises, products, mySets] = await Promise.all([
      db.settings.get('main'),
      db.days.toArray(),
      db.meals.toArray(),
      db.workoutSets.toArray(),
      db.exercises.toArray(),
      db.products.toArray(),
      db.mySets.toArray(),
    ]);
    if (!settings) return undefined;
    return {
      settings,
      days: new Map(days.map((d) => [d.date, d])),
      meals,
      sets,
      exercises: new Map(exercises.map((e) => [e.id, e])),
      products,
      mySets,
    };
  });
}

/** 1分ごとに更新される現在時刻 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

export function useToday(): string {
  return todayISO(useNow());
}
