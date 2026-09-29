// レシート読み取り（Tesseract.js）の本体と日本語データを public/ocr にコピーする。
// CDN に頼らずアプリと一緒に配信するので、2回目以降はオフラインでも読み取れる。
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = 'public/ocr';
mkdirSync(join(out, 'core'), { recursive: true });
mkdirSync(join(out, 'lang'), { recursive: true });

const tesseractDist = join(dirname(require.resolve('tesseract.js/package.json')), 'dist');
cpSync(join(tesseractDist, 'worker.min.js'), join(out, 'worker.min.js'));

// LSTM のみ使うので lstm 版のコアだけ（端末に合わせて1つだけ読み込まれる）
const core = dirname(require.resolve('tesseract.js-core/package.json'));
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) {
  cpSync(join(core, f), join(out, 'core', f));
}

const lang = join(dirname(require.resolve('@tesseract.js-data/jpn/package.json')), '4.0.0_best_int', 'jpn.traineddata.gz');
if (!existsSync(lang)) throw new Error('jpn.traineddata.gz が見つかりません');
cpSync(lang, join(out, 'lang', 'jpn.traineddata.gz'));
console.log('OCR assets copied to', out);
