import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../hooks';
import { STORE_LABEL, type Exercise, type Product, type Settings } from '../types';
import { fmtNut } from '../lib/format';
import { db, newId, requestPersistence, type StorageStatus } from '../db';
import { patchSettings } from '../lib/actions';
import { WEEKDAY_LABEL } from '../lib/date';
import { backupFileName, exportBackup, importBackup, parseBackup } from '../lib/backup';
import { sortProducts } from '../components/ProductPicker';
import { ProductEditor } from '../components/ProductEditor';
import { Sheet } from '../components/Sheet';
import { PeriodEditor } from '../components/PeriodEditor';
import { useToast } from '../components/Toast';

function NumField({ label, value, unit, onSave, step = 1 }: { label: string; value: number; unit: string; onSave: (n: number) => void; step?: number }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="unit-input">
        <input
          className="input"
          type="number"
          inputMode="decimal"
          step={step}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => { const n = Number(v); if (v !== '' && n > 0) onSave(n); else setV(String(value)); }}
        />
        <em>{unit}</em>
      </div>
    </label>
  );
}

function TimeField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="time" value={value} onChange={(e) => e.target.value && onSave(e.target.value)} />
    </label>
  );
}

export function SettingsScreen({ data }: { data: AppData }) {
  const { settings } = data;
  const toast = useToast();
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [editingEx, setEditingEx] = useState<Exercise | 'new' | null>(null);
  const [newExMenu, setNewExMenu] = useState<'A' | 'B'>('A');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void requestPersistence().then(setStorage); }, []);

  const set = (patch: Partial<Settings>) => void patchSettings(patch);

  const doExport = async () => {
    const backup = await exportBackup(db);
    const name = backupFileName();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    // iPhone では共有シートから「ファイルに保存」できる
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('バックアップを書き出しました');
  };

  const doImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      const when = new Date(backup.exportedAt).toLocaleString('ja-JP');
      if (!window.confirm(`${when} のバックアップで、今のデータをすべて置き換えます。よろしいですか？`)) return;
      await importBackup(db, backup);
      toast('バックアップから復元しました');
    } catch (e) {
      window.alert(`復元できませんでした：${(e as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleWeekday = (w: number) => {
    const s = new Set(settings.trainWeekdays);
    if (s.has(w)) s.delete(w);
    else s.add(w);
    set({ trainWeekdays: [...s].sort() });
  };

  const menuEditor = (key: 'menuA' | 'menuB', title: string) => {
    const ids = settings[key];
    const move = (i: number, d: number) => {
      const next = [...ids];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      set({ [key]: next });
    };
    const candidates = [...data.exercises.values()].filter((e) => !ids.includes(e.id));
    return (
      <div className="stack">
        <h3 className="card-title" style={{ fontSize: 15 }}>{title}</h3>
        <div>
          {ids.map((id, i) => {
            const ex = data.exercises.get(id);
            return (
              <div key={id} className="list-row">
                <button className="grow" style={{ background: 'none', border: 'none', textAlign: 'left', padding: 0, minHeight: 44, cursor: 'pointer' }} onClick={() => ex && setEditingEx(ex)}>
                  <div style={{ fontWeight: 600 }}>{ex?.name ?? '（削除された種目）'}</div>
                  {ex && <div className="muted">{ex.repMin}〜{ex.repMax}回 × {ex.sets}　代替：{ex.altId ? data.exercises.get(ex.altId)?.name ?? 'なし' : 'なし'}</div>}
                </button>
                <button className="icon-btn" aria-label="上へ" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="icon-btn" aria-label="下へ" disabled={i === ids.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="icon-btn" aria-label="メニューから外す" onClick={() => set({ [key]: ids.filter((x) => x !== id) })}>✕</button>
              </div>
            );
          })}
        </div>
        <select
          className="input"
          value=""
          onChange={(e) => {
            if (e.target.value === '__new') { setNewExMenu(key === 'menuA' ? 'A' : 'B'); setEditingEx('new'); }
            else if (e.target.value) set({ [key]: [...ids, e.target.value] });
          }}
          aria-label={`${title}に種目を追加`}
        >
          <option value="">＋ 種目を追加…</option>
          {candidates.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          <option value="__new">新しい種目を作る</option>
        </select>
      </div>
    );
  };

  return (
    <div className="screen">
      <h1 className="page-title">設定</h1>

      <section className="card">
        <h2 className="card-title">期間（いつからいつまで）</h2>
        <PeriodEditor key={`${settings.startDate}|${settings.goalDate}`} settings={settings} />
      </section>

      <section className="card">
        <h2 className="card-title">1日の目標</h2>
        <div className="grid2">
          <NumField label="トレ日 カロリー" value={settings.trainKcal} unit="kcal" onSave={(n) => set({ trainKcal: n })} />
          <NumField label="トレ日 たんぱく質" value={settings.trainProtein} unit="g" onSave={(n) => set({ trainProtein: n })} />
          <NumField label="休養日 カロリー" value={settings.restKcal} unit="kcal" onSave={(n) => set({ restKcal: n })} />
          <NumField label="休養日 たんぱく質" value={settings.restProtein} unit="g" onSave={(n) => set({ restProtein: n })} />
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">筋トレの曜日と時間</h2>
        <p className="muted">選んだ曜日に、メニューAとBを交互に入れます。</p>
        <div className="weekday-picker" role="group" aria-label="トレの曜日">
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <button key={w} aria-pressed={settings.trainWeekdays.includes(w)} onClick={() => toggleWeekday(w)}>{WEEKDAY_LABEL[w]}</button>
          ))}
        </div>
        <div className="grid2">
          <TimeField label="ジム（いつもの時間）" value={settings.gymTime} onSave={(v) => set({ gymTime: v })} />
          <NumField label="休憩タイマー" value={settings.restSeconds} unit="秒" step={5} onSave={(n) => set({ restSeconds: Math.round(n) })} />
          <TimeField label="朝ごはん" value={settings.breakfastTime} onSave={(v) => set({ breakfastTime: v })} />
          <TimeField label="昼ごはん" value={settings.lunchTime} onSave={(v) => set({ lunchTime: v })} />
          <TimeField label="夜ごはん" value={settings.dinnerTime} onSave={(v) => set({ dinnerTime: v })} />
        </div>
        <p className="muted">ジムの時間は、今日の画面でその日だけ変えることもできます。トレ後の食事はジムの75分後に表示します。</p>
      </section>

      <section className="card">
        <h2 className="card-title">種目</h2>
        <p className="muted">種目名をタップすると、回数・やり方・代替種目を編集できます。</p>
        {menuEditor('menuA', 'メニューA（押す日）')}
        {menuEditor('menuB', 'メニューB（引く日）')}
      </section>

      <section className="card">
        <h2 className="card-title">商品（ローソン・セブン・外食）</h2>
        <p className="muted">{data.products.length}品登録（うち目安の数値 {data.products.filter((p) => p.estimate).length}品）</p>
        <button className="btn block" onClick={() => setShowProducts(true)}>商品の追加・編集・削除</button>
      </section>

      <section className="card">
        <h2 className="card-title">データ</h2>
        <p className="sub" data-testid="storage-status">
          {storage === null ? '保存状態を確認中…'
            : !storage.supported ? 'このブラウザは永続保存の要求に対応していません。こまめにバックアップしてください。'
            : storage.persisted ? '✓ 永続保存が有効です（ブラウザが自動でデータを消しません）'
            : '永続保存が許可されていません。ホーム画面に追加して使うと許可されやすくなります。念のため定期的にバックアップしてください。'}
        </p>
        {storage?.usage != null && <p className="muted">使用量 約{Math.max(1, Math.round(storage.usage / 1024))}KB</p>}
        <button className="btn primary block" onClick={doExport}>JSONでバックアップを書き出す</button>
        <button className="btn block" onClick={() => fileRef.current?.click()}>バックアップから復元</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          data-testid="restore-input"
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
        <p className="muted">データはこの端末のブラウザの中（IndexedDB）にだけ保存されます。機種変更の前には必ず書き出してください。</p>
      </section>

      {showProducts && <ProductManager products={data.products} onClose={() => setShowProducts(false)} />}
      {editingEx && (
        <ExerciseEditor
          exercise={editingEx === 'new' ? undefined : editingEx}
          all={[...data.exercises.values()]}
          onClose={() => setEditingEx(null)}
          onCreated={(id) => {
            const key = newExMenu === 'A' ? 'menuA' : 'menuB';
            set({ [key]: [...settings[key], id] });
          }}
        />
      )}
    </div>
  );
}

function ProductManager({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  return (
    <>
      <Sheet title="商品の管理" onClose={onClose} footer={<button className="btn primary block" onClick={() => setEditing('new')}>＋ 商品を追加</button>}>
        <div className="plist">
          {sortProducts(products).map((p) => (
            <div key={p.id} className="prow">
              <button className="main" onClick={() => setEditing(p)}>
                <span className="name"><span>{p.name}</span>{p.estimate && <span className="badge-est">目安</span>}</span>
                <span className="nut">{STORE_LABEL[p.store]}・{p.category}・{fmtNut(p)}</span>
              </button>
              <button className="icon-btn" aria-label={`${p.name}を編集`} onClick={() => setEditing(p)}>✎</button>
            </div>
          ))}
        </div>
      </Sheet>
      {editing && <ProductEditor product={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ExerciseEditor({ exercise, all, onClose, onCreated }: { exercise?: Exercise; all: Exercise[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [repMin, setRepMin] = useState(String(exercise?.repMin ?? 10));
  const [repMax, setRepMax] = useState(String(exercise?.repMax ?? 12));
  const [sets, setSets] = useState(String(exercise?.sets ?? 3));
  const [increment, setIncrement] = useState(String(exercise?.increment ?? 5));
  const [howTo, setHowTo] = useState(exercise?.howTo ?? '');
  const [altId, setAltId] = useState(exercise?.altId ?? '');
  const valid = name.trim() !== '' && Number(repMin) > 0 && Number(repMax) >= Number(repMin) && Number(sets) > 0;

  const save = async () => {
    if (!valid) return;
    const id = exercise?.id ?? newId();
    await db.exercises.put({
      id,
      name: name.trim(),
      repMin: Number(repMin),
      repMax: Number(repMax),
      sets: Math.round(Number(sets)),
      increment: Number(increment),
      howTo: howTo.trim(),
      altId: altId || undefined,
    });
    if (!exercise) onCreated(id);
    onClose();
  };

  return (
    <Sheet
      title={exercise ? '種目を編集' : '新しい種目'}
      onClose={onClose}
      short
      footer={<button className="btn primary block" disabled={!valid} onClick={save}>保存</button>}
    >
      <label className="field"><span>種目名</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="grid2">
        <label className="field"><span>回数（下限）</span><input className="input" type="number" inputMode="numeric" value={repMin} onChange={(e) => setRepMin(e.target.value)} /></label>
        <label className="field"><span>回数（上限）</span><input className="input" type="number" inputMode="numeric" value={repMax} onChange={(e) => setRepMax(e.target.value)} /></label>
        <label className="field"><span>セット数</span><input className="input" type="number" inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} /></label>
        <label className="field"><span>増やす重さ</span>
          <select className="input" value={increment} onChange={(e) => setIncrement(e.target.value)}>
            <option value="2.5">+2.5kg（小さい種目）</option>
            <option value="5">+5kg</option>
            <option value="1">+1kg</option>
          </select>
        </label>
      </div>
      <label className="field"><span>やり方（シートの合わせ方と動かし方）</span>
        <textarea className="input" rows={3} value={howTo} onChange={(e) => setHowTo(e.target.value)} />
      </label>
      <label className="field"><span>マシンが空いていないときの代替種目</span>
        <select className="input" value={altId} onChange={(e) => setAltId(e.target.value)}>
          <option value="">なし</option>
          {all.filter((e) => e.id !== exercise?.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </label>
    </Sheet>
  );
}
