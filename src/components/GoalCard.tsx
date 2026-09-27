import { useState } from 'react';
import { dayMark, type DayMark, type DayStatus, type Progress } from '../lib/plan';
import { dateRange, diffDays, formatMD } from '../lib/date';
import type { Settings } from '../types';
import { Sheet } from './Sheet';
import { PeriodEditor } from './PeriodEditor';

const MARK_LABEL: Record<DayMark, string> = {
  both: '両方達成',
  protein: 'たんぱく質だけ達成',
  training: '筋トレだけ達成',
  none: '未達成',
};

function DayDetail({ date, status, today }: { date: string; status?: DayStatus; today: string }) {
  if (!status) return <p className="sub" role="status">{formatMD(date)}：これからの日です</p>;
  const p = `たんぱく質 ${Math.round(status.eaten.protein)}/${status.target.protein}g ${status.proteinOk ? '○' : '×'}`;
  const t = status.menu === 'rest'
    ? '筋トレ 休養日'
    : `筋トレ ${status.doneSets}/${status.plannedSets}セット ${status.trainingOk ? '○' : '×'}`;
  return (
    <p className="sub num" role="status" data-testid="day-detail">
      {formatMD(date)}{date === today ? '（今日）' : ''}：{MARK_LABEL[dayMark(status)]}　{p}・{t}
    </p>
  );
}

export function GoalCard({ progress, settings, today }: { progress: Progress; settings: Settings; today: string }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const byDate = new Map(progress.statuses.map((s) => [s.date, s]));
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
      <div className="cells" role="group" aria-label={`${all.length}日中${progress.achievedDays}日達成`}>
        {all.map((d) => {
          const st = byDate.get(d);
          const mark = st ? dayMark(st) : undefined;
          // 今日はまだ途中なので、何も達成していなければ「未達成」の色にしない
          const cls = d > today || !st ? 'future' : mark === 'none' ? (d === today ? '' : 'miss') : mark;
          return (
            <button
              key={d}
              className={`cell ${cls} ${d === today ? 'today' : ''} ${selected === d ? 'sel' : ''}`}
              aria-label={`${formatMD(d)} ${st ? MARK_LABEL[mark!] : '予定'}`}
              onClick={() => setSelected(selected === d ? null : d)}
            />
          );
        })}
      </div>
      {selected && <DayDetail date={selected} status={byDate.get(selected)} today={today} />}
      <div className="legend">
        <span><i style={{ background: 'var(--mark-both)' }} />両方達成</span>
        <span><i style={{ background: 'var(--mark-protein)' }} />たんぱく質だけ</span>
        <span><i style={{ background: 'var(--mark-training)' }} />筋トレだけ</span>
        <span><i style={{ background: 'var(--cell-miss)' }} />未達成</span>
      </div>
      <p className="muted">
        マスをタップするとその日の内訳が出ます。たんぱく質は目標の9割以上、筋トレは予定セットの8割以上で達成。休養日はたんぱく質だけで「両方達成」。2日続けて未達成で連続記録リセット。
      </p>
      {editing && (
        <Sheet title="期間を変更" onClose={() => setEditing(false)} short>
          <PeriodEditor settings={settings} onSaved={() => setEditing(false)} />
        </Sheet>
      )}
    </section>
  );
}
