import type { Progress } from '../lib/plan';
import { dateRange, formatMD } from '../lib/date';
import type { Settings } from '../types';

export function GoalCard({ progress, settings, today }: { progress: Progress; settings: Settings; today: string }) {
  const hit = new Map(progress.statuses.map((s) => [s.date, s.achieved]));
  const all = dateRange(settings.startDate, settings.goalDate);
  return (
    <section className="card" data-testid="goal">
      <div className="card-head">
        <h2 className="card-title">ゴール {formatMD(settings.goalDate)}</h2>
        <span className="muted">開始 {formatMD(settings.startDate)}</span>
      </div>
      <div className="goal-stats">
        <div className="stat"><b data-testid="days-left">{progress.daysLeft}</b>日<span>ゴールまで</span></div>
        <div className="stat"><b>{progress.achievedDays}</b>日<span>達成した日</span></div>
        <div className="stat"><b>{progress.streak}</b>日<span>連続記録</span></div>
      </div>
      <div className="cells" role="img" aria-label={`${all.length}日中${progress.achievedDays}日達成`}>
        {all.map((d) => {
          const cls = d > today ? 'future' : hit.get(d) ? 'hit' : d === today ? '' : 'miss';
          return <div key={d} className={`cell ${cls} ${d === today ? 'today' : ''}`} title={formatMD(d)} />;
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--accent)' }} />達成</span>
        <span><i style={{ background: 'var(--cell-miss)' }} />未達成</span>
        <span>たんぱく質9割以上＋トレ日はセット8割以上／2日続けて未達成で連続記録リセット</span>
      </div>
    </section>
  );
}
