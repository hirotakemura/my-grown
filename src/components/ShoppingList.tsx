import type { DayRecord, ISODate } from '../types';
import { WEEKDAY_STOCK, type Ingredient } from '../data/menus';
import { addDays, formatMD } from '../lib/date';
import { dayKind, suggestionFor } from '../lib/plan';
import { patchDay } from '../lib/actions';

/** その日から続く休日（最大4日）の朝・昼・夜の提案に必要な材料をまとめる */
export function shoppingFor(date: ISODate, days: Map<ISODate, DayRecord>) {
  const block: ISODate[] = [];
  for (let d = date; block.length < 4 && dayKind(d, days.get(d)) === 'off'; d = addDays(d, 1)) block.push(d);
  const sum = new Map<string, Ingredient>();
  const seasonings = new Set<string>();
  const add = (i: Ingredient) => {
    const key = `${i.name}|${i.unit}`;
    const cur = sum.get(key);
    sum.set(key, cur ? { ...cur, qty: cur.qty + i.qty } : { ...i });
  };
  for (const d of block) {
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      const s = suggestionFor(d, slot, 'off', days.get(d));
      s.recipe?.ingredients.forEach(add);
      s.recipe?.seasonings.forEach((x) => seasonings.add(x));
    }
  }
  WEEKDAY_STOCK.forEach(add);
  const items = [...sum.values()].map((i) => ({
    ...i,
    // g はそのまま、個数ものは切り上げ
    label: `${i.name}　${i.unit === 'g' ? i.qty : Math.ceil(i.qty)}${i.unit}`,
  }));
  return { block, items, seasonings: [...seasonings] };
}

export function ShoppingList({ date, days }: { date: ISODate; days: Map<ISODate, DayRecord> }) {
  const { block, items, seasonings } = shoppingFor(date, days);
  if (block.length === 0) return null;
  const checked = new Set(days.get(date)?.shoppingChecked ?? []);
  const toggle = (name: string) => {
    const next = new Set(checked);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    void patchDay(date, { shoppingChecked: [...next] });
  };
  return (
    <section className="card" data-testid="shopping">
      <div className="card-head">
        <h2 className="card-title">ベルクの買い物リスト</h2>
        <span className="muted">{formatMD(block[0])}〜{formatMD(block[block.length - 1])}</span>
      </div>
      <p className="muted">休日の朝・昼・夜の提案（日替わり）と、平日の作り置き用です。</p>
      <div>
        {items.map((i) => (
          <label key={i.label} className="list-row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={checked.has(i.name)} onChange={() => toggle(i.name)} style={{ width: 22, height: 22 }} />
            <span style={{ textDecoration: checked.has(i.name) ? 'line-through' : undefined, color: checked.has(i.name) ? 'var(--muted)' : undefined }}>
              {i.label}
            </span>
          </label>
        ))}
      </div>
      <p className="muted">調味料（家になければ）：{seasonings.join('、')}</p>
    </section>
  );
}
