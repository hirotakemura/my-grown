// レシート写真の文字読み取り。Tesseract.js を端末の中だけで動かす（写真は外に送らない）。
// 本体と日本語データは public/ocr に同梱（scripts/copy-ocr-assets.mjs）。

import { cleanOcrText, parseReceipt, sumItems } from './receipt';

export type OcrProgress = (label: string, ratio: number) => void;

export interface OcrOptions {
  /** 読み取り前にそろえる横幅（px） */
  width?: number;
  /** 影に強い白黒化をするか */
  binarize?: boolean;
  /** Tesseract のページ分割モード */
  psm?: string;
}

/**
 * 影や照明のムラに強い白黒化（周りの明るさと比べて暗いところだけを黒にする）。
 * 周りより少しでも暗ければ文字とみなすので、薄い印字も残る。
 */
export function adaptiveBinarize(gray: Uint8ClampedArray | Uint8Array, w: number, h: number, win: number, t = 0.05, minDiff = 8): Uint8Array {
  // 積分画像で、各点のまわり win×win の平均を一定時間で求める
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  const out = new Uint8Array(w * h);
  const r = win >> 1;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const g = gray[y * w + x];
      // 紙のざらつきを文字と間違えないよう、明るさの差が小さすぎるところは白にする
      out[y * w + x] = g < mean * (1 - t) && mean - g > minDiff ? 0 : 255;
    }
  }
  return out;
}

/** 読み取りやすいように、大きさをそろえて白黒にする */
async function prepareImage(file: Blob, opts: Required<OcrOptions>): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = opts.width / bitmap.width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  if (!opts.binarize) ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  if (!opts.binarize) return canvas;

  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = (px[i * 4] * 77 + px[i * 4 + 1] * 150 + px[i * 4 + 2] * 29) >> 8;
  const bw = adaptiveBinarize(gray, w, h, Math.max(15, Math.round(w / 40) | 1));
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = bw[i];
    px[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * 読み取り結果のもっともらしさ。品目の合計がレシートの合計と合えば、ほぼ正しく読めている。
 */
export function receiptScore(text: string): number {
  const r = parseReceipt(text);
  const sum = sumItems(r.items);
  let score = r.items.length * 2 + r.items.filter((i) => i.category !== 'other').length;
  if (r.total != null && sum > 0 && r.total === sum) score += 100;
  return score;
}

/**
 * レシートを読む。影に強い白黒化と、そのままのグレーの2通りで読み、もっともらしい方を返す
 * （1回目で合計が合えば2回目は省く）。
 */
export async function readReceipt(file: Blob, onProgress?: OcrProgress, options: OcrOptions = {}): Promise<string> {
  const passes: OcrOptions[] = options.binarize == null ? [{ binarize: true }, { binarize: false }] : [{}];
  let pass = 0;
  const report = (label: string, ratio: number) => {
    // 2回目は「もう一度」と出して、止まっているように見えないようにする
    onProgress?.(pass > 0 ? `もう一度、別の方法で${label}` : label, ratio);
  };
  report('読み取りの準備中…', 0);
  const { createWorker, OEM } = await import('tesseract.js');
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href).href;
  const worker = await createWorker('jpn', OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    // 日本語データはアプリの Service Worker がキャッシュするので、Tesseract 側では保存しない
    cacheMethod: 'none',
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') report('文字を読み取り中…', m.progress);
      else report('データを読み込み中…（初回は少し時間がかかります）', m.progress);
    },
  });
  try {
    let best = { text: '', score: -1 };
    for (; pass < passes.length; pass++) {
      const opts: Required<OcrOptions> = { width: 1800, binarize: true, psm: '6', ...options, ...passes[pass] };
      // レシートは「品名 … 金額」が1行に並ぶので、段組みに分けず行ごとに読む
      await worker.setParameters({ tessedit_pageseg_mode: opts.psm as never, preserve_interword_spaces: '1' });
      const { data } = await worker.recognize(await prepareImage(file, opts));
      const text = cleanOcrText(data.text);
      const score = receiptScore(text);
      if (score > best.score) best = { text, score };
      if (score >= 100) break;
    }
    return best.text;
  } finally {
    await worker.terminate();
  }
}
