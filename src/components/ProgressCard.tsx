import { useEffect, useState } from 'react';
import type { DayStatus } from '../lib/plan';
import { patchDay } from '../lib/actions';

function Meter({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span className="num"><b>{Math.round(value)}</b> / {target}{unit}</span>
      </div>
      <div className={`bar ${value > target * 1.05 ? 'over' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={target} aria-label={label}>
        <div style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ProgressCard({ status, weight, lastWeight }: { status: DayStatus; weight?: number; lastWeight?: number }) {
  const [w, setW] = useState(weight != null ? String(weight) : '');
  useEffect(() => setW(weight != null ? String(weight) : ''), [weight, status.date]);

  const save = () => {
    const n = Number(w);
    if (w === '') void patchDay(status.date, { weight: undefined });
    else if (n > 20 && n < 300) void patchDay(status.date, { weight: Math.round(n * 10) / 10 });
  };

  const left = status.target.protein - status.eaten.protein;
  return (
    <section className="card" data-testid="progress">
      <div className="card-head">
        <h2 className="card-title">{status.menu === 'rest' ? '休養日' : 'トレ日'}の目標</h2>
        {status.proteinOk && <span className="chip ok">たんぱく質OK</span>}
      </div>
      <Meter label="たんぱく質" value={status.eaten.protein} target={status.target.protein} unit="g" />
      <Meter label="カロリー" value={status.eaten.kcal} target={status.target.kcal} unit="kcal" />
      {left > 0 && status.eaten.kcal > 0 && (
        <p className="muted">あと{Math.ceil(left)}g（9割ラインまで {Math.max(0, Math.ceil(status.target.protein * 0.9 - status.eaten.protein))}g）</p>
      )}
      <div className="row">
        <label htmlFor="weight" className="grow" style={{ fontWeight: 600 }}>体重</label>
        <div className="unit-input" style={{ width: 140 }}>
          <input
            id="weight"
            className="input"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={lastWeight != null ? String(lastWeight) : '72.0'}
            value={w}
            onChange={(e) => setW(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <em>kg</em>
        </div>
      </div>
    </section>
  );
}
