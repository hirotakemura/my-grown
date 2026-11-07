import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** 実行ボタンの文字（例：「外す」「削除する」） */
  confirmLabel: string;
  /** 消す・置き換えるなど、元に戻しにくい操作は赤いボタンにする */
  danger?: boolean;
}

type Ask = (o: ConfirmOptions) => Promise<boolean>;
const Ctx = createContext<Ask>(async () => false);
/** 「本当に〜しますか？」をアプリ内のポップアップで聞く。押されたボタンで true / false が返る */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const ask = useCallback<Ask>((o) => new Promise((resolve) => setCurrent({ ...o, resolve })), []);
  const close = (ok: boolean) => {
    current?.resolve(ok);
    setCurrent(null);
  };
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!current) return;
    // 誤タップで消さないよう、最初は「キャンセル」に合わせる
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <Ctx.Provider value={ask}>
      {children}
      {current && (
        <div className="confirm-backdrop" onClick={(e) => e.target === e.currentTarget && close(false)}>
          <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={current.message ? 'confirm-message' : undefined}>
            <h2 id="confirm-title">{current.title}</h2>
            {current.message && <p id="confirm-message">{current.message}</p>}
            <div className="confirm-actions">
              <button ref={cancelRef} className="btn" onClick={() => close(false)}>キャンセル</button>
              <button className={`btn ${current.danger ? 'destructive' : 'primary'}`} onClick={() => close(true)}>{current.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
