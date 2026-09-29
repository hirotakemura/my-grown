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
// 行末の金額（¥150 / 150円 / 1,234 / -30、後ろの「軽」「※」「*」「外」などの印は無視）
const PRICE_AT_END = /^(.*?)[\s¥]*(-?\s*[\d,]{1,7})\s*円?\s*[軽※*＊外内税非]*\s*$/;

function toNumber(s: string): number {
  return Number(s.replace(/[,\s]/g, ''));
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
    .map((l) => l.trim())
    .filter(Boolean);

  let total: number | undefined;
  const items: ExpenseItem[] = [];

  for (const line of lines) {
    // 合計（「小計」は除く）
    if (/合\s*計/.test(line) && !/小\s*計/.test(line)) {
      const m = line.match(/(-?[\d,]{2,7})\s*円?\s*$/);
      if (m) total = toNumber(m[1]);
      continue;
    }
    const m = line.match(PRICE_AT_END);
    if (!m) continue;
    const name = m[1].replace(/[¥\s]+$/, '').trim();
    let price = toNumber(m[2]);
    if (!name || !/\p{L}/u.test(name) || !Number.isFinite(price) || price === 0) continue;
    // 「2個 × 単150」のような数量の行は、次の行に合計が出るので飛ばす
    if (/[xX×@]\s*[単\d]/.test(name) || /^\d+\s*(個|コ|点)/.test(name)) continue;
    if (DISCOUNT.test(name)) {
      price = -Math.abs(price);
      const prev = items[items.length - 1];
      items.push({ name, price, category: prev?.category ?? 'other' });
      continue;
    }
    if (NOT_ITEM.test(name)) continue;
    if (price < 0 || price > 30000) continue;
    items.push({ name, price, category: categorize(name, rules) });
  }

  return { store: detectStore(text), date: detectDate(text), items, total };
}

export const sumItems = (items: ExpenseItem[]) => items.reduce((t, i) => t + (Number(i.price) || 0), 0);
