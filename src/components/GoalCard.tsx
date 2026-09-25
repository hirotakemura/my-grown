import { useState } from 'react';
import type { Progress } from '../lib/plan';
import { dateRange, diffDays, formatMD } from '../lib/date';
import type { Settings } from '../types';
import { Sheet } from './Sheet';
import { PeriodEditor } from './PeriodEditor';

export function GoalCard({ progress, settings, today }: { progress: Progress; settings: Settings; today: string }) {
  const [editing, setEditing] = useState(false);
  const hit = new Map(progress.statuses.map((s) => [s.date, s.achieved]));
  const all = dateRange(settings.startDate, settings.goalDate);
  const notStarted = today < settings.startDate;
  const finished = today > settings.goalDate;

  return (
    <section className="card" data-testid="goal">
      <div className="card-head">
        <div>
          <h2 className="card-title">ゴール {formatMD(settings.goalDate)}</h2>
          <div className="muted" data-testid="period">{formatMD(settings.startDate)}〜{formatMD(settings.goalDate)}（{all.length}日間）</div>
        </div>
        <button className="btn small" onClick={() => setEditing(true)}>期間を変更</button>
      </div>
      <div className="goal-stats">
        {notStarted ? (
          <div className="stat"><b data-testid="days-left">{diffDays(today, settings.startDate)}</b>日<span>開始まで</span></div>
        ) : finished ? (
          <div className="stat"><b data-testid="days-left">終了</b><span>おつかれさま</span></div>
        ) : (
          <div className="stat"><b data-testid="days-left">{progress.daysLeft}</b>日<span>ゴールまで</span></div>
        )}
        <div className="stat"><b>{progress.achievedDays}</b>日<span>達成した日</span></div>
        <div className="stat"><b>{progress.streak}</b>日<span>連続記録</span></div>
      </div>
      {finished && (
        <p className="note">期間が終わりました。{all.length}日中{progress.achievedDays}日達成。続けるなら「期間を変更」で次のゴールを決めましょう。</p>
      )}
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
      {editing && (
        <Sheet title="期間を変更" onClose={() => setEditing(false)} short>
          <PeriodEditor settings={settings} onSaved={() => setEditing(false)} />
        </Sheet>
      )}
    </section>
  );
}
