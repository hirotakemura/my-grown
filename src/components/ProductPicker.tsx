import { useMemo, useState } from 'react';
import { CATEGORIES, SLOT_LABEL, type Category, type MealItem, type MealSlot, type MySet, type Product } from '../types';
import { itemsTotal } from '../lib/plan';
import { recordMeal, saveMySet, deleteMySet, saveProduct } from '../lib/actions';
import { formatMD } from '../lib/date';
import { Sheet } from './Sheet';
import { ProductEditor } from './ProductEditor';
import { useToast } from './Toast';

type Tab = 'all' | 'mysets' | Category;

interface Props {
  date: string;
  slot: MealSlot;
  title: string;
  initial: MealItem[];
  products: Product[];
  mySets: MySet[];
  onClose: () => void;
}

/** よく選ぶ → お気に入り → たんぱく質が多い順 */
export function sortProducts(list: Product[]): Product[] {
  return [...list].sort(
    (a, b) => b.useCount - a.useCount || Number(b.favorite) - Number(a.favorite) || b.protein - a.protein,
  );
}

const keyOf = (i: MealItem) => i.productId ?? `custom:${i.name}`;

export function ProductPicker({ date, slot, title, initial, products, mySets, onClose }: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<MealItem[]>(initial);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const qtyOf = (id: string) => sel.find((i) => i.productId === id)?.qty ?? 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortProducts(
      products.filter((p) => (tab === 'all' || tab === 'mysets' || p.category === tab) && (!q || p.name.toLowerCase().includes(q))),
    );
  }, [products, tab, query]);

  const setQty = (p: Product, qty: number) => {
    setSel((cur) => {
      const rest = cur.filter((i) => i.productId !== p.id);
      if (qty <= 0) return rest;
      const existing = cur.find((i) => i.productId === p.id);
      const item: MealItem = { name: p.name, kcal: p.kcal, protein: p.protein, qty, productId: p.id };
      return existing ? cur.map((i) => (i.productId === p.id ? item : i)) : [...cur, item];
    });
  };

  const addSet = (s: MySet) => {
    setSel((cur) => {
      let next = [...cur];
      for (const it of s.items) {
        const p = byId.get(it.productId);
        if (!p) continue;
        const ex = next.find((i) => i.productId === p.id);
        next = ex
          ? next.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + it.qty } : i))
          : [...next, { name: p.name, kcal: p.kcal, protein: p.protein, qty: it.qty, productId: p.id }];
      }
      return next;
    });
  };

  const total = itemsTotal(sel);

  const submit = async (items: MealItem[]) => {
    if (items.length === 0) return;
    await recordMeal(date, slot, items);
    const t = itemsTotal(items);
    toast(`${SLOT_LABEL[slot]}を記録しました（${Math.round(t.kcal)}kcal・P${Math.round(t.protein)}g）`);
    onClose();
  };

  const saveAsSet = async () => {
    const withProduct = sel.filter((i) => i.productId);
    if (withProduct.length === 0) return;
    const name = window.prompt('マイセットの名前', withProduct.map((i) => i.name.split(' ')[0]).join('＋').slice(0, 24));
    if (!name) return;
    await saveMySet(name, withProduct.map((i) => ({ productId: i.productId!, qty: i.qty })));
    toast(`マイセット「${name}」を保存しました`);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'mysets', label: `マイセット${mySets.length ? `（${mySets.length}）` : ''}` },
    ...CATEGORIES.map((c) => ({ id: c as Tab, label: c })),
  ];

  const customSel = sel.filter((i) => !i.productId);

  return (
    <>
      <Sheet
        title={title}
        onClose={onClose}
        below={
          <div style={{ paddingTop: 10 }}>
            <div style={{ padding: '0 12px 8px' }}>
              <input
                className="input"
                type="search"
                placeholder="商品名で検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="商品名で検索"
              />
            </div>
            <div className="cat-tabs" role="toolbar" aria-label="カテゴリ">
              {tabs.map((t) => (
                <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
        }
        footer={
          <>
            <div className="row">
              <div className="grow">
                <div className="total num" data-testid="picker-total">
                  {sel.reduce((n, i) => n + i.qty, 0)}品　{Math.round(total.kcal)}kcal・たんぱく質 {Math.round(total.protein * 10) / 10}g
                </div>
                <div className="muted">{formatMD(date)} {SLOT_LABEL[slot]}</div>
              </div>
              <button className="btn small" onClick={saveAsSet} disabled={!sel.some((i) => i.productId)}>
                マイセット保存
              </button>
            </div>
            <button className="btn primary block" disabled={sel.length === 0} onClick={() => submit(sel)}>
              食べた
            </button>
          </>
        }
      >
        {tab === 'mysets' ? (
          <div className="plist">
            {mySets.length === 0 && <p className="muted">よく食べる組み合わせを選んで「マイセット保存」を押すと、ここに出ます。</p>}
            {mySets.map((s) => {
              const items = s.items.flatMap((it) => {
                const p = byId.get(it.productId);
                return p ? [{ name: p.name, kcal: p.kcal, protein: p.protein, qty: it.qty, productId: p.id }] : [];
              });
              const t = itemsTotal(items);
              return (
                <div key={s.id} className="card" style={{ gap: 6 }}>
                  <div className="card-head">
                    <b>{s.name}</b>
                    <button
                      className="icon-btn"
                      aria-label={`${s.name}を削除`}
                      onClick={() => window.confirm(`マイセット「${s.name}」を削除しますか？`) && deleteMySet(s.id)}
                    >🗑</button>
                  </div>
                  <div className="sub">{items.map((i) => `${i.name}${i.qty > 1 ? `×${i.qty}` : ''}`).join('、')}</div>
                  <div className="total num">{Math.round(t.kcal)}kcal・P{Math.round(t.protein)}g</div>
                  <div className="btn-grid">
                    <button className="btn" onClick={() => addSet(s)}>選択に追加</button>
                    <button className="btn primary" onClick={() => submit(items)}>これで記録</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <p className="muted">「目安」の数値は一般的な商品の参考値です。✎ からパッケージの表示に書き換えられます。</p>
            {customSel.length > 0 && (
              <div className="plist">
                {customSel.map((i) => (
                  <div key={keyOf(i)} className="prow sel">
                    <div className="main">
                      <div className="name"><span>{i.name}</span></div>
                      <div className="nut">{i.kcal}kcal・P{i.protein}g ×{i.qty}</div>
                    </div>
                    <button className="btn small ghost" onClick={() => setSel((c) => c.filter((x) => keyOf(x) !== keyOf(i)))}>外す</button>
                  </div>
                ))}
              </div>
            )}
            <div className="plist" data-testid="product-list">
              {visible.map((p) => {
                const q = qtyOf(p.id);
                return (
                  <div key={p.id} className={`prow ${q ? 'sel' : ''}`}>
                    <button className="main" onClick={() => setQty(p, q ? 0 : 1)} aria-pressed={q > 0}>
                      <span className="name">
                        <span>{p.name}</span>
                        {p.estimate && <span className="badge-est">目安</span>}
                      </span>
                      <span className="nut">{p.kcal}kcal・たんぱく質{p.protein}g</span>
                    </button>
                    {q > 0 ? (
                      <div className="qty">
                        <button className="icon-btn" aria-label="1つ減らす" onClick={() => setQty(p, q - 1)}>−</button>
                        <b className="num">{q}</b>
                        <button className="icon-btn" aria-label="1つ増やす" onClick={() => setQty(p, q + 1)}>＋</button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="icon-btn star"
                          aria-label="お気に入り"
                          aria-pressed={p.favorite}
                          onClick={() => saveProduct({ ...p, favorite: !p.favorite })}
                        >{p.favorite ? '★' : '☆'}</button>
                        <button className="icon-btn" aria-label={`${p.name}を編集`} onClick={() => setEditing(p)}>✎</button>
                      </>
                    )}
                  </div>
                );
              })}
              {visible.length === 0 && <p className="muted">見つかりませんでした。</p>}
            </div>
            <button className="btn block" onClick={() => setEditing('new')}>＋ 商品を追加</button>
          </>
        )}
      </Sheet>
      {editing && (
        <ProductEditor
          product={editing === 'new' ? undefined : editing}
          defaultCategory={tab !== 'all' && tab !== 'mysets' ? tab : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
