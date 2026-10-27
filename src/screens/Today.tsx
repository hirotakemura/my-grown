import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { ShoppingList } from '../components/ShoppingList';
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

  // 上の日付バーの高さ（切り替えボタンをその下に貼り付けるため）
  const topRef = useRef<HTMLElement>(null);
  // 切り替えボタンの本来の位置（貼り付いても動かない目印）
  const anchorRef = useRef<HTMLDivElement>(null);
  const [topH, setTopH] = useState(0);
  useLayoutEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const update = () => setTopH(el.getBoundingClientRect().height);
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // 食事／筋トレのそれぞれで、どこまでスクロールしていたかを覚えておく
  const scrollOf = useRef<Partial<Record<TodayMode, number>>>({});
  const [focusSlot, setFocusSlot] = useState<MealSlot | null>(null);
  const panelTop = () => (anchorRef.current ? Math.max(0, anchorRef.current.getBoundingClientRect().top + window.scrollY - topH) : 0);
  const switchMode = (next: TodayMode, slot?: MealSlot) => {
    if (next !== mode) {
      const top = panelTop();
      scrollOf.current[mode] = window.scrollY;
      setMode(next);
      if (!slot) {
        requestAnimationFrame(() => {
          // 切り替えボタンより上を見ていたらそのまま。下まで読み進めていたら、前にその表示で見ていた位置（なければ先頭）へ
          if (window.scrollY <= top) return;
          const saved = scrollOf.current[next];
          window.scrollTo(0, saved != null && saved > top ? saved : top);
        });
      }
    }
    if (slot) setFocusSlot(slot);
  };
  // 「次にやること」から食事を開いたら、その枠まで移動して少し目立たせる
  useEffect(() => {
    if (!focusSlot || mode !== 'meal') return;
    const el = document.querySelector<HTMLElement>(`[data-testid="meal-${focusSlot}"]`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topH - 56, behavior: 'smooth' });
    const id = window.setTimeout(() => setFocusSlot(null), 1600);
    return () => window.clearTimeout(id);
  }, [focusSlot, mode, topH]);

  const plannedLabel = status.menu === 'rest' ? '休み' : `${status.doneSets}/${status.plannedSets}`;

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

      <TodaySummary
        date={date}
        today={today}
        status={status}
        progress={progress}
        kind={status.kind}
        autoKind={auto}
        action={action}
        onGo={switchMode}
        onOpenRecords={onOpenRecords}
      />

      <div ref={anchorRef} className="mode-anchor" aria-hidden />
      <div className="mode-switch" style={{ top: topH }}>
        <div className="seg tall" role="tablist" aria-label="食事か筋トレか">
          <button role="tab" aria-selected={mode === 'meal'} aria-pressed={mode === 'meal'} aria-controls="panel-meal" onClick={() => switchMode('meal')}>
            食事
          </button>
          <button role="tab" aria-selected={mode === 'workout'} aria-pressed={mode === 'workout'} aria-controls="panel-workout" onClick={() => switchMode('workout')}>
            筋トレ <span className="seg-badge num">{plannedLabel}</span>
          </button>
        </div>
      </div>

      {/* どちらも画面に残したまま隠すので、切り替えても入力中の内容は消えない */}
      <div id="panel-meal" role="tabpanel" className="panel" hidden={mode !== 'meal'}>
        {ordered.map((slot) => <MealCard key={slot} {...mealProps(slot)} focused={focusSlot === slot} />)}
        {status.kind === 'off' && <ShoppingList date={date} days={data.days} />}
      </div>

      <div id="panel-workout" role="tabpanel" className="panel" hidden={mode !== 'workout'}>
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
