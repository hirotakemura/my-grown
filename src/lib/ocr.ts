// レシート写真の文字読み取り。Tesseract.js を端末の中だけで動かす（写真は外に送らない）。
// 本体と日本語データは public/ocr に同梱（scripts/copy-ocr-assets.mjs）。

import { cleanOcrText } from './receipt';

export type OcrProgress = (label: string, ratio: number) => void;

/** 読み取りやすいように、白黒にして大きさをそろえる */
async function prepareImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const targetWidth = Math.min(1400, Math.max(900, bitmap.width));
  const scale = targetWidth / bitmap.width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function readReceipt(file: Blob, onProgress?: OcrProgress): Promise<string> {
  onProgress?.('読み取りの準備中…', 0);
  const [{ createWorker, OEM }, image] = await Promise.all([import('tesseract.js'), prepareImage(file)]);
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href).href;
  const worker = await createWorker('jpn', OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    // 日本語データはアプリの Service Worker がキャッシュするので、Tesseract 側では保存しない
    cacheMethod: 'none',
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.('文字を読み取り中…', m.progress);
      else onProgress?.('データを読み込み中…（初回は少し時間がかかります）', m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return cleanOcrText(data.text);
  } finally {
    await worker.terminate();
  }
}
