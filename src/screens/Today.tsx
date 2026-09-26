import { useMemo, useState } from 'react';
import type { AppData } from '../hooks';
import { useNow } from '../hooks';
import type { MealItem, MealSlot } from '../types';
import { SLOT_LABEL } from '../types';
import { addDays, formatMD, minutesToTime, timeToMinutes, todayISO } from '../lib/date';
import {
  dayStatus, goalProgress, gymTimeOf, holidayName, nextAction, POST_WORKOUT_OFFSET_MIN, slotsFor, autoDayKind,
} from '../lib/plan';
import { patchDay } from '../lib/actions';
import { GoalCard } from '../components/GoalCard';
import { NextActionCard } from '../components/NextActionCard';
import { ProgressCard } from '../components/ProgressCard';
import { MealCard, pickLabel, type MealCardProps } from '../components/MealCard';
import { WorkoutSection } from '../components/Workout';
import { ShoppingList } from '../components/ShoppingList';
import { ProductPicker, type StoreFilter } from '../components/ProductPicker';

interface Props {
  data: AppData;
  date: string;
  setDate: (d: string) => void;
}

export function Today({ data, date, setDate }: Props) {
  const now = useNow();
  const today = todayISO(now);
  const [picker, setPicker] = useState<{ slot: MealSlot; initial: MealItem[]; store?: StoreFilter } | null>(null);

  const { settings } = data;
  const day = data.days.get(date);
  const status = useMemo(() => dayStatus(date, data), [date, data]);
  const progress = useMemo(() => goalProgress(data, today), [data, today]);
  const productMap = useMemo(() => new Map(data.products.map((p) => [p.id, p])), [data.products]);
  const meals = data.meals.filter((m) => m.date === date);
  const slots = slotsFor(status.menu);
  const gymTime = gymTimeOf(settings, day);
  const slotTime: Record<MealSlot, string> = {
    breakfast: settings.breakfastTime,
    lunch: settings.lunchTime,
    dinner: settings.dinnerTime,
    post: minutesToTime(timeToMinutes(gymTime) + POST_WORKOUT_OFFSET_MIN),
  };
  const ordered = [...slots].sort((a, b) => timeToMinutes(slotTime[a]) - timeToMinutes(slotTime[b]));

  const action = nextAction({
    menu: status.menu,
    settings,
    day,
    meals,
    nowMinutes: date === today ? now.getHours() * 60 + now.getMinutes() : null,
  });

  const mealProps = (slot: MealSlot): MealCardProps => ({
    date,
    slot,
    time: slotTime[slot],
    kind: status.kind,
    day,
    meal: meals.find((m) => m.slot === slot),
    products: productMap,
    mySets: data.mySets,
    onPick: (s, initial, store) => setPicker({ slot: s, initial, store }),
  });

  const lastWeight = [...data.days.values()]
    .filter((d) => d.date < date && d.weight != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.weight;

  const holiday = holidayName(date);
  const auto = autoDayKind(date);

  return (
    <div className="screen">
      <header className="topbar">
        <div className="datebar">
          <button className="btn" aria-label="前の日" onClick={() => setDate(addDays(date, -1))}>‹</button>
          <div className="date" data-testid="current-date">
            {formatMD(date)}
            <small>{date === today ? '今日' : <button className="btn small ghost" style={{ minHeight: 28, padding: '0 6px' }} onClick={() => setDate(today)}>今日に戻る</button>}{holiday ? `・${holiday}` : ''}</small>
          </div>
          <button className="btn" aria-label="次の日" onClick={() => setDate(addDays(date, 1))}>›</button>
        </div>
        <div className="seg" role="group" aria-label="出社日か休日か">
          {(['work', 'off'] as const).map((k) => (
            <button
              key={k}
              aria-pressed={status.kind === k}
              onClick={() => patchDay(date, { kind: k === auto ? undefined : k })}
            >
              {k === 'work' ? '🏢 出社日（コンビニ）' : '🏠 休日（自炊）'}
            </button>
          ))}
        </div>
      </header>

      <GoalCard progress={progress} settings={settings} today={today} />

      <NextActionCard
        action={action}
        date={date}
        menu={status.menu}
        doneSets={status.doneSets}
        plannedSets={status.plannedSets}
        proteinLeft={status.target.protein - status.eaten.protein}
        mealProps={mealProps}
        onStartGym={() => document.getElementById('workout')?.scrollIntoView({ behavior: 'smooth' })}
      />

      <ProgressCard status={status} weight={day?.weight} lastWeight={lastWeight} />

      <h2 className="card-title" style={{ marginTop: 4 }}>食事</h2>
      {ordered.map((slot) => <MealCard key={slot} {...mealProps(slot)} />)}

      <WorkoutSection
        date={date}
        menu={status.menu}
        day={day}
        settings={settings}
        exercises={data.exercises}
        sets={data.sets}
        plannedSets={status.plannedSets}
      />

      {status.kind === 'off' && <ShoppingList date={date} days={data.days} />}

      {picker && (
        <ProductPicker
          date={date}
          slot={picker.slot}
          title={`${SLOT_LABEL[picker.slot]}：${pickLabel()}`}
          initial={picker.initial}
          initialStore={picker.store}
          products={data.products}
          mySets={data.mySets}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
