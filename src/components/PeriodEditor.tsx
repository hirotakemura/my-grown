import { useState } from 'react';
import type { Settings } from '../types';
import { addDays, diffDays, formatMD, todayISO, validatePeriod } from '../lib/date';
import { patchSettings } from '../lib/actions';
import { useToast } from './Toast';

const PRESET_WEEKS = [4, 8, 12];

/** 期間（開始日〜ゴール日）の編集。両方そろって正しいときだけ保存する */
export function PeriodEditor({ settings, onSaved }: { settings: Settings; onSaved?: () => void }) {
  const toast = useToast();
  const [start, setStart] = useState(settings.startDate);
  const [goal, setGoal] = useState(settings.goalDate);
  const error = validatePeriod(start, goal);
  const changed = start !== settings.startDate || goal !== settings.goalDate;
  const today = todayISO();

  const save = async () => {
    if (error) return;
    await patchSettings({ startDate: start, goalDate: goal });
    toast(`期間を ${formatMD(start)}〜${formatMD(goal)} にしました`);
    onSaved?.();
  };

  return (
    <div className="stack" data-testid="period-editor">
      <div className="stack">
        <label className="field"><span>開始日</span>
          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field"><span>ゴール日（期限）</span>
          <input className="input" type="date" value={goal} min={start ? addDays(start, 1) : undefined} onChange={(e) => setGoal(e.target.value)} />
        </label>
      </div>
      <div className="row wrap" role="group" aria-label="期間をまとめて決める">
        <button className="btn small" onClick={() => setStart(today)}>今日から始める</button>
        {PRESET_WEEKS.map((w) => (
          <button key={w} className="btn small" onClick={() => setGoal(addDays(start || today, w * 7 - 1))}>{w}週間</button>
        ))}
      </div>
      <p className={error ? 'sub' : 'muted'} style={error ? { color: 'var(--danger)' } : undefined} role={error ? 'alert' : undefined}>
        {error ?? `${formatMD(start)}〜${formatMD(goal)}　全${diffDays(start, goal) + 1}日間${goal >= today ? `（今日からあと${Math.max(0, diffDays(today, goal))}日）` : ''}`}
      </p>
      <p className="muted">期間を変えても、食事や筋トレの記録は消えません。達成マスと日数だけが新しい期間で数え直されます。</p>
      <button className="btn primary block" disabled={!!error || !changed} onClick={save}>この期間で保存</button>
    </div>
  );
}
