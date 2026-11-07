import { SLOT_LABEL, type DayKind, type DayRecord, type MealItem, type MealRecord, type MealSlot, type MySet, type Product } from '../types';
import { itemsTotal } from '../lib/plan';
import { clearMeal, productToItem, recordMeal, skipMeal } from '../lib/actions';
import { fmtNut, g1 } from '../lib/format';
import type { StoreFilter } from './ProductPicker';
import { useToast } from './Toast';

export interface MealCardProps {
  date: string;
  slot: MealSlot;
  time: string;
  kind: DayKind;
  day?: DayRecord;
  meal?: MealRecord;
  products: Map<string, Product>;
  mySets: MySet[];
  onPick: (slot: MealSlot, initial: MealItem[], store?: StoreFilter) => void;
  /** 「次にやること」から開いたときに少し目立たせる */
  focused?: boolean;
}

const fmt = fmtNut;

export function ItemList({ items }: { items: MealItem[] }) {
  return (
    <ul className="items">
      {items.map((i, n) => (
        <li key={n}>
          <span>{i.name}{i.qty !== 1 ? ` ×${Math.round(i.qty * 100) / 100}` : ''}</span>
          <span>{Math.round(i.kcal * i.qty)}kcal・P{g1(i.protein * i.qty)}</span>
        </li>
      ))}
    </ul>
  );
}

export function pickLabel() {
  return '食べたものを選ぶ';
}

/** まだ記録していない食事：食べたものを選ぶ（マイセットはワンタップ）／食べない */
function MealOpen({ date, slot, kind, products, mySets, onPick }: MealCardProps) {
  const toast = useToast();
  const eatSet = async (s: MySet) => {
    const list = s.items.flatMap((it) => {
      const p = products.get(it.productId);
      return p ? [productToItem(p, it.qty)] : [];
    });
    await recordMeal(date, slot, list);
    toast(`${SLOT_LABEL[slot]}を記録しました（${fmt(itemsTotal(list))}）`);
  };
  return (
    <div className="stack">
      {mySets.length > 0 && (
        <div className="myset-chips" aria-label="マイセットでワンタップ記録">
          {mySets.map((s) => (
            <button key={s.id} className="btn small" onClick={() => void eatSet(s)}>⚡ {s.name}</button>
          ))}
        </div>
      )}
      <div className="meal-open-actions">
        {/* 休日は自炊・ベルクのタブ、出社日はすべてのお店から */}
        <button className="btn primary" onClick={() => onPick(slot, [], kind === 'off' ? 'other' : 'all')}>{pickLabel()}</button>
        <button className="btn ghost" onClick={() => skipMeal(date, slot)}>食べない</button>
      </div>
    </div>
  );
}

const qtyText = (q: number) => (q !== 1 ? ` ×${Math.round(q * 100) / 100}` : '');

export function MealCard(props: MealCardProps) {
  const { date, slot, time, meal, onPick, focused } = props;
  const state = meal?.status ?? 'open';
  return (
    <section className={`card meal ${state} ${focused ? 'focused' : ''}`} data-testid={`meal-${slot}`}>
      <div className="card-head">
        <h3 className="card-title">{SLOT_LABEL[slot]} <span className="muted">{time}</span></h3>
        {meal?.status === 'eaten' && <span className="chip ok">✓ 食べた</span>}
        {meal?.status === 'skipped' && <span className="chip">食べない</span>}
      </div>
      {!meal && <MealOpen {...props} />}
      {meal?.status === 'eaten' && (
        <>
          {/* 記録済みは1行にまとめる。内訳は開いて確認できる */}
          <details className="fold">
            <summary>
              <span className="eaten-names">{meal.items.map((i) => `${i.name}${qtyText(i.qty)}`).join('、')}</span>
            </summary>
            <ItemList items={meal.items} />
            <div className="total num">合計 {fmt(itemsTotal(meal.items))}</div>
          </details>
          <div className="row">
            <span className="grow total num">{Math.round(itemsTotal(meal.items).kcal)}kcal・P{g1(itemsTotal(meal.items).protein)}</span>
            <button className="btn small" onClick={() => onPick(slot, meal.items)}>内容を変更</button>
            <button className="btn small ghost" onClick={() => clearMeal(date, slot)}>取り消す</button>
          </div>
        </>
      )}
      {meal?.status === 'skipped' && (
        <button className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => clearMeal(date, slot)}>取り消す</button>
      )}
    </section>
  );
}
