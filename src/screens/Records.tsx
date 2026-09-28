import { useMemo, useState } from 'react';
import type { AppData } from '../hooks';
import { useToday } from '../hooks';
import { addDays, dateRange, formatMD } from '../lib/date';
import { dayStatus } from '../lib/plan';
import { bestOf, sessionsOf } from '../lib/progression';
import { LineChart } from '../components/LineChart';
import { WeightCard } from '../components/WeightCard';
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

  // 種目ごとの推移：メニューA／B／それ以外（代替種目など）に分けてボタンで選ぶ
  const doneSets = data.sets.filter((s) => s.done);
  const trainedIds = new Set(doneSets.map((s) => s.exerciseId));
  const { menuA, menuB } = data.settings;
  const exGroups = [
    { label: 'メニューA（押す日）', ids: menuA },
    { label: 'メニューB（引く日）', ids: menuB },
    { label: '代替・その他', ids: [...trainedIds].filter((id) => !menuA.includes(id) && !menuB.includes(id)) },
  ].filter((g) => g.ids.some((id) => data.exercises.has(id)));
  // 最初は最後にトレした種目を選んでおく
  const lastTrainedId = [...doneSets].sort((a, b) => (a.date === b.date ? (a.doneAt ?? 0) - (b.doneAt ?? 0) : a.date < b.date ? -1 : 1)).pop()?.exerciseId;
  const [exId, setExId] = useState<string>('');
  const current = data.exercises.get(exId) ?? (lastTrainedId ? data.exercises.get(lastTrainedId) : undefined);
  const sessions = current ? sessionsOf(current.id, data.sets) : [];
  const latestBest = (id: string) => {
    const s = sessionsOf(id, data.sets);
    return s.length ? bestOf(s[s.length - 1].sets) : undefined;
  };

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

      <WeightCard date={today} days={data.days} inputId="weight-records" />

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">体重の推移</h2>
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
        {trainedIds.size === 0 ? (
          <p className="muted">セットを完了すると、ここに重さと回数の推移が出ます。</p>
        ) : (
          <>
            {exGroups.map((g) => (
              <div key={g.label} className="stack" style={{ gap: 6 }}>
                <div className="muted">{g.label}</div>
                <div className="ex-chips" role="group" aria-label={g.label}>
                  {g.ids.map((id) => {
                    const ex = data.exercises.get(id);
                    if (!ex) return null;
                    const best = latestBest(id);
                    return (
                      <button
                        key={id}
                        className="ex-chip"
                        aria-pressed={current?.id === id}
                        disabled={!trainedIds.has(id)}
                        onClick={() => setExId(id)}
                      >
                        {ex.name}
                        <small>{best ? `前回 ${best.weight}kg×${best.reps}` : '記録なし'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {current && <h3 className="card-title" style={{ fontSize: 15, marginTop: 4 }}>{current.name}</h3>}
            {current && sessions.length > 0 && <LineChart
              label={`${current.name}の最高重量`}
              unit="kg"
              points={sessions.map((s) => {
                const b = bestOf(s.sets)!;
                return { date: s.date, value: b.weight, note: `最高 ${b.weight}kg×${b.reps}回` };
              })}
            />}
            <table className="table" data-testid="exercise-history">
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
    </div>
  );
}
