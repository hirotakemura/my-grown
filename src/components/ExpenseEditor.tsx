import { useMemo, useState } from 'react';
import {
  EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, EXPENSE_STORES, EXPENSE_STORE_LABEL,
  type Expense, type ExpenseCategory, type ExpenseItem,
} from '../types';
import { categorize, sumItems } from '../lib/receipt';
import { deleteExpense, saveExpense } from '../lib/actions';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

export const yen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`;

interface Row extends ExpenseItem {
  key: number;
  manual: boolean; // 費目を手で選んだら、品名を変えても自動で変えない
}

interface Props {
  expense: Expense;
  isNew: boolean;
  rules: Map<string, ExpenseCategory>;
  photoUrl?: string;
  rawText?: string;
  onClose: () => void;
  /** これまでの支出（過去に買った品目を検索して追加するため） */
  history?: Expense[];
}

export interface PastItem extends ExpenseItem {
  store: Expense['store'];
  date: string;
  count: number;
}

/** 過去の支出から品目を名前ごとにまとめる（金額・費目・お店は一番新しい記録のもの）。よく買う順、同じなら新しい順 */
export function pastItems(history: Expense[]): PastItem[] {
  const byName = new Map<string, PastItem>();
  for (const e of [...history].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))) {
    for (const i of e.items) {
      const name = i.name.trim();
      if (!name || i.price < 0) continue;
      const cur = byName.get(name);
      if (cur) cur.count += 1;
      else byName.set(name, { name, price: i.price, category: i.category, store: e.store, date: e.date, count: 1 });
    }
  }
  return [...byName.values()].sort((a, b) => b.count - a.count || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  // カタカナ→ひらがな（「さらだ」でも「サラダ」が見つかるように）
  .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

let seq = 0;

/** 支出の確認・修正（レシートの読み取り結果もここで直す） */
export function ExpenseEditor({ expense, isNew, rules, photoUrl, rawText, onClose, history = [] }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(expense.date);
  const [store, setStore] = useState(expense.store);
  const [rows, setRows] = useState<Row[]>(() =>
    (expense.items.length ? expense.items : [{ name: '', price: 0, category: 'meal' as ExpenseCategory }])
      .map((i) => ({ ...i, key: ++seq, manual: !isNew })),
  );

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const past = useMemo(() => pastItems(history.filter((e) => e.id !== expense.id)), [history, expense.id]);
  const found = useMemo(() => {
    const q = norm(query);
    return (q ? past.filter((i) => norm(i.name).includes(q)) : past).slice(0, 30);
  }, [past, query]);
  // 過去の品目を1行として足す（空の行があればそこに入れる）
  const addPast = (i: PastItem) => {
    // まだ品目がなく、お店が「その他」のままなら、その品目を買ったお店にしておく
    if (store === 'other' && !rows.some((r) => r.name.trim())) setStore(i.store);
    setRows((cur) => {
      const row: Row = { name: i.name, price: i.price, category: i.category, key: ++seq, manual: true };
      const blank = cur.findIndex((r) => !r.name.trim() && !r.price);
      return blank >= 0 ? cur.map((r, n) => (n === blank ? row : r)) : [...cur, row];
    });
  };

  const update = (key: number, patch: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const items = rows.filter((r) => r.name.trim() || r.price);
  const total = sumItems(items);
  const mismatch = expense.receiptTotal != null && expense.receiptTotal !== total;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && items.length > 0 && items.every((r) => r.name.trim() && Number.isFinite(r.price));

  const save = async () => {
    if (!valid) return;
    await saveExpense({
      ...expense,
      date,
      store,
      items: items.map(({ name, price, category }) => ({ name: name.trim(), price: Number(price), category })),
    });
    toast(`${EXPENSE_STORE_LABEL[store]} ${yen(total)} を記録しました`);
    onClose();
  };

  const remove = async () => {
    if (window.confirm('この支出を削除しますか？')) {
      await deleteExpense(expense.id);
      onClose();
    }
  };

  return (
    <Sheet
      title={isNew ? (expense.source === 'receipt' ? 'レシートの内容を確認' : '支出を追加') : '支出を編集'}
      onClose={onClose}
      footer={
        <>
          <div className="row">
            <div className="grow total num" data-testid="expense-total">合計 {yen(total)}</div>
            {mismatch && <span className="chip warn">レシートの合計 {yen(expense.receiptTotal!)}</span>}
          </div>
          <div className="row">
            {!isNew && <button className="btn danger" onClick={remove}>削除</button>}
            <button className="btn primary grow" disabled={!valid} onClick={save}>この内容で保存</button>
          </div>
        </>
      }
    >
      {isNew && expense.source === 'receipt' && (
        <p className="note">
          読み取り結果です。品名・金額・費目が違うところは直してから保存してください。直した費目は覚えて、次のレシートから使います。{photoUrl && ' 読み取りがうまくいかないときは「レシートの文字を貼り付け」の方が正確です。'}
        </p>
      )}
      {photoUrl && (
        <details>
          <summary>レシートの写真を見る</summary>
          <img src={photoUrl} alt="レシートの写真" style={{ width: '100%', borderRadius: 8 }} />
        </details>
      )}
      <div className="grid2">
        <label className="field"><span>日付</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field"><span>お店</span>
          <select className="input" value={store} onChange={(e) => setStore(e.target.value as Expense['store'])}>
            {EXPENSE_STORES.map((s) => <option key={s} value={s}>{EXPENSE_STORE_LABEL[s]}</option>)}
          </select>
        </label>
      </div>

      <div className="stack" data-testid="expense-items">
        {rows.map((r, n) => (
          <div key={r.key} className="expense-row">
            <input
              className="input"
              value={r.name}
              placeholder="品名"
              aria-label={`${n + 1}行目の品名`}
              onChange={(e) => update(r.key, { name: e.target.value })}
              onBlur={() => !r.manual && r.name && update(r.key, { category: categorize(r.name, rules) })}
            />
            <div className="unit-input">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                value={Number.isFinite(r.price) && r.price !== 0 ? r.price : ''}
                placeholder="0"
                aria-label={`${n + 1}行目の金額`}
                onChange={(e) => update(r.key, { price: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
              <em>円</em>
            </div>
            <select
              className="input"
              value={r.category}
              aria-label={`${n + 1}行目の費目`}
              onChange={(e) => update(r.key, { category: e.target.value as ExpenseCategory, manual: true })}
            >
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>)}
            </select>
            <button className="icon-btn" aria-label={`${n + 1}行目を消す`} onClick={() => setRows((cur) => cur.filter((x) => x.key !== r.key))}>✕</button>
          </div>
        ))}
        <div className="btn-grid">
          <button
            className="btn"
            onClick={() => setRows((cur) => [...cur, { name: '', price: 0, category: 'meal', key: ++seq, manual: false }])}
          >
            ＋ 品目を追加
          </button>
          <button className="btn" aria-expanded={searching} disabled={past.length === 0} onClick={() => setSearching((v) => !v)}>
            🔍 過去の品目から
          </button>
        </div>
        {searching && (
          <div className="past-search" data-testid="past-search">
            <input
              className="input"
              type="search"
              value={query}
              placeholder="品名で検索（例：サラダチキン）"
              aria-label="過去の品目を検索"
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="past-list">
              {found.map((i) => (
                <button key={i.name} className="past-item" onClick={() => addPast(i)} aria-label={`${i.name}を追加`}>
                  <span className="grow">
                    <span className="past-name">{i.name}</span>
                    <span className="muted">{EXPENSE_STORE_LABEL[i.store]}・{EXPENSE_CATEGORY_LABEL[i.category]}{i.count > 1 ? `・${i.count}回` : ''}</span>
                  </span>
                  <b className="num">{yen(i.price)}</b>
                  <span className="past-add">＋</span>
                </button>
              ))}
              {found.length === 0 && <p className="muted">見つかりませんでした。</p>}
            </div>
          </div>
        )}
      </div>
      <p className="muted">値引きはマイナスの金額で入れてください（例：-30）。</p>
      {rawText && (
        <details>
          <summary>読み取った文字を見る</summary>
          <pre className="muted" style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{rawText}</pre>
        </details>
      )}
    </Sheet>
  );
}
