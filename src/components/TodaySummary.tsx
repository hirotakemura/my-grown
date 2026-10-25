import dayWorkIcon from '../assets/ui/day-work.png';
import dayOffIcon from '../assets/ui/day-off.png';
import { SLOT_LABEL, type DayKind, type MealSlot } from '../types';
import { PROTEIN_RATIO, pfcRatio, pfcTargets, type DayStatus, type NextAction, type Progress } from '../lib/plan';
import { patchDay } from '../lib/actions';
import { g1 } from '../lib/format';

export type TodayMode = 'meal' | 'workout';

/** カロリー・PFC の棒グラフ1本 */
export function Meter({ label, value, target, unit, note }: { label: string; value: number; target: number; unit: string; note?: string }) {
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

/** 大きな数字＋残り＋細い棒（カロリー・たんぱく質） */
function BigNumber({ label, value, target, unit, line }: { label: string; value: number; target: number; unit: string; line?: number }) {
  const left = target - value;
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const shown = unit === 'kcal' ? Math.round(value) : g1(value);
  return (
    <div className="sum-num">
      <span className="sum-label">{label}</span>
      <span className="num"><b>{shown}</b><small> / {Math.round(target)}{unit}</small></span>
      <div className={`bar thin ${value > target * 1.05 ? 'over' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(target)} aria-label={label}>
        <div style={{ width: `${pct}%` }} />
        {line != null && <i className="bar-line" style={{ left: `${line * 100}%` }} aria-hidden />}
      </div>
      <span className={`sum-left num ${left < 0 ? 'over' : ''}`}>
        {left >= 0 ? `あと ${unit === 'kcal' ? Math.round(left) : g1(left)}${unit}` : `${unit === 'kcal' ? Math.round(-left) : g1(-left)}${unit} 超え`}
      </span>
    </div>
  );
}

interface Props {
  date: string;
  today: string;
  status: DayStatus;
  progress: Progress;
  kind: DayKind;
  autoKind: DayKind;
  action: NextAction;
  /** 食事／筋トレの表示を切り替え、必要ならその食事の枠まで移動する */
  onGo: (mode: TodayMode, slot?: MealSlot) => void;
  onOpenRecords: () => void;
}

/** 今日のサマリー：達成状況・カロリー・たんぱく質・次にやること */
export function TodaySummary({ date, today, status, progress, kind, autoKind, action, onGo, onOpenRecords }: Props) {
  const t = pfcTargets(status.target);
  const e = status.eaten;
  const ratio = pfcRatio(e);
  const rest = status.menu === 'rest';
  const isToday = date === today;
  const proteinLine = Math.max(0, Math.ceil(status.target.protein * PROTEIN_RATIO - e.protein));

  return (
    <section className="card summary" data-testid="progress">
      <div className="sum-head">
        <div className="seg mini" role="group" aria-label="出社日か休日か">
          {(['work', 'off'] as const).map((k) => (
            <button key={k} aria-pressed={kind === k} onClick={() => patchDay(date, { kind: k === autoKind ? undefined : k })}>
              <img className="ui-icon" src={k === 'work' ? dayWorkIcon : dayOffIcon} alt="" />
              {k === 'work' ? '出社日' : '休日'}
            </button>
          ))}
        </div>
        <span className={`chip ${status.achieved ? 'ok' : ''}`} data-testid="today-achieved">
          {status.achieved ? (isToday ? '✓ 今日は達成' : '✓ 達成') : isToday ? 'まだ途中' : date > today ? 'これから' : '未達成'}
        </span>
      </div>

      <div className="sum-grid">
        <BigNumber label="カロリー" value={e.kcal} target={t.kcal} unit="kcal" />
        <BigNumber label="たんぱく質" value={e.protein} target={t.protein} unit="g" line={PROTEIN_RATIO} />
      </div>

      <div className="sum-status" data-testid="today-status">
        <span className={status.proteinOk ? 'ok-text' : ''}>
          {status.proteinOk ? '✓ たんぱく質OK' : `・ たんぱく質 達成まで${proteinLine}g`}
        </span>
        <span className={status.trainingOk && !rest ? 'ok-text' : ''}>
          {rest ? '・ 休養日（筋トレなし）' : `${status.trainingOk ? '✓' : '・'} 筋トレ${status.menu} ${status.doneSets}/${status.plannedSets}セット`}
        </span>
      </div>

      <NextStep action={action} date={date} menu={status.menu} doneSets={status.doneSets} plannedSets={status.plannedSets} proteinLeft={status.target.protein - e.protein} onGo={onGo} />

      <details className="sum-more">
        <summary>脂質・炭水化物・PFCバランス</summary>
        <div className="stack">
          <Meter label="F 脂質" value={e.fat} target={t.fat} unit="g" note="目安" />
          <Meter label="C 炭水化物" value={e.carbs} target={t.carbs} unit="g" note="目安" />
          <p className="muted num" data-testid="pfc-ratio">
            {ratio ? `PFCバランス　P ${ratio.protein}% ・ F ${ratio.fat}% ・ C ${ratio.carbs}%` : 'PFCバランスは食事を記録すると出ます'}
            　（目標 P {Math.round((t.protein * 400) / t.kcal)}% ・ F 25% ・ C {100 - 25 - Math.round((t.protein * 400) / t.kcal)}%）
          </p>
        </div>
      </details>

      <button className="sum-goal muted num" onClick={onOpenRecords} data-testid="goal-brief">
        ゴールまで{progress.daysLeft}日・連続{progress.streak}日・達成{progress.achievedDays}日 <span aria-hidden>›</span>
      </button>
    </section>
  );
}

interface NextProps {
  action: NextAction;
  date: string;
  menu: DayStatus['menu'];
  doneSets: number;
  plannedSets: number;
  proteinLeft: number;
  onGo: Props['onGo'];
}

/** 次にやること（1行＋ボタン） */
function NextStep({ action, date, menu, doneSets, plannedSets, proteinLeft, onGo }: NextProps) {
  if (action.type === 'done') {
    return (
      <div className="next-step" data-testid="next-action">
        <div className="grow">
          <div className="eyebrow">次にやること</div>
          <div className="next-title">今日の予定はすべて完了！</div>
          <div className="muted">
            {proteinLeft > 0 ? `たんぱく質があと${Math.ceil(proteinLeft)}g。サラダチキンやミルクプロテインで補いましょう。` : 'たんぱく質も目標に届いています。しっかり寝て回復しましょう。'}
          </div>
        </div>
      </div>
    );
  }
  if (action.type === 'gym') {
    return (
      <div className="next-step" data-testid="next-action">
        <div className="grow">
          <div className="eyebrow">次にやること　{action.time}</div>
          <div className="next-title">ジム：メニュー{menu}（{menu === 'A' ? '押す日' : '引く日'}）</div>
          {action.started && <div className="muted num">トレ中：{doneSets} / {plannedSets} セット完了</div>}
        </div>
        {action.started ? (
          <button className="btn primary small" onClick={() => onGo('workout')}>筋トレを開く</button>
        ) : (
          <div className="next-btns">
            <button className="btn primary small" onClick={() => { void patchDay(date, { gymStatus: 'started', menu }); onGo('workout'); }}>始める</button>
            <button className="btn small" onClick={() => patchDay(date, { menu: 'rest', gymStatus: undefined })}>今日は休む</button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="next-step" data-testid="next-action">
      <div className="grow">
        <div className="eyebrow">次にやること　{action.time}</div>
        <div className="next-title">{SLOT_LABEL[action.slot]}ごはん</div>
      </div>
      <button className="btn primary small" onClick={() => onGo('meal', action.slot)}>記録する</button>
    </div>
  );
}
