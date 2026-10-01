// 画面の中で使う小さなアイコン（出社日・休日・重さを上げる）を、元画像（assets/ui/*.png）から作る。
// 白い背景のまま絵の部分を正方形に切り出して縮小する（白い物の絵なので背景は抜かず、画面では白い角丸のタイルとして出す）。
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
    // 絵の範囲：白い背景（ほぼ真っ白で色のない所）ではない画素の範囲
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const mn = Math.min(px[i], px[i + 1], px[i + 2]), mx = Math.max(px[i], px[i + 1], px[i + 2]);
        if (mn < 225 || mx - mn > 20) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      }
    }
    // 絵の部分を正方形に切り出し（少し余白）
    const side = Math.max(x1 - x0, y1 - y0) * 1.12;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let cur = c, cw = side;
    const crop = document.createElement('canvas');
    crop.width = crop.height = Math.round(side);
    const cx2 = crop.getContext('2d');
    cx2.fillStyle = '#fff';
    cx2.fillRect(0, 0, side, side);
    cx2.drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, side, side);
    cur = crop;
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
