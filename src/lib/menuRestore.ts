import type { DayRecord, ISODate, WorkoutSet } from '../types';

/**
 * 間違えて外したメニューの種目を、トレの記録から戻す。
 * そのメニューでトレした最近の日（最大3日）に完了したセットの種目を集め、
 * 代わりの種目で行った分は元の種目に読み替えて、今の一覧に無いものだけ後ろに足す。
 * 記録が無ければ初期メニューから足す。もう一方のメニューにある種目・存在しない種目は足さない。
 */
export function restoreMenu(opts: {
  menu: 'A' | 'B';
  current: string[];
  other: string[];
  defaults: string[];
  days: DayRecord[];
  sets: WorkoutSet[];
  exerciseIds: Set<string>;
}): string[] {
  const { menu, current, other, defaults, days, sets, exerciseIds } = opts;
  const dayOf = new Map(days.map((d) => [d.date, d]));
  const doneByDate = new Map<ISODate, WorkoutSet[]>();
  for (const s of sets) {
    if (!s.done) continue;
    if (dayOf.get(s.date)?.menu !== menu) continue;
    doneByDate.set(s.date, [...(doneByDate.get(s.date) ?? []), s]);
  }
  const recent = [...doneByDate.keys()].sort().reverse().slice(0, 3);

  const found: string[] = [];
  for (const date of recent) {
    // その日の「元の種目 → 代わりの種目」を逆にして、元の種目として数える
    const back = new Map(Object.entries(dayOf.get(date)?.swaps ?? {}).map(([main, alt]) => [alt, main]));
    const list = [...doneByDate.get(date)!].sort((a, b) => (a.doneAt ?? 0) - (b.doneAt ?? 0));
    for (const s of list) {
      const id = back.get(s.exerciseId) ?? s.exerciseId;
      if (!found.includes(id)) found.push(id);
    }
  }
  const source = found.length > 0 ? found : defaults;
  const order = (id: string) => {
    const i = defaults.indexOf(id);
    return i === -1 ? defaults.length + source.indexOf(id) : i;
  };
  const missing = source
    .filter((id) => exerciseIds.has(id) && !current.includes(id) && !other.includes(id))
    .sort((a, b) => order(a) - order(b));
  return [...current, ...missing];
}

/**
 * 押す日（メニューA）に入ってしまった、引く日（メニューB）の背中の種目を引く日へ移す。
 * 初期メニューBの背中の種目（ラットプルダウン・シーテッドロウ）と、その枠で選べる種目が対象。
 * 引く日にもうあれば押す日から外すだけ、なければ引く日の後ろに足す。
 */
export function movePullBackToB(opts: {
  menuA: string[];
  menuB: string[];
  pullBackIds: string[];
  optionsOf: (id: string) => string[];
}): { menuA: string[]; menuB: string[] } {
  const { menuA, menuB, pullBackIds, optionsOf } = opts;
  const pull = new Set(pullBackIds.flatMap((id) => [id, ...optionsOf(id)]));
  const moving = menuA.filter((id) => pull.has(id));
  if (moving.length === 0) return { menuA, menuB };
  const inB = new Set(menuB.flatMap((id) => [id, ...optionsOf(id)]));
  return {
    menuA: menuA.filter((id) => !pull.has(id)),
    menuB: [...menuB, ...moving.filter((id) => !inB.has(id))],
  };
}
