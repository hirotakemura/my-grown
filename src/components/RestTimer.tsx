import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface TimerApi {
  start: (seconds: number) => void;
  running: boolean;
}
const Ctx = createContext<TimerApi>({ start: () => {}, running: false });
export const useRestTimer = () => useContext(Ctx);

/** 終了時刻を持つだけのタイマー。画面が裏に回っても戻ったときに正しい残り時間になる */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [flash, setFlash] = useState(0);
  const [now, setNow] = useState(Date.now());

  const start = useCallback((seconds: number) => {
    setFinished(false);
    setEndAt(Date.now() + seconds * 1000);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (endAt === null || finished) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) {
        setFinished(true);
        setFlash((n) => n + 1);
        navigator.vibrate?.([300, 150, 300, 150, 300]);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [endAt, finished]);

  // 終了表示は少しして自動で閉じる
  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(() => { setEndAt(null); setFinished(false); }, 6000);
    return () => window.clearTimeout(id);
  }, [finished]);

  const running = endAt !== null;
  const left = endAt === null ? 0 : Math.max(0, Math.ceil((endAt - now) / 1000));

  useEffect(() => {
    document.querySelector('.app')?.classList.toggle('timer-on', running);
  }, [running]);

  return (
    <Ctx.Provider value={{ start, running }}>
      {children}
      {flash > 0 && <div key={flash} className="flash" aria-hidden />}
      {running && (
        <div className={`timer ${finished ? 'finished' : ''}`} role="timer" aria-live="assertive">
          {finished ? (
            <span className="time" style={{ fontSize: 18 }}>休憩終了！次のセットへ</span>
          ) : (
            <span className="time">
              休憩 {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
            </span>
          )}
          {!finished && (
            <button className="btn small" onClick={() => setEndAt((e) => (e ?? Date.now()) + 30_000)}>
              +30秒
            </button>
          )}
          <button className="btn small" onClick={() => { setEndAt(null); setFinished(false); }}>
            {finished ? '閉じる' : 'スキップ'}
          </button>
        </div>
      )}
    </Ctx.Provider>
  );
}
