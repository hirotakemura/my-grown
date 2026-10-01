import type { CategoryRule, ExpenseCategory, ExpenseItem, ExpenseStore, ISODate } from '../types';

/** 全角→半角、円記号のゆれをそろえる */
export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[−–—]/g, '-')
    .replace(/[\\￥]/g, '¥');
}

const JA = '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー々〆]';
const JA_GAP = new RegExp(`(?<=${JA})[ \\t]+(?=${JA})`, 'gu');

/** 文字認識の結果は日本語の文字の間に空白が入る（「ロー ソン」）ので詰める */
export function cleanOcrText(s: string): string {
  return s.replace(JA_GAP, '');
}

/** 品名の覚え書き用のキー（空白を除いた正規化済みの品名） */
export function ruleKey(name: string): string {
  return normalizeText(name).replace(/\s+/g, '').toLowerCase();
}

// ---- 費目の自動判定 ----

const DAILY = ['ティッシュ', 'マスク', '洗剤', '電池', '歯ブラシ', '歯磨', 'シャンプー', 'レジ袋', '袋', 'ゴミ', '絆創膏', 'ハンカチ', '傘', '充電', 'ケーブル', 'ペン', 'ノート', '切手', 'はがき', '封筒', '靴下', 'シート', 'ウェット', '綿棒', '目薬', '薬'];
const DRINK_STRONG = ['コーヒー', '珈琲', 'カフェ', 'ラテ', 'お茶', '茶', 'ウォーター', '水', 'ジュース', '炭酸', 'コーラ', 'サイダー', 'ドリンク', '紅茶', '麦茶', '緑茶', '烏龍', 'ウーロン', 'スポーツ', 'アクエリ', 'ポカリ', 'エナジー', 'レッドブル', 'モンスター', 'ml', 'ボトル', 'ペット', '缶', '豆乳', '牛乳'];
const SNACK = ['チョコ', 'スナック', 'ポテトチップ', 'チップス', 'グミ', 'アイス', 'ガム', '飴', 'キャンディ', 'クッキー', 'ビスケット', 'ケーキ', 'プリン', 'シュー', 'どら焼', '大福', '菓子', 'ポッキー', 'じゃがりこ', 'ドーナツ', 'ビール', 'チューハイ', 'ハイボール', 'サワー', '酒', 'たばこ', 'タバコ', '煙草', 'スイーツ', 'パフェ', 'ゼリー', 'せんべい', 'ナッツ'];
const DRINK_WEAK = ['ミルク', 'ティー', 'ヨーグルトドリンク'];
const MEAL = ['おにぎり', 'むすび', '弁当', 'サンド', 'パン', '麺', 'そば', 'うどん', 'ラーメン', 'パスタ', 'スパゲ', 'サラダ', 'チキン', 'チキ', '鶏', '豚', '牛', '肉', '卵', 'たまご', '玉子', '焼', '煮', '豆腐', '納豆', '味噌汁', '豚汁', 'スープ', 'おでん', 'からあげ', '唐揚', 'ハンバーグ', 'ヨーグルト', 'プロテイン', 'バナナ', 'ご飯', 'ごはん', 'ライス', '丼', 'カレー', '寿司', '餃子', '惣菜', 'ブロッコリー', 'さば', '鮭', 'ツナ', 'ソーセージ', 'ウインナー', 'ハム', 'チーズ'];

const hasAny = (s: string, words: string[]) => words.some((w) => s.includes(w.toLowerCase()));

/** 品名から費目を決める。手で直した覚え書きがあればそれを優先する */
export function categorize(name: string, rules?: Map<string, ExpenseCategory>): ExpenseCategory {
  const key = ruleKey(name);
  const learned = rules?.get(key);
  if (learned) return learned;
  if (hasAny(key, DAILY)) return 'daily';
  if (hasAny(key, DRINK_STRONG)) return 'drink';
  if (hasAny(key, SNACK)) return 'snack';
  if (hasAny(key, DRINK_WEAK)) return 'drink';
  if (hasAny(key, MEAL)) return 'meal';
  return 'other';
}

export function rulesMap(rules: CategoryRule[]): Map<string, ExpenseCategory> {
  return new Map(rules.map((r) => [r.name, r.category]));
}

// ---- レシートの文字からの読み取り ----

export interface ParsedReceipt {
  store: ExpenseStore;
  date?: ISODate;
  items: ExpenseItem[];
  total?: number;
}

// 品目ではない行（合計・税・支払いなど）
const NOT_ITEM = /(合計|小計|計\s*$|税|お預|預り|釣|つり|現金|クレジット|カード|点数|ポイント|残高|支払|対象|nanaco|ナナコ|電子マネー|WAON|PASMO|Suica|交通|QR|PayPay|楽天|d払|領収|レジ\s*[\d#:No№]|責|TEL|電話|登録番号|No\.|伝票|取引|お買上|会員|ご利用|承認|端末|番号|\d{1,2}\s*:\s*\d{2}|20\d{2}\s*[年/.\-])/i;
const DISCOUNT = /(値引|割引|クーポン|引\s*$)/;
// 日付・時刻・住所・電話番号の行（金額と間違えやすい）
const INFO_LINE = /(\d\s*年\s*\d{1,2}\s*月|\d{1,2}\s*[:：]\s*\d{2}(?!\d)|\d\s*-\s*\d+\s*-\s*\d|丁目\s*\d|番地)/;
const MARKS = '軽※*＊外内税非';
// 金額の部分。文字認識で数字が化けやすいもの（0→C/O、1→l/I）も受け付ける
const AMOUNT = '-?\\s*[\\dCOoDQlI|][\\dCOoDQlI|,.\\s]*';
// 「¥」付きの金額は、後ろに印が化けた文字が2字まで付いていてもよい
const PRICE_WITH_YEN = new RegExp(`^(.*?)\\s*¥\\s*(${AMOUNT})\\s*円?\\s*[^\\d\\s]{0,2}\\s*$`);
// 「¥」なしの金額（150円 / 1,234 / -30）。後ろに付いてよいのは「軽」などの印だけ
const PRICE_PLAIN = new RegExp(`^(.*?)\\s*(-?\\s*\\d[\\d,]*)\\s*円?\\s*[${MARKS}]*\\s*$`);

/** 化けた数字を直して数にする。読めなければ NaN */
function toNumber(s: string): number {
  const t = s
    .replace(/[COoDQ]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[,.\s]/g, '');
  return /^-?\d+$/.test(t) ? Number(t) : NaN;
}

/** 行の末尾の金額を取り出す */
function splitPrice(line: string): { name: string; price: number; yen: boolean } | null {
  const m = line.match(PRICE_WITH_YEN) ?? line.match(PRICE_PLAIN);
  if (!m) return null;
  const price = toNumber(m[2]);
  if (!Number.isFinite(price)) return null;
  return { name: m[1].replace(/[¥\s]+$/, '').trim(), price, yen: /¥/.test(line) };
}

/** 文字認識のゆれをそろえる（「y228」「Y 228」→「¥228」） */
function normalizeLine(line: string): string {
  return line
    .replace(/(^|\s)[yY]\s*¥?\s*(?=[\d,]{2,})/gu, '$1¥')
    .replace(/¥\s*¥/g, '¥')
    // 「¥ギ1,017」のように¥の直後に1字化けが入ったもの
    .replace(/¥\s*[^\d\s,.\-]\s*(?=\d)/g, '¥')
    // 「1, 064」「1.017」「1,.017」→「1,064」
    .replace(/(\d)\s*[,.]+\s*(?=\d{3}(?!\d))/g, '$1,')
    .trim();
}

export function detectStore(text: string): ExpenseStore {
  const t = normalizeText(text).toUpperCase();
  if (/LAWSON|ローソン/.test(t)) return 'lawson';
  if (/セブン|7-ELEVEN|7ELEVEN|SEVEN|ｾﾌﾞﾝ/.test(t)) return 'seven';
  if (/ベルク|BELC/.test(t)) return 'belc';
  return 'other';
}

export function detectDate(text: string): ISODate | undefined {
  const m = normalizeText(text).match(/(20\d{2})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})/);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseReceipt(text: string, rules?: Map<string, ExpenseCategory>): ParsedReceipt {
  const lines = normalizeText(text)
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  let total: number | undefined;
  let subtotal: number | undefined;
  // 「小計」より後は値引きだけ、「合計」より後（お預り・お釣など）は何も品目にしない
  let stage: 'items' | 'subtotal' | 'done' = 'items';
  const items: ExpenseItem[] = [];

  const add = (rawName: string, rawPrice: number) => {
    const name = rawName.replace(/^[\s.,、。・*]+/, '').trim();
    let price = rawPrice;
    // 合計・小計（文字が欠けて「合」「小」だけになっても）
    if (/^(合\s*計?|合計.*|総\s*計|お?買上.*計|計)$/.test(name) || (/合\s*計/.test(name) && !/小\s*計/.test(name))) {
      if (price > 0) total = price;
      stage = 'done';
      return;
    }
    if (/^小\s*計?$/.test(name) || /小\s*計/.test(name)) {
      if (price > 0) subtotal = price;
      if (stage === 'items') stage = 'subtotal';
      return;
    }
    if (stage === 'done') return;
    if (!name || !/\p{L}/u.test(name) || price === 0) return;
    // 「2個 × 単150」のような数量の行は、次の行に合計が出るので飛ばす
    if (/[xX×@]\s*[単\d]/.test(name) || /^\d+\s*(個|コ|点)/.test(name)) return;
    if (DISCOUNT.test(name)) {
      price = -Math.abs(price);
      const prev = items[items.length - 1];
      items.push({ name, price, category: prev?.category ?? 'other' });
      return;
    }
    if (stage !== 'items' || NOT_ITEM.test(name)) return;
    if (price < 0 || price > 30000) return;
    items.push({ name, price, category: categorize(name, rules) });
  };

  // 品名と金額が別々の行に分かれて読めたとき（段組みの読み取り・iPhoneの文字認識のコピー）用
  let names: string[] = [];
  let prices: number[] = [];
  const flush = () => {
    if (prices.length) {
      // 金額の並びは、直前に並んだ品名の並びと対応させる（見出しなどの余計な行は前に来る）
      const k = Math.min(prices.length, names.length);
      const paired = names.slice(names.length - k);
      paired.forEach((n, i) => add(n, prices[i]));
      names = [];
      prices = [];
    }
  };

  for (const line of lines) {
    // 日付・時刻・住所・電話の行は金額と間違えやすいので飛ばす
    if (INFO_LINE.test(line) || detectDate(line)) continue;
    const hit = splitPrice(line);
    if (hit && !hit.name) {
      // 金額だけの行。8桁以上（バーコード・JANコードなど）は金額ではない
      if ((line.match(/\d/g) ?? []).length >= 8) continue;
      if (hit.yen || Math.abs(hit.price) >= 10) prices.push(hit.price);
      continue;
    }
    flush();
    if (hit && /\p{L}/u.test(hit.name) && (hit.yen || Math.abs(hit.price) >= 10)) {
      add(hit.name, hit.price);
    } else if (/\p{L}/u.test(line)) {
      // 金額のない行、または¥の無い小さな数で終わる行（「商品1」「M 2」など）は品名として扱う
      names.push(line);
    }
  }
  flush();

  return { store: detectStore(text), date: detectDate(text), items, total: total ?? subtotal };
}

export const sumItems = (items: ExpenseItem[]) => items.reduce((t, i) => t + (Number(i.price) || 0), 0);
