import { useEffect, useRef, useState } from 'react';
import type { DayRecord, ISODate } from '../types';
import { patchDay } from '../lib/actions';
import { formatMD } from '../lib/date';
import { weeklyWeight } from '../lib/plan';
import { useToast } from './Toast';

interface Props {
  date: ISODate;
  days: Map<ISODate, DayRecord>;
  inputId?: string;
}

/** その日の体重を記録する。前回の値と差も出す */
export function WeightCard({ date, days, inputId = 'weight' }: Props) {
  const toast = useToast();
  const weight = days.get(date)?.weight;
  const prev = [...days.values()]
    .filter((d) => d.date < date && d.weight != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const [w, setW] = useState(weight != null ? String(weight) : '');
  // 入力欄から離れたときと「記録」ボタンの両方で保存するので、同じ値を二重に保存しない
  const lastSaved = useRef<string | null>(null);
  useEffect(() => setW(weight != null ? String(weight) : ''), [weight, date]);

  const n = Number(w);
  const valid = w !== '' && n > 20 && n < 300;
  const changed = w !== (weight != null ? String(weight) : '');

  const save = async () => {
    if (lastSaved.current === `${date}|${w}`) return;
    lastSaved.current = `${date}|${w}`;
    if (w === '' && weight != null) {
      await patchDay(date, { weight: undefined });
      toast('体重の記録を消しました');
      return;
    }
    if (!valid || !changed) {
      lastSaved.current = null;
      return;
    }
    const value = Math.round(n * 10) / 10;
    await patchDay(date, { weight: value });
    toast(`${formatMD(date)} の体重 ${value}kg を記録しました`);
  };

  const diff = weight != null && prev?.weight != null ? Math.round((weight - prev.weight) * 10) / 10 : null;

  return (
    <section className="card" data-testid="weight-card">
      <div className="card-head">
        <h2 className="card-title">体重</h2>
        {weight != null && <span className="chip ok">✓ 記録済み</span>}
      </div>
      <div className="row">
        <div className="unit-input grow">
          <input
            id={inputId}
            className="input"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={prev?.weight != null ? String(prev.weight) : '72.0'}
            value={w}
            onChange={(e) => setW(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label={`${formatMD(date)} の体重`}
          />
          <em>kg</em>
        </div>
        <button className="btn primary" disabled={!(valid && changed) && !(w === '' && weight != null)} onClick={save}>
          記録
        </button>
      </div>
      <p className="muted num">
        {prev?.weight != null ? `前回 ${formatMD(prev.date)}：${prev.weight}kg` : 'はじめての記録です'}
        {diff != null && `（${diff > 0 ? '+' : ''}${diff}kg）`}
      </p>
      <WeeklyWeight date={date} days={days} />
      <p className="muted">毎朝、トイレのあと・食べる前に量ると比べやすいです。体重は1日で1kgくらい上下するので、週の平均で見ます。</p>
    </section>
  );
}

/** 直近7日と前の7日の平均。2週続けて下がっていなければ、目標カロリーを少し下げる目安 */
function WeeklyWeight({ date, days }: Props) {
  const { thisWeek, lastWeek, diff } = weeklyWeight(date, days);
  if (!thisWeek) return null;
  return (
    <div className="weekly-weight num" data-testid="weekly-weight">
      <div><span className="muted">直近7日の平均</span><b>{thisWeek.avg}kg</b><span className="muted">（{thisWeek.count}日分）</span></div>
      {lastWeek && (
        <div>
          <span className="muted">前の7日</span><b>{lastWeek.avg}kg</b>
          <span className={diff! < 0 ? 'ok-text' : diff! > 0 ? 'warn-text' : 'muted'}>{diff! > 0 ? '+' : ''}{diff}kg</span>
        </div>
      )}
    </div>
  );
}
