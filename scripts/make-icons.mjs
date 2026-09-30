// アプリアイコンを元画像（assets/icon-source.png）から各サイズの PNG に書き出す。
// 縮小はブラウザ（Playwright の Chromium）の高品質な縮小を使う。
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = `data:image/png;base64,${readFileSync('assets/icon-source.png').toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();

/** size px の正方形に描く。元画像の絵が端に寄っているときは inset < 1 で Android の丸い切り抜き用に絵を小さくし、周りをぼかした背景で埋める */
async function render(size, inset = 1) {
  const dataUrl = await page.evaluate(async ({ src, size, inset }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    // 一度に大きく縮めると粗くなるので、半分ずつ縮める
    let cur = img;
    let w = img.width;
    while (w / 2 > size) {
      w = Math.round(w / 2);
      const c = document.createElement('canvas');
      c.width = c.height = w;
      const cx = c.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(cur, 0, 0, w, w);
      cur = c;
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    if (inset < 1) {
      ctx.filter = `blur(${size / 12}px)`;
      ctx.drawImage(cur, -size * 0.25, -size * 0.25, size * 1.5, size * 1.5);
      ctx.filter = 'none';
      const s = size * inset;
      const o = (size - s) / 2;
      // 縁をなじませるため、内側の絵の外周をぼかす
      const layer = document.createElement('canvas');
      layer.width = layer.height = size;
      const lx = layer.getContext('2d');
      lx.imageSmoothingQuality = 'high';
      lx.drawImage(cur, o, o, s, s);
      lx.globalCompositeOperation = 'destination-in';
      const g = lx.createRadialGradient(size / 2, size / 2, s * 0.4, size / 2, size / 2, s * 0.5);
      g.addColorStop(0, '#000');
      g.addColorStop(1, 'transparent');
      lx.fillStyle = g;
      lx.fillRect(0, 0, size, size);
      ctx.drawImage(layer, 0, 0);
    } else {
      ctx.drawImage(cur, 0, 0, size, size);
    }
    return canvas.toDataURL('image/png');
  }, { src, size, inset });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', await render(192));
writeFileSync('public/icons/icon-512.png', await render(512, 0.85));
writeFileSync('public/icons/icon-maskable-512.png', await render(512, 0.85));
writeFileSync('public/icons/apple-touch-icon.png', await render(180));
writeFileSync('public/icons/favicon.png', await render(48));
await browser.close();
console.log('icons written');
