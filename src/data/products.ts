import type { Category, Product, Store } from '../types';

// 数値は一般的な商品の目安（kcal, たんぱく質g, 脂質g, 炭水化物g）。
// パッケージの栄養成分表示やお店の公表値で上書きできる。
type Row = [id: string, name: string, category: Category, kcal: number, p: number, f: number, c: number];

const lawson: Row[] = [
  ['salad-chicken', 'サラダチキン プレーン', 'チキン・肉', 115, 24, 1.5, 0.5],
  ['chicken-bar', 'サラダチキンバー', 'チキン・肉', 75, 11, 2.5, 1.5],
  ['boiled-egg', 'ゆで卵', '卵・乳製品', 75, 6, 5, 0.3],
  ['yakitori-shio', '焼き鳥 塩（2本）', 'チキン・肉', 150, 16, 8, 2],
  ['onigiri-sake', 'おにぎり 鮭', 'おにぎり', 185, 5, 1.5, 38],
  ['onigiri-ume', 'おにぎり 梅', 'おにぎり', 170, 3, 0.5, 38],
  ['onigiri-konbu', 'おにぎり 昆布', 'おにぎり', 175, 3, 0.5, 39],
  ['onigiri-tunamayo', 'おにぎり ツナマヨ', 'おにぎり', 230, 5, 9, 32],
  ['bran-bread', 'ブランパン 2個入', 'パン', 130, 12, 7, 11],
  ['greek-yogurt', 'ギリシャヨーグルト', '卵・乳製品', 95, 10, 0.3, 13],
  ['protein-bar', 'プロテインバー', 'プロテイン', 200, 15, 9, 16],
  ['zaru-soba', 'ざるそば', '麺', 330, 13, 2.5, 63],
  ['miso-soup', '味噌汁', '汁物・サラダ', 35, 2, 1.2, 4],
  ['tonjiru', '豚汁', '汁物・サラダ', 160, 8, 8, 13],
  ['salad-nonoil', 'サラダ（ノンオイル）', '汁物・サラダ', 50, 2, 0.5, 9],
  ['karaage-kun', 'からあげクン', 'ホットスナック', 220, 14, 14, 9],
];

const seven: Row[] = [
  ['7-salad-chicken', 'セブン サラダチキン プレーン', 'チキン・肉', 115, 24, 1.5, 1],
  ['7-chicken-bar', 'セブン サラダチキンバー', 'チキン・肉', 70, 11, 2, 1.5],
  ['7-nitamago', 'セブン 味付け半熟ゆで卵', '卵・乳製品', 80, 6.5, 5.5, 1],
  ['7-yakitori', 'セブン 焼き鳥 もも塩（2本）', 'チキン・肉', 160, 15, 10, 2],
  ['7-saba', 'セブン さばの塩焼き', 'チキン・肉', 260, 18, 20, 1],
  ['7-onigiri-sake', 'セブン おにぎり 紅しゃけ', 'おにぎり', 180, 5, 1.5, 37],
  ['7-onigiri-konbu', 'セブン おにぎり 昆布', 'おにぎり', 170, 3, 0.5, 38],
  ['7-onigiri-tunamayo', 'セブン おにぎり ツナマヨネーズ', 'おにぎり', 235, 5, 10, 31],
  ['7-greek-yogurt', 'セブン ギリシャヨーグルト', '卵・乳製品', 90, 10, 0.3, 12],
  ['7-zaru-soba', 'セブン ざるそば', '麺', 350, 13, 2, 68],
  ['7-miso-soup', 'セブン 具だくさん味噌汁', '汁物・サラダ', 60, 3, 2, 7],
  ['7-tonjiru', 'セブン 豚汁', '汁物・サラダ', 180, 9, 9, 15],
  ['7-salad', 'セブン サラダ（ノンオイル）', '汁物・サラダ', 50, 2, 0.5, 9],
  ['7-nanachiki', 'セブン ななチキ', 'ホットスナック', 220, 12, 13, 13],
  ['7-broccoli-chicken-egg', 'セブン ブロッコリーチキンエッグ', 'チキン・肉', 180, 20, 9, 5],
  ['7-onigiri-saba', 'セブン 長野県産コシヒカリおむすび 炭火焼さば', 'おにぎり', 220, 7, 6, 35],
];

/** あとから追加した初期データ（DBのバージョン → 商品id）。既存のDBにはバージョンアップ時にこれだけ足す（消した商品は復活させない） */
export const ADDED_IN: Record<number, string[]> = {
  3: ['7-broccoli-chicken-egg', '7-onigiri-saba'],
  4: [
    'home-savas-soy-cocoa', 'home-boiled-egg', 'belc-pork-belly-karubi', 'belc-cabbage-zaku',
    'belc-cabbage-sengiri-mini', 'belc-salad-chicken-herb', 'belc-sausage-steak',
  ],
};

// どちらのコンビニでも買えるもの
const common: Row[] = [
  ['savas-milk', 'ザバス ミルクプロテイン 脂肪0 200ml', 'プロテイン', 102, 15, 0, 10.5],
  ['natto', '納豆', '卵・乳製品', 90, 8, 4.5, 6],
  ['tofu', '豆腐', '卵・乳製品', 80, 7, 4.5, 2.5],
  ['banana', 'バナナ', 'その他', 90, 1, 0.2, 22],
];

// 出社日の夜に、外で食べる・家の作り置きを食べるとき用
const other: Row[] = [
  ['eo-grilled-fish', '焼き魚定食（ご飯少なめ）', '外食・定食', 600, 35, 15, 75],
  ['eo-sashimi', '刺身定食', '外食・定食', 600, 38, 10, 88],
  ['eo-ginger-pork', '生姜焼き定食', '外食・定食', 850, 32, 35, 100],
  ['eo-gyudon', '牛丼 並', '外食・定食', 650, 20, 20, 95],
  ['eo-chicken-teishoku', '鶏むね・ささみ系の定食', '外食・定食', 650, 40, 12, 90],
  ['eo-salad', '生野菜サラダ（外食）', '外食・定食', 30, 1, 0.3, 6],
  ['home-chicken', '鶏むねソテー（作り置き1枚分）', '自炊', 300, 58, 5, 5],
  ['home-rice-150', 'パックご飯 150g', '自炊', 220, 3, 0.5, 51],
  ['home-broccoli', '冷凍ブロッコリー 100g', '自炊', 30, 4, 0.5, 4],
  ['home-savas-soy-cocoa', 'SAVAS ソイプロテイン ココア味（1杯21g）', '自炊', 80, 15, 0.5, 3.5],
  ['home-boiled-egg', 'ゆで卵（自炊・1個）', '自炊', 75, 6, 5, 0.3],
  ['belc-pork-belly-karubi', 'ベルク メキシコ産豚肉バラカルビ 焼肉 小（1パック）', '自炊', 550, 21, 53, 0.2],
  ['belc-cabbage-zaku', 'ベルク ざく切りキャベツ（1袋）', '自炊', 32, 2, 0.3, 8],
  ['belc-cabbage-sengiri-mini', 'ベルク 千切りキャベツ ミニ（1袋）', '自炊', 20, 1, 0.2, 5],
  ['belc-salad-chicken-herb', 'ベルク サラダチキン ハーブ', '自炊', 110, 24, 1.5, 1],
  ['belc-sausage-steak', 'ベルク あらびきソーセージステーキ（100g）', '自炊', 320, 12, 29, 3],
];

const build = (rows: Row[], store: Store): Product[] =>
  rows.map(([id, name, category, kcal, protein, fat, carbs]) => ({
    id, name, category, store, kcal, protein, fat, carbs, estimate: true, favorite: false, useCount: 0,
  }));

export const SEED_PRODUCTS: Product[] = [
  ...build(lawson, 'lawson'),
  ...build(seven, 'seven'),
  ...build(common, 'common'),
  ...build(other, 'other'),
];

export const SEED_BY_ID = new Map(SEED_PRODUCTS.map((p) => [p.id, p]));
