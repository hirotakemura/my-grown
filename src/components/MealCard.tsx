import { PLACE_LABEL, SLOT_LABEL, type DayKind, type DayRecord, type MealItem, type MealRecord, type MealSlot, type MySet, type Place, type Product } from '../types';
import { itemsTotal, placesFor, suggestionFor } from '../lib/plan';
import { clearMeal, patchDay, productToItem, recordMeal, resolveSuggestion, skipMeal } from '../lib/actions';
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
}

const fmt = fmtNut;

/** 提案の場所 → 「食べたものを選ぶ」を開いたときのお店タブ */
export function storeForPlace(place?: Place): StoreFilter {
  if (place === 'lawson' || place === 'seven') return place;
  if (place === 'eatout' || place === 'home') return 'other';
  return 'all';
}

const SHORT_PLACE: Record<Place, string> = { lawson: 'ローソン', seven: 'セブン', eatout: '外食', home: '家', belc: 'ベルク' };
export function ItemList({ items }: { items: MealItem[] }) {
  return (
    <ul className="items">
      {items.map((i, n) => (
        <li key={n}>
          <span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ''}</span>
          <span>{Math.round(i.kcal * i.qty)}kcal・P{g1(i.protein * i.qty)}</span>
        </li>
      ))}
    </ul>
  );
}

export function pickLabel() {
  return '食べたものを選ぶ';
}

/** まだ記録していない食事：提案とボタン */
export function MealSuggestion({ date, slot, kind, day, products, mySets, onPick }: MealCardProps) {
  const toast = useToast();
  const sug = suggestionFor(date, slot, kind, day);
  const places = placesFor(slot, kind);
  const place = day?.place?.[slot];
  const setPlace = (p?: Place) => patchDay(date, { place: { ...day?.place, [slot]: p } });
  const items = resolveSuggestion(sug, products);
  const total = itemsTotal(items);

  const eat = async (list: MealItem[]) => {
    await recordMeal(date, slot, list);
    toast(`${SLOT_LABEL[slot]}を記録しました（${fmt(itemsTotal(list))}）`);
  };

  const nextIdea = () => patchDay(date, { rotation: { ...day?.rotation, [slot]: (day?.rotation?.[slot] ?? 0) + 1 } });

  return (
    <div className="stack">
      {places.length > 1 && (
        <div className="myset-chips" role="group" aria-label="どこで食べる">
          <button className={`btn small ${place ? 'ghost' : 'primary'}`} aria-pressed={!place} onClick={() => setPlace(undefined)}>おまかせ</button>
          {places.map((p) => (
            <button key={p} className={`btn small ${place === p ? 'primary' : 'ghost'}`} aria-pressed={place === p} onClick={() => setPlace(p)}>
              {SHORT_PLACE[p]}
            </button>
          ))}
        </div>
      )}
      <div>
        <div className="muted">{PLACE_LABEL[sug.place]}・提案</div>
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
                  return p ? [productToItem(p, it.qty)] : [];
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
        <button className="btn span2" onClick={() => onPick(slot, [], storeForPlace(place))}>{pickLabel()}</button>
        <button className="btn" onClick={nextIdea}>別の案</button>
        <button className="btn" onClick={() => skipMeal(date, slot)}>食べない</button>
      </div>
    </div>
  );
}

export function MealCard(props: MealCardProps) {
  const { date, slot, time, meal, onPick } = props;
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
            <button className="btn" onClick={() => onPick(slot, meal.items)}>内容を変更</button>
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
