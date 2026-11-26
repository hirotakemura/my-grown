import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../hooks';
import { useNow } from '../hooks';
import type { MealItem, MealSlot } from '../types';
import { SLOT_LABEL } from '../types';
import { addDays, formatMD, minutesToTime, timeToMinutes, todayISO } from '../lib/date';
import {
  dayStatus, goalProgress, gymTimeOf, holidayName, nextAction, POST_WORKOUT_OFFSET_MIN, slotsFor, autoDayKind,
} from '../lib/plan';
import { TodaySummary, type TodayMode } from '../components/TodaySummary';
import { MealCard, pickLabel, type MealCardProps } from '../components/MealCard';
import { WorkoutSection } from '../components/Workout';
import { ProductPicker, type StoreFilter } from '../components/ProductPicker';

interface Props {
  data: AppData;
  date: string;
  setDate: (d: string) => void;
  /** 食事／筋トレのどちらを表示しているか（タブを移っても覚えておく） */
  mode: TodayMode;
  setMode: (m: TodayMode) => void;
  onOpenRecords: () => void;
}

export function Today({ data, date, setDate, mode, setMode, onOpenRecords }: Props) {
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

  const holiday = holidayName(date);
  const auto = autoDayKind(date);

  // 上の日付バーの高さ（「次にやること」から食事の枠へ移るとき、バーに隠れないように）
  const topRef = useRef<HTMLElement>(null);
  const [focusSlot, setFocusSlot] = useState<MealSlot | null>(null);
  const go = (next: TodayMode, slot?: MealSlot) => {
    if (next !== mode) setMode(next);
    if (slot) setFocusSlot(slot);
  };
  // 「次にやること」から食事を開いたら、その枠まで移動して少し目立たせる
  useEffect(() => {
    if (!focusSlot || mode !== 'meal') return;
    const el = document.querySelector<HTMLElement>(`[data-testid="meal-${focusSlot}"]`);
    const topH = topRef.current?.getBoundingClientRect().height ?? 0;
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topH - 12, behavior: 'smooth' });
    const id = window.setTimeout(() => setFocusSlot(null), 1600);
    return () => window.clearTimeout(id);
  }, [focusSlot, mode]);


  return (
    <div className="screen">
      <header className="topbar" ref={topRef}>
        <div className="datebar">
          <button className="btn" aria-label="前の日" onClick={() => setDate(addDays(date, -1))}>‹</button>
          <div className="date" data-testid="current-date">
            {formatMD(date)}
            <small>{date === today ? '今日' : <button className="btn small ghost" style={{ minHeight: 28, padding: '0 6px' }} onClick={() => setDate(today)}>今日に戻る</button>}{holiday ? `・${holiday}` : ''}</small>
          </div>
          <button className="btn" aria-label="次の日" onClick={() => setDate(addDays(date, 1))}>›</button>
        </div>
      </header>

      {/* 食事と筋トレはどちらも画面に残したまま隠すので、タブを移っても入力中の内容は消えない */}
      <div className="panel" hidden={mode !== 'meal'}>
        <TodaySummary
          date={date}
          today={today}
          status={status}
          progress={progress}
          kind={status.kind}
          autoKind={auto}
          action={action}
          onGo={go}
          onOpenRecords={onOpenRecords}
          weight={day?.weight}
        />
      </div>

      <div id="panel-meal" className="panel" hidden={mode !== 'meal'}>
        {ordered.map((slot) => <MealCard key={slot} {...mealProps(slot)} focused={focusSlot === slot} />)}
      </div>

      <div id="panel-workout" className="panel" hidden={mode !== 'workout'}>
        <WorkoutSection
          date={date}
          menu={status.menu}
          day={day}
          settings={settings}
          exercises={data.exercises}
          sets={data.sets}
          plannedSets={status.plannedSets}
        />
      </div>

      {picker && (
        <ProductPicker
          date={date}
          slot={picker.slot}
          title={`${SLOT_LABEL[picker.slot]}：${pickLabel()}`}
          initial={picker.initial}
          initialStore={picker.store}
          products={data.products}
          mySets={data.mySets}
          meals={data.meals}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
