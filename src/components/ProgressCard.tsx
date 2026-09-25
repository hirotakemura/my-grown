import { useEffect, useState } from 'react';
import { pfcRatio, pfcTargets, type DayStatus } from '../lib/plan';
import { patchDay } from '../lib/actions';
import { g1 } from '../lib/format';

function Meter({ label, value, target, unit, note }: { label: string; value: number; target: number; unit: string; note?: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}{note && <span className="muted">　{note}</span>}</span>
        <span className="num"><b>{unit === 'kcal' ? Math.round(value) : g1(value)}</b> / {Math.round(target)}{unit}</span>
      </div>
      <div className={`bar ${value > target * 1.05 ? 'over' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(target)} aria-label={label}>
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

  const t = pfcTargets(status.target);
  const e = status.eaten;
  const ratio = pfcRatio(e);
  const left = status.target.protein - e.protein;
  return (
    <section className="card" data-testid="progress">
      <div className="card-head">
        <h2 className="card-title">この日に食べた量（{status.menu === 'rest' ? '休養日' : 'トレ日'}の目標）</h2>
        {status.proteinOk && <span className="chip ok">たんぱく質OK</span>}
      </div>
      <Meter label="カロリー" value={e.kcal} target={t.kcal} unit="kcal" />
      <Meter label="P たんぱく質" value={e.protein} target={t.protein} unit="g" />
      <Meter label="F 脂質" value={e.fat} target={t.fat} unit="g" note="目安" />
      <Meter label="C 炭水化物" value={e.carbs} target={t.carbs} unit="g" note="目安" />
      <p className="muted num" data-testid="pfc-ratio">
        {ratio ? `PFCバランス　P ${ratio.protein}% ・ F ${ratio.fat}% ・ C ${ratio.carbs}%` : 'PFCバランスは食事を記録すると出ます'}
        　（目標 P {Math.round((t.protein * 400) / t.kcal)}% ・ F 25% ・ C {100 - 25 - Math.round((t.protein * 400) / t.kcal)}%）
      </p>
      {left > 0 && e.kcal > 0 && (
        <p className="muted">たんぱく質はあと{Math.ceil(left)}g（9割ラインまで {Math.max(0, Math.ceil(status.target.protein * 0.9 - e.protein))}g）</p>
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
            onChange={(ev) => setW(ev.target.value)}
            onBlur={save}
            onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
          />
          <em>kg</em>
        </div>
      </div>
    </section>
  );
}
