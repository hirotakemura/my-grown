import { useEffect, useRef, useState } from 'react';
import type { DayRecord, Exercise, Settings, WorkoutMenu, WorkoutSet } from '../types';
import { gymTimeOf, menuExerciseIds } from '../lib/plan';
import { lastSession, isPersonalBest, suggestWeight } from '../lib/progression';
import { patchDay, saveSet, setId } from '../lib/actions';
import { formatMD } from '../lib/date';
import { useRestTimer } from './RestTimer';
import { useToast } from './Toast';

interface Props {
  date: string;
  menu: WorkoutMenu;
  day?: DayRecord;
  settings: Settings;
  exercises: Map<string, Exercise>;
  sets: WorkoutSet[];
  plannedSets: number;
}

export function WorkoutSection({ date, menu, day, settings, exercises, sets, plannedSets }: Props) {
  const ids = menuExerciseIds(settings, menu);
  const doneToday = sets.filter((s) => s.date === date && s.done).length;

  return (
    <section className="card" id="workout" data-testid="workout">
      <div className="card-head">
        <h2 className="card-title">筋トレ</h2>
        {menu !== 'rest' && <span className="chip num">{doneToday} / {plannedSets} セット</span>}
      </div>
      <div className="seg tall" role="group" aria-label="メニュー">
        {(['A', 'B', 'rest'] as const).map((m) => (
          <button key={m} aria-pressed={menu === m} onClick={() => patchDay(date, { menu: m })}>
            {m === 'rest' ? '休み' : `メニュー${m}`}
          </button>
        ))}
      </div>
      {menu === 'rest' ? (
        <p className="sub">今日は休養日。たんぱく質をしっかりとって回復に回しましょう。</p>
      ) : (
        <>
          <div className="row">
            <span className="grow sub">{menu === 'A' ? '押す日（脚・胸・肩・三頭）' : '引く日（もも裏・背中・胸・肩・二頭）'}</span>
            <label className="row" style={{ gap: 4 }}>
              <span className="muted">ジム</span>
              <input
                className="input"
                type="time"
                style={{ width: 132 }}
                value={gymTimeOf(settings, day)}
                onChange={(e) => e.target.value && patchDay(date, { gymTime: e.target.value })}
                aria-label="この日のジムの時間"
              />
            </label>
          </div>
          {ids.map((id) => {
            const main = exercises.get(id);
            if (!main) return null;
            const effId = day?.swaps?.[id] ?? id;
            const ex = exercises.get(effId) ?? main;
            return (
              <ExerciseCard
                key={id}
                date={date}
                menu={menu}
                main={main}
                ex={ex}
                alt={main.altId ? exercises.get(main.altId) : undefined}
                day={day}
                sets={sets}
                settings={settings}
                plannedSets={plannedSets}
              />
            );
          })}
          {day?.gymStatus === 'started' && (
            <button className="btn primary block" onClick={() => patchDay(date, { gymStatus: 'done' })}>トレを終える</button>
          )}
          {day?.gymStatus === 'done' && <p className="chip ok" style={{ alignSelf: 'flex-start' }}>✓ トレ完了</p>}
        </>
      )}
    </section>
  );
}

interface CardProps {
  date: string;
  menu: WorkoutMenu;
  main: Exercise;
  ex: Exercise;
  alt?: Exercise;
  day?: DayRecord;
  sets: WorkoutSet[];
  settings: Settings;
  plannedSets: number;
}

function ExerciseCard({ date, menu, main, ex, alt, day, sets, settings, plannedSets }: CardProps) {
  const toast = useToast();
  const timer = useRestTimer();
  const last = lastSession(ex.id, date, sets);
  const sug = suggestWeight(ex, last);
  const swapped = ex.id !== main.id;
  const todays = sets.filter((s) => s.date === date && s.exerciseId === ex.id);

  const toggleSwap = () => {
    const swaps = { ...day?.swaps };
    if (swapped) delete swaps[main.id];
    else if (alt) swaps[main.id] = alt.id;
    void patchDay(date, { swaps });
  };

  const onDone = async (set: WorkoutSet) => {
    const previous = sets.filter((s) => s.done && s.exerciseId === set.exerciseId && s.id !== set.id && s.date <= date);
    const pb = isPersonalBest(set, previous);
    await saveSet(set);
    // 予定の全セットが終わったら自動で完了にする
    const doneAfter = sets.filter((s) => s.date === date && s.done && s.id !== set.id).length + 1;
    await patchDay(date, { menu, gymStatus: doneAfter >= plannedSets ? 'done' : 'started' });
    timer.start(settings.restSeconds);
    if (pb) toast(`🏆 自己ベスト更新！ ${ex.name} ${set.weight}kg × ${set.reps}回`, 'pb');
  };

  return (
    <div className="ex-card" data-testid={`exercise-${ex.id}`}>
      <div className="row">
        <div className="grow">
          <div className="ex-name">{ex.name}</div>
          <div className="muted">{ex.repMin}〜{ex.repMax}回 × {ex.sets}セット{swapped ? `（${main.name}の代わり）` : ''}</div>
        </div>
      </div>
      {last ? (
        <div className="sub num">
          前回 {formatMD(last.date)}：{last.sets.map((s) => `${s.weight}kg×${s.reps}`).join(' / ')}
        </div>
      ) : null}
      <div className={`suggest ${sug.increase ? 'up' : ''}`}>{sug.increase ? '⬆ ' : ''}{sug.text}</div>
      <details>
        <summary>やり方</summary>
        <p className="sub">{ex.howTo}</p>
      </details>
      {Array.from({ length: ex.sets }, (_, i) => {
        const stored = todays.find((s) => s.index === i);
        // 前のセットで入れた重さを引き継ぐ（なければ提案の重さ）
        const prevRow = todays.filter((s) => s.index < i && s.weight != null).sort((a, b) => b.index - a.index)[0];
        const defaultWeight = sug.weight ?? null;
        return (
          <SetRow
            key={`${ex.id}-${i}`}
            date={date}
            exercise={ex}
            index={i}
            stored={stored}
            defaultWeight={stored?.weight ?? prevRow?.weight ?? defaultWeight}
            onDone={onDone}
          />
        );
      })}
      {(alt || swapped) && (
        <button className="btn small ghost" style={{ alignSelf: 'flex-start' }} onClick={toggleSwap}>
          ⇄ {swapped ? `${main.name}に戻す` : `空いていない → ${alt!.name}`}
        </button>
      )}
    </div>
  );
}

interface RowProps {
  date: string;
  exercise: Exercise;
  index: number;
  stored?: WorkoutSet;
  defaultWeight: number | null;
  onDone: (s: WorkoutSet) => Promise<void>;
}

function SetRow({ date, exercise, index, stored, defaultWeight, onDone }: RowProps) {
  const toast = useToast();
  const [weight, setWeight] = useState(stored?.weight != null ? String(stored.weight) : defaultWeight != null ? String(defaultWeight) : '');
  const [reps, setReps] = useState(stored?.reps != null ? String(stored.reps) : '');
  const repsRef = useRef<HTMLInputElement>(null);
  const done = stored?.done ?? false;

  // 前のセットの重さが決まったら、まだ触っていない行に引き継ぐ
  useEffect(() => {
    if (!stored && defaultWeight != null) setWeight((w) => (w === '' ? String(defaultWeight) : w));
  }, [defaultWeight, stored]);

  const build = (d: boolean): WorkoutSet => ({
    id: setId(date, exercise.id, index),
    date,
    exerciseId: exercise.id,
    index,
    weight: weight === '' ? null : Number(weight),
    reps: reps === '' ? null : Number(reps),
    done: d,
    doneAt: d ? Date.now() : undefined,
  });

  const persist = () => {
    if (stored || weight !== '' || reps !== '') void saveSet(build(done));
  };

  const toggle = async () => {
    if (done) {
      await saveSet(build(false));
      return;
    }
    if (weight === '' || reps === '' || Number(reps) <= 0) {
      toast(weight === '' ? '重さを入れてください' : '回数を入れてください');
      if (reps === '') repsRef.current?.focus();
      return;
    }
    await onDone(build(true));
  };

  return (
    <div className={`set-row ${done ? 'done' : ''}`}>
      <span className="idx">{index + 1}</span>
      <div className="unit-input">
        <input
          className="input"
          type="number"
          inputMode="decimal"
          step="any"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={persist}
          aria-label={`${exercise.name} ${index + 1}セット目の重さ`}
        />
        <em>kg</em>
      </div>
      <div className="unit-input">
        <input
          ref={repsRef}
          className="input"
          type="number"
          inputMode="numeric"
          value={reps}
          placeholder={`${exercise.repMin}-${exercise.repMax}`}
          onChange={(e) => setReps(e.target.value)}
          onBlur={persist}
          aria-label={`${exercise.name} ${index + 1}セット目の回数`}
        />
        <em>回</em>
      </div>
      <button className="check" aria-pressed={done} onClick={toggle} aria-label={`${index + 1}セット目を完了`}>
        ✓
      </button>
    </div>
  );
}
