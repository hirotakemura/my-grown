import { useMemo, useState } from 'react';
import type { AppData } from '../hooks';
import { useToday } from '../hooks';
import { addDays, dateRange, formatMD } from '../lib/date';
import { dayStatus } from '../lib/plan';
import { bestOf, sessionsOf, totalVolume } from '../lib/progression';
import { LineChart } from '../components/LineChart';

export function Records({ data }: { data: AppData }) {
  const today = useToday();

  const week = useMemo(() => {
    const dates = dateRange(addDays(today, -6), today);
    const st = dates.map((d) => dayStatus(d, data));
    const withMeals = st.filter((s) => data.meals.some((m) => m.date === s.date && m.status === 'eaten'));
    return {
      achieved: st.filter((s) => s.achieved).length,
      workouts: st.filter((s) => s.doneSets > 0).length,
      avgProtein: withMeals.length ? withMeals.reduce((t, s) => t + s.eaten.protein, 0) / withMeals.length : null,
      mealDays: withMeals.length,
    };
  }, [data, today]);

  const weights = [...data.days.values()]
    .filter((d) => d.weight != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({ date: d.date, value: d.weight! }));

  const trained = [...data.exercises.values()].filter((e) => data.sets.some((s) => s.exerciseId === e.id && s.done));
  const [exId, setExId] = useState<string>('');
  const current = data.exercises.get(exId) ?? trained[0];
  const sessions = current ? sessionsOf(current.id, data.sets) : [];

  const volume = totalVolume(data.sets);
  const doneSets = data.sets.filter((s) => s.done).length;

  return (
    <div className="screen">
      <h1 className="page-title">記録</h1>

      <section className="card">
        <h2 className="card-title">直近7日</h2>
        <div className="goal-stats">
          <div className="stat"><b>{week.achieved}</b>/7日<span>達成</span></div>
          <div className="stat"><b>{week.workouts}</b>回<span>筋トレ</span></div>
          <div className="stat">
            <b>{week.avgProtein == null ? '—' : Math.round(week.avgProtein)}</b>g<span>平均たんぱく質</span>
          </div>
        </div>
        {week.mealDays > 0 && week.mealDays < 7 && <p className="muted">平均たんぱく質は、食事を記録した{week.mealDays}日分の平均です。</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">体重</h2>
          {weights.length >= 2 && (
            <span className="sub num">
              {weights[0].value} → {weights[weights.length - 1].value}kg（
              {(weights[weights.length - 1].value - weights[0].value > 0 ? '+' : '') + (weights[weights.length - 1].value - weights[0].value).toFixed(1)}）
            </span>
          )}
        </div>
        <LineChart points={weights} unit="kg" label="体重" />
      </section>

      <section className="card">
        <h2 className="card-title">種目ごとの推移</h2>
        {trained.length === 0 ? (
          <p className="muted">セットを完了すると、ここに重さと回数の推移が出ます。</p>
        ) : (
          <>
            <select className="input" value={current?.id} onChange={(e) => setExId(e.target.value)} aria-label="種目">
              {trained.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <LineChart
              label={`${current!.name}の最高重量`}
              unit="kg"
              points={sessions.map((s) => {
                const b = bestOf(s.sets)!;
                return { date: s.date, value: b.weight, note: `最高 ${b.weight}kg×${b.reps}回` };
              })}
            />
            <table className="table">
              <thead><tr><th>日付</th><th>セット（kg×回）</th></tr></thead>
              <tbody>
                {[...sessions].reverse().slice(0, 10).map((s) => (
                  <tr key={s.date}>
                    <td>{formatMD(s.date)}</td>
                    <td>{s.sets.map((x) => `${x.weight}×${x.reps}`).join(' / ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">これまでに持ち上げた総重量</h2>
        <div className="big" data-testid="total-volume">{Math.round(volume).toLocaleString('ja-JP')} kg</div>
        <p className="muted">完了した{doneSets}セットの「重さ×回数」の合計{volume >= 1000 ? `（約${(volume / 1000).toFixed(1)}トン）` : ''}</p>
      </section>
    </div>
  );
}
