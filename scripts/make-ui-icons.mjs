// 画面の中で使う小さなアイコン（出社日・休日・重さを上げる）を、元画像（assets/ui/*.png）から作る。
// 元画像は赤紫（#FF00FF）一色の背景で描いてもらい、その赤紫を透明にする（クロマキー）。
// 絵の部分を正方形に切り出し、96px に縮小する。
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const SIZE = 96; // 画面では 24〜28px で表示（3倍の解像度）
const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync('src/assets/ui', { recursive: true });

for (const file of readdirSync('assets/ui').filter((f) => f.endsWith('.png'))) {
  const src = `data:image/png;base64,${readFileSync(`assets/ui/${file}`).toString('base64')}`;
  const out = await page.evaluate(async ({ src, SIZE }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const w = img.width, h = img.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      // 赤紫らしさ：赤と青が強く、緑が弱いほど大きい（背景で約255、白や緑の絵では0以下）
      const m = Math.min(r, b) - g;
      const a = Math.max(0, Math.min(1, 1 - (m - 30) / 200));
      if (a <= 0.02) { px[i + 3] = 0; continue; }
      if (a < 1) {
        // 縁の色から背景の赤紫が混ざった分を取り除く（暗い背景で赤紫のふちが出ないように）
        px[i] = Math.max(0, Math.min(255, (r - (1 - a) * 255) / a));
        px[i + 1] = Math.max(0, Math.min(255, g / a));
        px[i + 2] = Math.max(0, Math.min(255, (b - (1 - a) * 255) / a));
      }
      // 残った赤紫のにじみを抑える
      const m2 = Math.min(px[i], px[i + 2]) - px[i + 1];
      if (m2 > 0) { px[i] -= m2; px[i + 2] -= m2; }
      px[i + 3] = Math.round(a * 255);
      if (a > 0.3) {
        const x = p % w, y = (p / w) | 0;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    ctx.putImageData(data, 0, 0);
    // 絵の部分を正方形に切り出し（少し余白）
    const side = Math.max(x1 - x0, y1 - y0) * 1.04;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let cur = document.createElement('canvas');
    cur.width = cur.height = Math.round(side);
    cur.getContext('2d').drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, side, side);
    let cw = side;
    // 一度に大きく縮めると粗くなるので、半分ずつ縮める
    while (cw / 2 > SIZE) {
      cw = Math.round(cw / 2);
      const n = document.createElement('canvas');
      n.width = n.height = cw;
      const nx = n.getContext('2d');
      nx.imageSmoothingQuality = 'high';
      nx.drawImage(cur, 0, 0, cw, cw);
      cur = n;
    }
    const o = document.createElement('canvas');
    o.width = o.height = SIZE;
    const ox = o.getContext('2d');
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(cur, 0, 0, SIZE, SIZE);
    return o.toDataURL('image/png');
  }, { src, SIZE });
  writeFileSync(`src/assets/ui/${file}`, Buffer.from(out.split(',')[1], 'base64'));
  console.log('wrote', file);
}
await browser.close();
