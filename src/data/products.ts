import type { Category, Product } from '../types';

// 数値はローソンの一般的な商品の目安。パッケージの栄養成分表示で上書きできる。
const seed: [string, string, Category, number, number][] = [
  ['salad-chicken', 'サラダチキン プレーン', 'チキン・肉', 115, 24],
  ['chicken-bar', 'サラダチキンバー', 'チキン・肉', 75, 11],
  ['boiled-egg', 'ゆで卵', '卵・乳製品', 75, 6],
  ['yakitori-shio', '焼き鳥 塩（2本）', 'チキン・肉', 150, 16],
  ['onigiri-sake', 'おにぎり 鮭', 'おにぎり', 185, 5],
  ['onigiri-ume', 'おにぎり 梅', 'おにぎり', 170, 3],
  ['onigiri-konbu', 'おにぎり 昆布', 'おにぎり', 175, 3],
  ['onigiri-tunamayo', 'おにぎり ツナマヨ', 'おにぎり', 230, 5],
  ['bran-bread', 'ブランパン 2個入', 'パン', 130, 12],
  ['greek-yogurt', 'ギリシャヨーグルト', '卵・乳製品', 95, 10],
  ['savas-milk', 'ザバス ミルクプロテイン 脂肪0 200ml', 'プロテイン', 102, 15],
  ['protein-bar', 'プロテインバー', 'プロテイン', 200, 15],
  ['natto', '納豆', '卵・乳製品', 90, 8],
  ['tofu', '豆腐', '卵・乳製品', 80, 7],
  ['zaru-soba', 'ざるそば', '麺', 330, 13],
  ['miso-soup', '味噌汁', '汁物・サラダ', 35, 2],
  ['tonjiru', '豚汁', '汁物・サラダ', 160, 8],
  ['salad-nonoil', 'サラダ（ノンオイル）', '汁物・サラダ', 50, 2],
  ['banana', 'バナナ', 'その他', 90, 1],
  ['karaage-kun', 'からあげクン', 'ホットスナック', 220, 14],
];

export const SEED_PRODUCTS: Product[] = seed.map(([id, name, category, kcal, protein]) => ({
  id,
  name,
  category,
  kcal,
  protein,
  estimate: true,
  favorite: false,
  useCount: 0,
}));
