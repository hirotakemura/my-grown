// アプリアイコン（緑の背景に白いダンベル）を PNG で書き出す。依存なしの素朴な実装。
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x / size, y / size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const GREEN = [31, 157, 85, 255];
const WHITE = [255, 255, 255, 255];
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

// scale < 1 でダンベルを中央に小さく描く（maskable の安全領域用）
const dumbbell = (scale) => (u, v) => {
  const x = 0.5 + (u - 0.5) / scale;
  const y = 0.5 + (v - 0.5) / scale;
  const hit =
    inRect(x, y, 0.3, 0.46, 0.7, 0.54) || // バー
    inRect(x, y, 0.2, 0.3, 0.3, 0.7) || inRect(x, y, 0.7, 0.3, 0.8, 0.7) || // 内側プレート
    inRect(x, y, 0.12, 0.37, 0.2, 0.63) || inRect(x, y, 0.8, 0.37, 0.88, 0.63); // 外側プレート
  return hit ? WHITE : GREEN;
};

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, dumbbell(0.9)));
writeFileSync('public/icons/icon-512.png', png(512, dumbbell(0.9)));
writeFileSync('public/icons/icon-maskable-512.png', png(512, dumbbell(0.7)));
writeFileSync('public/icons/apple-touch-icon.png', png(180, dumbbell(0.85)));
writeFileSync('public/icons/favicon.png', png(48, dumbbell(1)));
console.log('icons written');
