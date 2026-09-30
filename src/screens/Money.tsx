import { useMemo, useRef, useState } from 'react';
import type { AppData } from '../hooks';
import { useToday } from '../hooks';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, EXPENSE_STORES, EXPENSE_STORE_LABEL, type Expense } from '../types';
import { formatMD } from '../lib/date';
import { dayKind } from '../lib/plan';
import { parseReceipt, rulesMap, sumItems } from '../lib/receipt';
import { newId } from '../db';
import { ExpenseEditor, yen } from '../components/ExpenseEditor';
import { useToast } from '../components/Toast';
import { PasteReceipt } from '../components/PasteReceipt';

const monthOf = (date: string) => date.slice(0, 7);
const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface Editing {
  expense: Expense;
  isNew: boolean;
  photoUrl?: string;
  rawText?: string;
}

export function Money({ data }: { data: AppData }) {
  const today = useToday();
  const toast = useToast();
  const [month, setMonth] = useState(monthOf(today));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [ocr, setOcr] = useState<{ label: string; ratio: number } | null>(null);
  const [pasting, setPasting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rules = useMemo(() => rulesMap(data.categoryRules), [data.categoryRules]);

  const list = data.expenses
    .filter((e) => monthOf(e.date) === month)
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
  const total = list.reduce((t, e) => t + sumItems(e.items), 0);

  // 出社日の支出（1日あたり）
  const workDays = new Map<string, number>();
  for (const e of list) {
    if (dayKind(e.date, data.days.get(e.date)) !== 'work') continue;
    workDays.set(e.date, (workDays.get(e.date) ?? 0) + sumItems(e.items));
  }
  const workTotal = [...workDays.values()].reduce((a, b) => a + b, 0);

  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    c,
    amount: list.reduce((t, e) => t + e.items.filter((i) => i.category === c).reduce((s, i) => s + i.price, 0), 0),
  })).filter((x) => x.amount !== 0).sort((a, b) => b.amount - a.amount);
  const maxCat = Math.max(1, ...byCategory.map((x) => x.amount));
  const byStore = EXPENSE_STORES.map((s) => ({ s, amount: list.filter((e) => e.store === s).reduce((t, e) => t + sumItems(e.items), 0) }))
    .filter((x) => x.amount !== 0);

  const newExpense = (source: Expense['source']): Expense => ({
    id: newId(), date: today, store: 'other', items: [], source, createdAt: Date.now(),
  });

  /** 読み取った文字から確認画面を開く */
  const openParsed = (text: string, photoUrl?: string) => {
    const parsed = parseReceipt(text, rules);
    if (parsed.items.length === 0) toast('品目を読み取れませんでした。手で入力してください');
    setEditing({
      expense: {
        ...newExpense('receipt'),
        date: parsed.date ?? today,
        store: parsed.store,
        items: parsed.items,
        receiptTotal: parsed.total,
      },
      isNew: true,
      photoUrl,
      rawText: text,
    });
  };

  const onPhoto = async (file: File) => {
    const photoUrl = URL.createObjectURL(file);
    setOcr({ label: '読み取りの準備中…', ratio: 0 });
    try {
      const { readReceipt } = await import('../lib/ocr');
      openParsed(await readReceipt(file, (label, ratio) => setOcr({ label, ratio })), photoUrl);
    } catch (e) {
      console.error(e);
      toast('レシートを読み取れませんでした。手で入力してください');
      setEditing({ expense: newExpense('receipt'), isNew: true, photoUrl });
    } finally {
      setOcr(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const closeEditor = () => {
    if (editing?.photoUrl) URL.revokeObjectURL(editing.photoUrl);
    setEditing(null);
  };

  const [y, m] = month.split('-').map(Number);

  return (
    <div className="screen">
      <h1 className="page-title">支出</h1>

      <section className="card">
        <div className="datebar">
          <button className="btn" aria-label="前の月" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <div className="date" data-testid="money-month">{y}年{m}月</div>
          <button className="btn" aria-label="次の月" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
        <div className="goal-stats">
          <div className="stat"><b className="num" data-testid="money-total">{yen(total)}</b><span>今月の支出</span></div>
          <div className="stat">
            <b className="num">{workDays.size ? yen(workTotal / workDays.size) : '—'}</b>
            <span>出社日の1日平均（{workDays.size}日）</span>
          </div>
        </div>
        {byCategory.length > 0 && (
          <div className="stack" style={{ gap: 6 }} data-testid="money-by-category">
            {byCategory.map(({ c, amount }) => (
              <div key={c} className="meter">
                <div className="meter-top">
                  <span>{EXPENSE_CATEGORY_LABEL[c]}</span>
                  <span className="num"><b>{yen(amount)}</b>　{total ? Math.round((amount / total) * 100) : 0}%</span>
                </div>
                <div className="bar"><div style={{ width: `${Math.max(0, (amount / maxCat) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
        {byStore.length > 0 && (
          <p className="sub num">{byStore.map(({ s, amount }) => `${EXPENSE_STORE_LABEL[s]} ${yen(amount)}`).join('　')}</p>
        )}
      </section>

      <div className="btn-grid">
        <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={!!ocr}>📷 レシートを読む</button>
        <button className="btn" onClick={() => setEditing({ expense: newExpense('manual'), isNew: true })}>✎ 手入力で追加</button>
        <button className="btn span2" onClick={() => setPasting(true)} disabled={!!ocr}>
          📋 iPhoneで読んだ文字を貼り付け（より正確）
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        data-testid="receipt-input"
        onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
      />
      {ocr && (
        <section className="card" role="status" data-testid="ocr-progress">
          <div className="sub">{ocr.label}</div>
          <div className="bar"><div style={{ width: `${Math.round(ocr.ratio * 100)}%` }} /></div>
          <p className="muted">写真はこのiPhoneの中だけで読み取ります（外には送りません）。</p>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">{m}月の記録</h2>
        {list.length === 0 && <p className="muted">まだ記録がありません。レシートの写真を読むか、手入力で追加してください。</p>}
        <div data-testid="expense-list">
          {list.map((e) => (
            <button
              key={e.id}
              className="list-row"
              style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', padding: '6px 0' }}
              onClick={() => setEditing({ expense: e, isNew: false })}
            >
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{formatMD(e.date)}　{EXPENSE_STORE_LABEL[e.store]}</div>
                <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.items.map((i) => i.name).join('、')}
                </div>
              </div>
              <b className="num">{yen(sumItems(e.items))}</b>
            </button>
          ))}
        </div>
      </section>

      {pasting && (
        <PasteReceipt
          onClose={() => setPasting(false)}
          onRead={(text) => { setPasting(false); openParsed(text); }}
        />
      )}
      {editing && (
        <ExpenseEditor
          key={editing.expense.id}
          expense={editing.expense}
          isNew={editing.isNew}
          rules={rules}
          photoUrl={editing.photoUrl}
          rawText={editing.rawText}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
