import type { MealSlot, Place } from '../types';

/** 商品を参照する品目（数値は商品データから取る）か、独自の品目 */
export type SuggestionItem =
  | { productId: string; qty: number }
  | { name: string; kcal: number; protein: number; fat: number; carbs: number; qty: number };

export interface Ingredient {
  name: string;
  qty: number;
  unit: string;
}

export interface Suggestion {
  id: string;
  place: Place;
  title: string;
  items: SuggestionItem[];
  recipe?: {
    steps: string[];
    ingredients: Ingredient[];
    seasonings: string[];
    note?: string;
  };
}

const p = (productId: string, qty = 1): SuggestionItem => ({ productId, qty });
const c = (name: string, kcal: number, protein: number, fat: number, carbs: number, qty = 1): SuggestionItem => ({
  name, kcal, protein, fat, carbs, qty,
});

const POST_WORKOUT: Suggestion[] = [
  { id: 'post-1', place: 'lawson', title: 'ミルクプロテイン＋おにぎり', items: [p('savas-milk'), p('onigiri-sake')] },
  { id: 'post-2', place: 'seven', title: 'ミルクプロテイン＋おにぎり（セブン）', items: [p('savas-milk'), p('7-onigiri-sake')] },
];

/** 平日（ローソン） */
export const WEEKDAY_MENUS: Record<MealSlot, Suggestion[]> = {
  lunch: [
    {
      id: 'wl-1',
      place: 'lawson',
      title: 'サラダチキン＋おにぎり2個＋味噌汁＋ゆで卵',
      items: [p('salad-chicken'), p('onigiri-sake'), p('onigiri-ume'), p('miso-soup'), p('boiled-egg')],
    },
    {
      id: 'wl-2',
      place: 'lawson',
      title: 'ざるそば＋サラダチキン＋ゆで卵＋おにぎり',
      items: [p('zaru-soba'), p('salad-chicken'), p('boiled-egg'), p('onigiri-sake')],
    },
    {
      id: 'wl-3',
      place: 'lawson',
      title: '焼き鳥4本＋おにぎり2個＋サラダ',
      items: [p('yakitori-shio', 2), p('onigiri-sake'), p('onigiri-konbu'), p('salad-nonoil')],
    },
    {
      id: 'sl-1',
      place: 'seven',
      title: 'サラダチキン＋おにぎり2個＋具だくさん味噌汁＋煮たまご',
      items: [p('7-salad-chicken'), p('7-onigiri-sake'), p('7-onigiri-konbu'), p('7-miso-soup'), p('7-nitamago')],
    },
    {
      id: 'sl-2',
      place: 'seven',
      title: 'さばの塩焼き＋おにぎり2個＋サラダ＋煮たまご',
      items: [p('7-saba'), p('7-onigiri-sake'), p('7-onigiri-konbu'), p('7-salad'), p('7-nitamago')],
    },
  ],
  dinner: [
    {
      id: 'wd-1',
      place: 'lawson',
      title: 'サラダチキン＋焼き鳥＋おにぎり＋味噌汁',
      items: [p('salad-chicken'), p('yakitori-shio'), p('onigiri-sake'), p('miso-soup')],
    },
    {
      id: 'wd-2',
      place: 'home',
      title: '作り置きの鶏むね＋パックご飯＋冷凍ブロッコリー',
      items: [p('home-chicken'), p('home-rice-150'), p('home-broccoli')],
    },
    {
      id: 'wd-3',
      place: 'lawson',
      title: 'サラダチキン＋豚汁＋おにぎり2個＋ゆで卵',
      items: [p('salad-chicken'), p('tonjiru'), p('onigiri-sake'), p('onigiri-konbu'), p('boiled-egg')],
    },
    {
      id: 'sd-1',
      place: 'seven',
      title: 'サラダチキン＋豚汁＋おにぎり＋煮たまご',
      items: [p('7-salad-chicken'), p('7-tonjiru'), p('7-onigiri-sake'), p('7-nitamago')],
    },
    {
      id: 'ed-1',
      place: 'eatout',
      title: '定食屋：焼き魚定食（ご飯少なめ）',
      items: [p('eo-grilled-fish')],
    },
    {
      id: 'ed-2',
      place: 'eatout',
      title: '定食屋：刺身定食',
      items: [p('eo-sashimi')],
    },
    {
      id: 'ed-3',
      place: 'eatout',
      title: '鶏むね・ささみ系の定食＋サラダ',
      items: [p('eo-chicken-teishoku'), p('eo-salad')],
    },
  ],
  post: POST_WORKOUT,
};

/** 休日（ベルク＋フライパン・電子レンジ） */
export const HOLIDAY_MENUS: Record<MealSlot, Suggestion[]> = {
  lunch: [
    {
      id: 'hl-1',
      place: 'belc',
      title: '豚こまと冷凍野菜の炒め物＋ご飯',
      items: [
        c('豚こま切れ肉 150g', 330, 27, 24, 0.3),
        c('冷凍ミックス野菜 150g', 50, 3, 0.5, 10),
        c('焼肉のたれ・油', 60, 0, 4, 6),
        c('パックご飯 200g', 300, 5, 0.7, 68),
      ],
      recipe: {
        ingredients: [
          { name: '豚こま切れ肉', qty: 150, unit: 'g' },
          { name: '冷凍ミックス野菜', qty: 150, unit: 'g' },
          { name: 'パックご飯 200g', qty: 1, unit: '個' },
        ],
        seasonings: ['焼肉のたれ', 'サラダ油'],
        steps: [
          'フライパンに油小さじ1を入れて中火にかけ、豚こまを広げて焼く。',
          '肉の色が変わったら冷凍野菜を凍ったまま入れ、蓋をして2分蒸し焼きにする。',
          '蓋を取って水分を飛ばし、焼肉のたれ大さじ1を絡める。ご飯は電子レンジで温める。',
        ],
      },
    },
    {
      id: 'hl-2',
      place: 'belc',
      title: '鶏むね親子丼',
      items: [
        c('鶏むね肉（皮なし）150g', 160, 35, 2.5, 0),
        c('卵', 75, 6, 5, 0.3, 2),
        c('玉ねぎ 1/2個・めんつゆ', 65, 2, 0, 14),
        c('パックご飯 200g', 300, 5, 0.7, 68),
      ],
      recipe: {
        ingredients: [
          { name: '鶏むね肉', qty: 150, unit: 'g' },
          { name: '卵', qty: 2, unit: '個' },
          { name: '玉ねぎ', qty: 0.5, unit: '個' },
          { name: 'パックご飯 200g', qty: 1, unit: '個' },
        ],
        seasonings: ['めんつゆ（3倍濃縮）'],
        steps: [
          '鶏むねは皮を取って一口大に削ぎ切りにし、玉ねぎは薄切りにする。',
          'フライパンに水100ml、めんつゆ大さじ2、玉ねぎと鶏肉を入れ、蓋をして中火で5分煮る。',
          '溶き卵を回し入れて蓋をし、30秒〜1分の半熟で火を止める。温めたご飯にのせる。',
        ],
      },
    },
    {
      id: 'hl-3',
      place: 'belc',
      title: '鮭のフライパン焼き定食',
      items: [
        c('生鮭 1切れ', 130, 22, 4, 0.1),
        c('納豆', 90, 8, 4.5, 6),
        c('インスタント味噌汁', 35, 2, 1, 4.5),
        c('パックご飯 200g', 300, 5, 0.7, 68),
      ],
      recipe: {
        ingredients: [
          { name: '生鮭', qty: 1, unit: '切れ' },
          { name: '納豆', qty: 1, unit: 'パック' },
          { name: 'インスタント味噌汁', qty: 1, unit: '袋' },
          { name: 'パックご飯 200g', qty: 1, unit: '個' },
        ],
        seasonings: ['クッキングシート'],
        steps: [
          '鮭の水気をキッチンペーパーで拭き、クッキングシートを敷いたフライパンに皮目を下にして置く。',
          '中火で3分焼き、裏返して蓋をし、弱火で3〜4分焼く。',
          'ご飯を電子レンジで温め、納豆と味噌汁を添える。',
        ],
      },
    },
  ],
  dinner: [
    {
      id: 'hd-1',
      place: 'belc',
      title: '鶏むねのしっとりソテー',
      items: [
        c('鶏むね肉（皮なし）250g', 265, 58, 4, 0),
        c('片栗粉・油', 67, 0, 4, 8),
        c('冷凍ブロッコリー 100g', 30, 4, 0.5, 4),
        c('パックご飯 150g', 220, 3, 0.5, 51),
      ],
      recipe: {
        ingredients: [
          { name: '鶏むね肉', qty: 250, unit: 'g' },
          { name: '冷凍ブロッコリー', qty: 100, unit: 'g' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['片栗粉', '塩こしょう', 'サラダ油'],
        steps: [
          '鶏むねの皮を取り、1cmの厚さに削ぎ切りにして塩こしょうをし、片栗粉を薄くまぶす。',
          'フライパンに油小さじ1を中火で熱して鶏肉を並べ、1分焼いて裏返す。',
          '空いた所に冷凍ブロッコリーを入れ、水大さじ2を加えて蓋をし、弱火で4分蒸し焼きにする。',
          '火を止めて蓋をしたまま2分置く（余熱で火を通すとしっとりする）。ご飯を温める。',
        ],
        note: '日曜は鶏むねを3枚焼き、2枚分は冷ましてから保存容器に入れて冷蔵庫へ（3日以内に食べる）。平日の夜の「作り置きの鶏むね」になります。',
      },
    },
    {
      id: 'hd-2',
      place: 'belc',
      title: '豚の生姜焼き',
      items: [
        c('豚もも薄切り肉 150g', 200, 31, 7, 0.3),
        c('玉ねぎ 1/2個・たれ・油', 130, 2, 4, 20),
        c('千切りキャベツ', 20, 1, 0.1, 4.5),
        c('パックご飯 150g', 220, 3, 0.5, 51),
      ],
      recipe: {
        ingredients: [
          { name: '豚もも薄切り肉', qty: 150, unit: 'g' },
          { name: '玉ねぎ', qty: 0.5, unit: '個' },
          { name: '千切りキャベツ', qty: 0.5, unit: '袋' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['醤油', 'みりん', 'チューブ生姜', 'サラダ油'],
        steps: [
          '醤油・みりん各大さじ1とチューブ生姜3cmを混ぜて、たれを作る。',
          'フライパンに油小さじ1を中火で熱し、薄切りにした玉ねぎを炒めてから豚肉を広げて両面焼く。',
          'たれを回し入れて絡める。千切りキャベツと温めたご飯を添える。',
        ],
      },
    },
    {
      id: 'hd-3',
      place: 'belc',
      title: '鮭と豆腐の蒸し焼き',
      items: [
        c('生鮭 1切れ', 130, 22, 4, 0.1),
        c('豆腐 150g', 110, 10, 6.5, 3),
        c('しめじ・ポン酢', 25, 1, 0.3, 5),
        c('パックご飯 150g', 220, 3, 0.5, 51),
      ],
      recipe: {
        ingredients: [
          { name: '生鮭', qty: 1, unit: '切れ' },
          { name: '豆腐', qty: 1, unit: 'パック' },
          { name: 'しめじ', qty: 0.5, unit: '袋' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['ポン酢', '酒（なければ水）'],
        steps: [
          '豆腐を4等分に切り、しめじは石づきを取ってほぐす。',
          'フライパンに豆腐・しめじ・鮭を並べ、酒か水を大さじ2入れて蓋をし、中火で7〜8分蒸し焼きにする。',
          'ポン酢をかけ、温めたご飯を添える（電子レンジなら耐熱皿にのせてラップをし、600Wで5分）。',
        ],
      },
    },
  ],
  post: POST_WORKOUT,
};

/** 休日の買い物リストに毎回足す、平日用の作り置き・常備品 */
export const WEEKDAY_STOCK: Ingredient[] = [
  { name: '鶏むね肉（平日の作り置き用）', qty: 500, unit: 'g' },
  { name: '冷凍ブロッコリー', qty: 200, unit: 'g' },
  { name: 'パックご飯 150g', qty: 2, unit: '個' },
];
