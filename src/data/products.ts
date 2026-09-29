import type { Category, Product, Store } from '../types';

/** 公式の栄養成分で確かめた初期データ（「目安」を付けない） */
export const VERIFIED = new Set([
  '7-dressing-koku-onion', '7-mushidori-egg-salad',
  '7-yakitori', '7-zaru-soba', '7-tonjiru', '7-nanachiki',
  '7-tofu-hamburg', '7-nikuyasai', '7-salmon-saikyo', '7-pork-egg-itame', '7-agedori', '7-niku-soba',
  '7-tonshabu-pasta', '7-mushi-mame', '7-oden-egg', '7-oden-atsuage', '7-oden-daikon',
]);

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
  // ローソン公式サイトはこの環境から開けないため、一般的な値の目安
  ['l-lchiki', 'Lチキ（レギュラー）', 'ホットスナック', 230, 13, 15, 11],
  ['l-saba-shioyaki', 'さばの塩焼き', 'チキン・肉', 260, 18, 20, 1],
  ['l-oden-egg', 'おでん たまご', '卵・乳製品', 80, 6.5, 5.5, 1],
  ['l-oden-atsuage', 'おでん 厚揚げ', '卵・乳製品', 80, 6, 5.5, 1.5],
  ['l-oden-daikon', 'おでん 大根', '汁物・サラダ', 10, 0.4, 0.1, 2.2],
];

const seven: Row[] = [
  ['7-salad-chicken', 'セブン サラダチキン プレーン', 'チキン・肉', 115, 24, 1.5, 1],
  ['7-chicken-bar', 'セブン サラダチキンバー', 'チキン・肉', 70, 11, 2, 1.5],
  ['7-nitamago', 'セブン 味付け半熟ゆで卵', '卵・乳製品', 80, 6.5, 5.5, 1],
  ['7-yakitori', 'セブン 炭火焼き鳥（塩）1本', 'チキン・肉', 66, 9.6, 3, 0.3],
  ['7-saba', 'セブン さばの塩焼き', 'チキン・肉', 260, 18, 20, 1],
  ['7-onigiri-sake', 'セブン おにぎり 紅しゃけ', 'おにぎり', 180, 5, 1.5, 37],
  ['7-onigiri-konbu', 'セブン おにぎり 昆布', 'おにぎり', 170, 3, 0.5, 38],
  ['7-onigiri-tunamayo', 'セブン おにぎり ツナマヨネーズ', 'おにぎり', 235, 5, 10, 31],
  ['7-greek-yogurt', 'セブン ギリシャヨーグルト', '卵・乳製品', 90, 10, 0.3, 12],
  ['7-zaru-soba', 'セブン 北海道産そば粉のざるそば', '麺', 330, 15, 2.5, 63.4],
  ['7-miso-soup', 'セブン 具だくさん味噌汁', '汁物・サラダ', 60, 3, 2, 7],
  ['7-tonjiru', 'セブン コクと旨味の豚汁', '汁物・サラダ', 148, 12.1, 7.6, 9.3],
  ['7-salad', 'セブン サラダ（ノンオイル）', '汁物・サラダ', 50, 2, 0.5, 9],
  ['7-nanachiki', 'セブン ななチキ', 'ホットスナック', 174, 13.4, 9, 10],
  ['7-broccoli-chicken-egg', 'セブン ブロッコリーチキンエッグ', 'チキン・肉', 180, 20, 9, 5],
  ['7-onigiri-saba', 'セブン 長野県産コシヒカリおむすび 炭火焼さば', 'おにぎり', 220, 7, 6, 35],
  // セブン‐イレブン公式サイトの栄養成分（1食あたり、item/105215）
  ['7-mushidori-egg-salad', 'セブン 蒸し鶏と玉子のサラダ', '汁物・サラダ', 66, 8.7, 2.3, 3.4],
  // セブン‐イレブン公式サイトの栄養成分（1食あたり）
  ['7-dressing-koku-onion', 'セブン 7P コク旨玉ねぎドレッシング（小袋25ml）', '汁物・サラダ', 105, 0.5, 10.5, 2],
  // ここから下もセブン‐イレブン公式サイトの栄養成分（1食あたり）
  ['7-tofu-hamburg', 'セブン 豆腐ハンバーグ 和風粗おろしソース', 'チキン・肉', 347, 26.1, 13.1, 33.3],
  ['7-nikuyasai', 'セブン 肉野菜炒め', 'チキン・肉', 197, 8, 10.9, 19.4],
  ['7-salmon-saikyo', 'セブン 7P サーモンハラミの西京焼', 'チキン・肉', 171, 10.5, 13.8, 1.2],
  ['7-pork-egg-itame', 'セブン 豚肉ときくらげのふんわり中華玉子炒め', 'チキン・肉', 306, 15.2, 21.3, 15.2],
  ['7-agedori', 'セブン 揚げ鶏', 'ホットスナック', 175, 13.4, 10.1, 7.8],
  ['7-niku-soba', 'セブン 若鶏の冷たい肉そば', '麺', 542, 24.2, 13.4, 83.5],
  ['7-tonshabu-pasta', 'セブン 豚しゃぶパスタサラダ', '麺', 362, 15.5, 15, 42.7],
  ['7-mushi-mame', 'セブン 7P 蒸しサラダ豆', '汁物・サラダ', 120, 9.2, 3, 17.8],
  ['7-oden-egg', 'セブン おでん 味しみたまご', '卵・乳製品', 77, 6.7, 4.9, 1.4],
  ['7-oden-atsuage', 'セブン おでん 味しみ木綿厚揚げ', '卵・乳製品', 72, 6, 4.7, 1.6],
  ['7-oden-daikon', 'セブン おでん 味しみ大根', '汁物・サラダ', 8, 0.3, 0.1, 2],
];

/** 公式値に置き換えた既存の商品（v12で、目安のままの端末だけ更新する） */
export const UPDATED_TO_OFFICIAL_V12 = ['7-yakitori', '7-zaru-soba', '7-tonjiru', '7-nanachiki'];

/** あとから追加した初期データ（DBのバージョン → 商品id）。既存のDBにはバージョンアップ時にこれだけ足す（消した商品は復活させない） */
export const ADDED_IN: Record<number, string[]> = {
  3: ['7-broccoli-chicken-egg', '7-onigiri-saba'],
  4: [
    'home-savas-soy-cocoa', 'home-boiled-egg', 'belc-pork-belly-karubi', 'belc-cabbage-zaku',
    'belc-cabbage-sengiri-mini', 'belc-salad-chicken-herb', 'belc-sausage-steak',
  ],
  5: ['home-alpron-soy-cookie'],
  6: ['home-moyashi', 'home-enoki'],
  7: ['home-tkg', 'home-natto-gohan'],
  8: ['savas-milk-cocoa-430'],
  9: ['7-mushidori-egg-salad', '7-dressing-koku-onion'],
  11: ['home-pork-broccoli-steam'],
  12: [
    'l-lchiki', 'l-saba-shioyaki', 'l-oden-egg', 'l-oden-atsuage', 'l-oden-daikon',
    '7-tofu-hamburg', '7-nikuyasai', '7-salmon-saikyo', '7-pork-egg-itame', '7-agedori', '7-niku-soba',
    '7-tonshabu-pasta', '7-mushi-mame', '7-oden-egg', '7-oden-atsuage', '7-oden-daikon',
  ],
};

// どちらのコンビニでも買えるもの
const common: Row[] = [
  ['savas-milk', 'ザバス ミルクプロテイン 脂肪0 200ml', 'プロテイン', 102, 15, 0, 10.5],
  ['savas-milk-cocoa-430', 'ザバス MILK PROTEIN 脂肪0 ココア味 430ml', 'プロテイン', 160, 20, 0, 20],
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
  ['home-alpron-soy-cookie', 'ALPRON ソイプロテイン クッキー&クリーム味（1杯30g）', '自炊', 115, 20, 2, 4.5],
  ['home-moyashi', 'もやし（1袋200g）', '自炊', 30, 3.4, 0.2, 5.2],
  ['home-enoki', 'えのき（1袋100g）', '自炊', 34, 2.7, 0.2, 7.6],
  // ご飯はパックご飯150gで計算
  ['home-tkg', '卵かけご飯（ご飯150g＋卵1個）', '自炊', 300, 9.4, 5.5, 52],
  ['home-natto-gohan', '納豆かけご飯（ご飯150g＋納豆1パック）', '自炊', 320, 11, 5, 59],
  // 豚こま150g＋ブロッコリー100g＋ポン酢で計算
  ['home-pork-broccoli-steam', '豚こま肉とブロッコリーのレンジ蒸し（豚こま150g）', '自炊', 375, 31.5, 24.5, 7.3],
];

const build = (rows: Row[], store: Store): Product[] =>
  rows.map(([id, name, category, kcal, protein, fat, carbs]) => ({
    id, name, category, store, kcal, protein, fat, carbs, estimate: !VERIFIED.has(id), favorite: false, useCount: 0,
  }));

export const SEED_PRODUCTS: Product[] = [
  ...build(lawson, 'lawson'),
  ...build(seven, 'seven'),
  ...build(common, 'common'),
  ...build(other, 'other'),
];

export const SEED_BY_ID = new Map(SEED_PRODUCTS.map((p) => [p.id, p]));
