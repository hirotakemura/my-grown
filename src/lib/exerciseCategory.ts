import { EXERCISE_CATEGORIES, type Exercise, type ExerciseCategory } from '../types';

// 名前から分類を推測する（上から順に見る。「レッグエクステンション」は腕ではなく脚、のように先に判定したいものを上に）
const RULES: [RegExp, ExerciseCategory][] = [
  [/レッグ|スクワット|ランジ|カーフ|ヒップ|アダクション|アブダクション|グルート|デッドリフト/, '脚'],
  [/アブ|クランチ|腹筋|プランク|レッグレイズ|ツイスト/, 'お腹'],
  [/チェスト|ベンチ|ペック|フライ|クロスオーバー|ディップス|腕立て|プッシュアップ|パワーラック/, '胸'],
  [/プルダウン|ロウ|懸垂|チンニング|プルアップ|バックエクステンション|背/, '背中'],
  [/ショルダー|サイドレイズ|ラテラル|フロントレイズ|リアデルト|シュラッグ|アップライト/, '肩'],
  [/カール|プッシュダウン|エクステンション|トライセップ|キックバック|スカルクラッシャー/, '腕'],
];

export function guessCategory(name: string): ExerciseCategory {
  return RULES.find(([re]) => re.test(name))?.[1] ?? 'その他';
}

export function categoryOf(ex: Exercise): ExerciseCategory {
  return ex.category ?? guessCategory(ex.name);
}

/** 分類ごとにまとめる（分類の並びは固定、中の並びは渡した順のまま。空の分類は出さない） */
export function groupByCategory<T extends Exercise>(list: T[]): { category: ExerciseCategory; items: T[] }[] {
  return EXERCISE_CATEGORIES.map((category) => ({ category, items: list.filter((e) => categoryOf(e) === category) })).filter((g) => g.items.length > 0);
}

/** その種目の枠で選べるほかの種目のid（古いデータの altId も読む） */
export function optionsOf(ex: Exercise): string[] {
  return [...new Set(ex.altIds ?? (ex.altId ? [ex.altId] : []))].filter((id) => id !== ex.id);
}

/**
 * メニューの種目を「枠」にする。ほかの枠で選べる種目として入っている種目は、別の枠としては出さない
 * （前に別の枠として足した種目を、あとで枠の選択肢に入れたときに二重にならないように）。
 */
export function menuSlots(ids: string[], exercises: Map<string, Exercise>): string[] {
  const opts = (id: string) => { const ex = exercises.get(id); return ex ? optionsOf(ex) : []; };
  const kept: string[] = [];
  for (const id of new Set(ids)) {
    if (kept.some((k) => opts(k).includes(id))) continue;
    kept.push(id);
  }
  // 後ろの枠の選択肢に入っている前の枠も外す（チェストプレスの前にケーブル チェストプレスがあった場合など）
  return kept.filter((id, i) => !kept.some((k, j) => j > i && opts(k).includes(id)));
}
