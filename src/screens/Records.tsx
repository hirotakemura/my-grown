import { useMemo, useState } from 'react';
import type { AppData } from '../hooks';
import { useToday } from '../hooks';
import { addDays, dateRange, formatMD } from '../lib/date';
import { dayStatus } from '../lib/plan';
import { bestOf, sessionsOf, totalVolume } from '../lib/progression';
import { LineChart } from '../components/LineChart';
import { g1 } from '../lib/format';

export function Records({ data }: { data: AppData }) {
  const today = useToday();

  const week = useMemo(() => {
    const dates = dateRange(addDays(today, -6), today);
    const st = dates.map((d) => dayStatus(d, data));
    const withMeals = st.filter((s) => data.meals.some((m) => m.date === s.date && m.status === 'eaten'));
    const avg = (k: 'kcal' | 'protein' | 'fat' | 'carbs') =>
      withMeals.length ? withMeals.reduce((t, s) => t + s.eaten[k], 0) / withMeals.length : null;
    return {
      achieved: st.filter((s) => s.achieved).length,
      workouts: st.filter((s) => s.doneSets > 0).length,
      avgProtein: avg('protein'),
      avgKcal: avg('kcal'),
      avgFat: avg('fat'),
      avgCarbs: avg('carbs'),
      mealDays: withMeals.length,
      days: [...st].reverse(),
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
        {week.avgKcal != null && (
          <p className="sub num">1日平均 {Math.round(week.avgKcal)}kcal・P{g1(week.avgProtein!)} F{g1(week.avgFat!)} C{g1(week.avgCarbs!)}g</p>
        )}
        {week.mealDays > 0 && week.mealDays < 7 && <p className="muted">平均は、食事を記録した{week.mealDays}日分の平均です。</p>}
      </section>

      <section className="card">
        <h2 className="card-title">日ごとのPFC</h2>
        <table className="table" data-testid="daily-pfc">
          <thead><tr><th>日付</th><th>kcal</th><th>P</th><th>F</th><th>C</th><th /></tr></thead>
          <tbody>
            {week.days.map((s) => (
              <tr key={s.date}>
                <td>{formatMD(s.date)}</td>
                <td>{s.eaten.kcal ? Math.round(s.eaten.kcal) : '—'}</td>
                <td>{s.eaten.kcal ? g1(s.eaten.protein) : '—'}</td>
                <td>{s.eaten.kcal ? g1(s.eaten.fat) : '—'}</td>
                <td>{s.eaten.kcal ? g1(s.eaten.carbs) : '—'}</td>
                <td>{s.achieved ? <span className="chip ok">達成</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">P＝たんぱく質・F＝脂質・C＝炭水化物（g）。今日の画面で日付を切り替えると、その日の食事の中身が見られます。</p>
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
