import { useState } from 'react';
import { useAppData, useToday } from './hooks';
import { Today } from './screens/Today';
import { Records } from './screens/Records';
import { SettingsScreen } from './screens/SettingsScreen';
import { ToastProvider } from './components/Toast';
import { RestTimerProvider } from './components/RestTimer';

type Tab = 'today' | 'records' | 'settings';

const icons: Record<Tab, JSX.Element> = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m9 15 2 2 4-4" />
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

const labels: Record<Tab, string> = { today: '今日', records: '記録', settings: '設定' };

export default function App() {
  const data = useAppData();
  const today = useToday();
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState<string | null>(null); // null = いつも今日

  return (
    <ToastProvider>
      <RestTimerProvider>
        <div className="app">
          {!data ? (
            <p className="muted" style={{ padding: 24, textAlign: 'center' }}>読み込み中…</p>
          ) : tab === 'today' ? (
            <Today data={data} date={date ?? today} setDate={(d) => setDate(d === today ? null : d)} />
          ) : tab === 'records' ? (
            <Records data={data} />
          ) : (
            <SettingsScreen data={data} />
          )}
          <nav className="tabbar" aria-label="メイン">
            {(Object.keys(labels) as Tab[]).map((t) => (
              <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => { setTab(t); window.scrollTo(0, 0); }}>
                {icons[t]}
                {labels[t]}
              </button>
            ))}
          </nav>
        </div>
      </RestTimerProvider>
    </ToastProvider>
  );
}
