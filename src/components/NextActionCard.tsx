import { SLOT_LABEL } from '../types';
import type { NextAction } from '../lib/plan';
import { patchDay } from '../lib/actions';
import type { WorkoutMenu } from '../types';
import { MealSuggestion, type MealCardProps } from './MealCard';

interface Props {
  action: NextAction;
  date: string;
  menu: WorkoutMenu;
  doneSets: number;
  plannedSets: number;
  proteinLeft: number;
  mealProps: (slot: MealCardProps['slot']) => MealCardProps;
  onStartGym: () => void;
}

export function NextActionCard({ action, date, menu, doneSets, plannedSets, proteinLeft, mealProps, onStartGym }: Props) {
  if (action.type === 'done') {
    return (
      <section className="card highlight" data-testid="next-action">
        <div className="eyebrow">次にやること</div>
        <div className="card-title">今日の予定はすべて完了！</div>
        <p className="sub">
          {proteinLeft > 0
            ? `たんぱく質があと${Math.ceil(proteinLeft)}g足りません。サラダチキン（24g）やミルクプロテイン（15g）で補いましょう。`
            : 'たんぱく質も目標に届いています。しっかり寝て回復しましょう。'}
        </p>
      </section>
    );
  }
  if (action.type === 'gym') {
    return (
      <section className="card highlight" data-testid="next-action">
        <div className="eyebrow">次にやること　{action.time}</div>
        <div className="card-title">
          ジム：メニュー{menu}（{menu === 'A' ? '押す日' : '引く日'}）
        </div>
        {action.started ? (
          <>
            <p className="sub num">トレ中：{doneSets} / {plannedSets} セット完了</p>
            <div className="btn-grid">
              <button className="btn span2" onClick={onStartGym}>種目を表示</button>
              <button className="btn primary span2" onClick={() => patchDay(date, { gymStatus: 'done' })}>トレを終える</button>
            </div>
          </>
        ) : (
          <div className="btn-grid">
            <button className="btn primary" onClick={() => { void patchDay(date, { gymStatus: 'started', menu }); onStartGym(); }}>始める</button>
            <button className="btn" onClick={() => patchDay(date, { menu: 'rest', gymStatus: undefined })}>今日は休む</button>
          </div>
        )}
      </section>
    );
  }
  const props = mealProps(action.slot);
  return (
    <section className="card highlight" data-testid="next-action">
      <div className="eyebrow">次にやること　{action.time}　{SLOT_LABEL[action.slot]}ごはん</div>
      <MealSuggestion {...props} />
    </section>
  );
}
