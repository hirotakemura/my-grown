import { useState } from 'react';
import { useAppData, useToday } from './hooks';
import { Today } from './screens/Today';
import { Records } from './screens/Records';
import { SettingsScreen } from './screens/SettingsScreen';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/Confirm';
import { RestTimerProvider } from './components/RestTimer';

type Tab = 'meal' | 'workout' | 'records' | 'settings';

const icons: Record<Tab, JSX.Element> = {
  meal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 3v7a3 3 0 0 0 3 3v8M7 3v6M10 3v7a3 3 0 0 1-3 3" /><path d="M17 21V3c-2.2 1.2-3.5 3.5-3.5 6.5V14H17" />
    </svg>
  ),
  workout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </svg>
  ),
  records: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
};

const labels: Record<Tab, string> = { meal: '食事', workout: '筋トレ', records: '記録', settings: '設定' };

export default function App() {
  const data = useAppData();
  const today = useToday();
  // 最初は食事。今日のトレの途中で開き直したときは筋トレから
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const tab: Tab = chosenTab ?? (data?.days.get(today)?.gymStatus === 'started' ? 'workout' : 'meal');
  const [date, setDate] = useState<string | null>(null); // null = いつも今日
  // 食事・筋トレのタブごとに、どこまでスクロールしていたかを覚えておく
  const [scrollOf] = useState<Partial<Record<Tab, number>>>({});
  const go = (next: Tab) => {
    if (next === tab) return;
    scrollOf[tab] = window.scrollY;
    setTab(next);
    requestAnimationFrame(() => window.scrollTo(0, next === 'meal' || next === 'workout' ? scrollOf[next] ?? 0 : 0));
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
      <RestTimerProvider>
        <div className="app">
          {!data ? (
            <p className="muted" style={{ padding: 24, textAlign: 'center' }}>読み込み中…</p>
          ) : tab === 'meal' || tab === 'workout' ? (
            // 食事と筋トレは同じ画面を使い回すので、タブを移っても入力中の内容は消えない
            <Today
              data={data}
              date={date ?? today}
              setDate={(d) => setDate(d === today ? null : d)}
              mode={tab}
              setMode={go}
              onOpenRecords={() => go('records')}
            />
          ) : tab === 'records' ? (
            <Records data={data} />
          ) : (
            <SettingsScreen data={data} />
          )}
          <nav className="tabbar" aria-label="メイン">
            {(Object.keys(labels) as Tab[]).map((t) => (
              <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => go(t)}>
                {icons[t]}
                {labels[t]}
              </button>
            ))}
          </nav>
        </div>
      </RestTimerProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
