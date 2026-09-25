import { SLOT_LABEL, type DayKind, type DayRecord, type MealItem, type MealRecord, type MealSlot, type MySet, type Product } from '../types';
import { itemsTotal, suggestionFor } from '../lib/plan';
import { clearMeal, patchDay, recordMeal, resolveSuggestion, skipMeal } from '../lib/actions';
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
  onPick: (slot: MealSlot, initial: MealItem[]) => void;
}

const fmt = (t: { kcal: number; protein: number }) => `${Math.round(t.kcal)}kcal・P${Math.round(t.protein * 10) / 10}g`;

export function ItemList({ items }: { items: MealItem[] }) {
  return (
    <ul className="items">
      {items.map((i, n) => (
        <li key={n}>
          <span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ''}</span>
          <span>{Math.round(i.kcal * i.qty)}kcal・P{Math.round(i.protein * i.qty * 10) / 10}g</span>
        </li>
      ))}
    </ul>
  );
}

export function pickLabel(kind: DayKind) {
  return kind === 'work' ? 'ローソンの商品から選ぶ' : '商品から選ぶ';
}

/** まだ記録していない食事：提案とボタン */
export function MealSuggestion({ date, slot, kind, day, products, mySets, onPick }: MealCardProps) {
  const toast = useToast();
  const sug = suggestionFor(date, slot, kind, day);
  const items = resolveSuggestion(sug, products);
  const total = itemsTotal(items);

  const eat = async (list: MealItem[]) => {
    await recordMeal(date, slot, list);
    toast(`${SLOT_LABEL[slot]}を記録しました（${fmt(itemsTotal(list))}）`);
  };

  const nextIdea = () => patchDay(date, { rotation: { ...day?.rotation, [slot]: (day?.rotation?.[slot] ?? 0) + 1 } });

  return (
    <div className="stack">
      <div>
        <div className="muted">{kind === 'work' ? 'ローソンで買う' : 'ベルクで買って作る'}・提案</div>
        <div className="card-title" data-testid={`suggestion-${slot}`}>{sug.title}</div>
      </div>
      <ItemList items={items} />
      <div className="total num">合計 {fmt(total)}</div>
      {sug.recipe && (
        <details>
          <summary>作り方を見る</summary>
          <div className="stack">
            <div className="sub">材料：{sug.recipe.ingredients.map((i) => `${i.name} ${i.qty}${i.unit}`).join('、')}（調味料：{sug.recipe.seasonings.join('、')}）</div>
            <ol>{sug.recipe.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            {sug.recipe.note && <p className="note">{sug.recipe.note}</p>}
          </div>
        </details>
      )}
      {mySets.length > 0 && (
        <div className="myset-chips" aria-label="マイセットでワンタップ記録">
          {mySets.map((s) => (
            <button
              key={s.id}
              className="btn small"
              onClick={() =>
                eat(s.items.flatMap((it) => {
                  const p = products.get(it.productId);
                  return p ? [{ name: p.name, kcal: p.kcal, protein: p.protein, qty: it.qty, productId: p.id }] : [];
                }))
              }
            >
              ⚡ {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="btn-grid">
        <button className="btn primary span2" onClick={() => eat(items)}>これを食べた</button>
        <button className="btn span2" onClick={() => onPick(slot, [])}>{pickLabel(kind)}</button>
        <button className="btn" onClick={nextIdea}>別の案</button>
        <button className="btn" onClick={() => skipMeal(date, slot)}>食べない</button>
      </div>
    </div>
  );
}

export function MealCard(props: MealCardProps) {
  const { date, slot, time, meal, kind, onPick } = props;
  return (
    <section className="card" data-testid={`meal-${slot}`}>
      <div className="card-head">
        <h3 className="card-title">{SLOT_LABEL[slot]} <span className="muted">{time}</span></h3>
        {meal?.status === 'eaten' && <span className="chip ok">✓ 食べた</span>}
        {meal?.status === 'skipped' && <span className="chip">食べない</span>}
      </div>
      {!meal && <MealSuggestion {...props} />}
      {meal?.status === 'eaten' && (
        <>
          <ItemList items={meal.items} />
          <div className="total num">合計 {fmt(itemsTotal(meal.items))}</div>
          <div className="btn-grid">
            <button className="btn" onClick={() => onPick(slot, meal.items)}>{kind === 'work' ? '商品を変更' : '内容を変更'}</button>
            <button className="btn ghost" onClick={() => clearMeal(date, slot)}>取り消す</button>
          </div>
        </>
      )}
      {meal?.status === 'skipped' && (
        <button className="btn ghost" onClick={() => clearMeal(date, slot)}>取り消す</button>
      )}
    </section>
  );
}
