import { useState } from 'react';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

/**
 * iPhone の「テキスト認識表示」でコピーしたレシートの文字を貼り付けて読む。
 * 認識は iPhone 本体がするので、アプリ内の文字認識より正確。
 */
export function PasteReceipt({ onRead, onClose }: { onRead: (text: string) => void; onClose: () => void }) {
  const toast = useToast();
  const [text, setText] = useState('');

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t.trim()) setText(t);
      else toast('コピーされた文字がありません');
    } catch {
      toast('貼り付けできませんでした。下の欄を長押しして「ペースト」を選んでください');
    }
  };

  return (
    <Sheet
      title="レシートの文字を貼り付け"
      onClose={onClose}
      footer={
        <button className="btn primary block" disabled={!text.trim()} onClick={() => onRead(text)}>
          この文字で読み取る
        </button>
      }
    >
      <ol className="steps">
        <li>カメラか写真アプリでレシートを写す</li>
        <li>右下の <b>テキスト認識表示</b>（四角に線のボタン）を押す</li>
        <li><b>すべてを選択</b> → <b>コピー</b></li>
        <li>このアプリに戻って、下の「貼り付け」を押す</li>
      </ol>
      <button className="btn block" onClick={pasteFromClipboard}>📋 貼り付け</button>
      <label className="field">
        <span>レシートの文字</span>
        <textarea
          className="input"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ここに貼り付け（長押し →「ペースト」でも可）"
          aria-label="レシートの文字"
        />
      </label>
      <p className="muted">iPhone が読み取った文字なので、アプリ内の読み取りより正確です。写真は保存されません。</p>
    </Sheet>
  );
}
