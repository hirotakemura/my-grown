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
  { id: 'post-3', place: 'lawson', title: 'サラダチキンバー＋おにぎり＋バナナ', items: [p('chicken-bar'), p('onigiri-konbu'), p('banana')] },
  { id: 'post-4', place: 'seven', title: '炭火焼き鳥（塩）2本＋おにぎり', items: [p('7-yakitori', 2), p('7-onigiri-konbu')] },
  { id: 'post-l-mamaru', place: 'lawson', title: 'まんまる鶏＋塩にぎり', items: [p('l-mamaru-dori'), p('l-shio-nigiri')] },
];

/** 平日（出社前：家 or コンビニ） */
export const WEEKDAY_MENUS: Record<MealSlot, Suggestion[]> = {
  breakfast: [
    {
      id: 'wb-1',
      place: 'home',
      title: 'ソイプロテイン＋バナナ＋ゆで卵',
      items: [p('home-savas-soy-cocoa'), p('banana'), p('home-boiled-egg')],
    },
    {
      id: 'wb-2',
      place: 'home',
      title: 'ソイプロテイン（ALPRON）＋ゆで卵2個',
      items: [p('home-alpron-soy-cookie'), p('home-boiled-egg', 2)],
    },
    {
      id: 'hb-w1',
      place: 'home',
      title: '卵かけご飯＋ソイプロテイン',
      items: [p('home-tkg'), p('home-savas-soy-cocoa')],
    },
    {
      id: 'hb-w2',
      place: 'home',
      title: '納豆かけご飯＋ゆで卵＋ソイプロテイン',
      items: [p('home-natto-gohan'), p('home-boiled-egg'), p('home-savas-soy-cocoa')],
    },
    {
      id: 'wb-3',
      place: 'lawson',
      title: 'ギリシャヨーグルト＋ブランパン',
      items: [p('greek-yogurt'), p('bran-bread')],
    },
    {
      id: 'wb-4',
      place: 'seven',
      title: 'ギリシャヨーグルト＋煮たまご＋おにぎり',
      items: [p('7-greek-yogurt'), p('7-nitamago'), p('7-onigiri-konbu')],
    },
    {
      id: 'wb-5',
      place: 'lawson',
      title: 'ゆで卵2個＋ブランパン＋ミルクプロテイン',
      items: [p('boiled-egg', 2), p('bran-bread'), p('savas-milk')],
    },
    {
      id: 'wb-l-nitamago',
      place: 'lawson',
      title: '煮たまご2個＋ブラン入り食パン＋のむヨーグルト',
      items: [p('l-nitamago', 2), p('l-bran-shokupan'), p('l-nomu-yogurt')],
    },
    {
      id: 'wb-l-chicken',
      place: 'lawson',
      title: 'サラダチキン ハーブ＋枝豆と塩昆布おにぎり',
      items: [p('l-salad-chicken-herb'), p('l-onigiri-edamame')],
    },
    {
      id: 'wb-6',
      place: 'seven',
      title: '蒸しサラダ豆＋煮たまご＋ミルクプロテイン',
      items: [p('7-mushi-mame'), p('7-nitamago'), p('savas-milk')],
    },
  ],
  lunch: [
    {
      id: 'wl-1',
      place: 'lawson',
      title: 'サラダチキン＋おにぎり2個＋味噌汁＋ゆで卵',
      items: [p('salad-chicken'), p('onigiri-sake'), p('onigiri-ume'), p('miso-soup'), p('boiled-egg')],
    },
    {
      id: 'wl-tororo',
      place: 'lawson',
      title: '冷しとろろそば＋サラダチキンスティック＋ゆで卵',
      items: [p('l-tororo-soba'), p('l-chicken-stick-yuzu'), p('boiled-egg')],
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
    {
      id: 'wl-4',
      place: 'lawson',
      title: 'サラダチキン＋ブランパン＋ギリシャヨーグルト',
      items: [p('salad-chicken'), p('bran-bread'), p('greek-yogurt')],
    },
    {
      id: 'wl-5',
      place: 'lawson',
      title: 'さばの塩焼き＋おにぎり＋サラダ＋ゆで卵',
      items: [p('l-saba-shioyaki'), p('onigiri-sake'), p('salad-nonoil'), p('boiled-egg')],
    },
    {
      id: 'wl-6',
      place: 'lawson',
      title: 'からあげクン＋おにぎり＋サラダ＋ゆで卵＋味噌汁',
      items: [p('karaage-kun'), p('onigiri-konbu'), p('salad-nonoil'), p('boiled-egg'), p('miso-soup')],
    },
    {
      id: 'wl-l-munesalad',
      place: 'lawson',
      title: '国産鶏むね肉のサラダ＋大きなおにぎり 鮭',
      items: [p('l-munenikusalad'), p('l-onigiri-big-sake')],
    },
    {
      id: 'wl-l-kakesoba',
      place: 'lawson',
      title: 'かけそば＋サラダチキン スモーク＋煮たまご',
      items: [p('l-kake-soba'), p('l-salad-chicken-smoke'), p('l-nitamago')],
    },
    {
      id: 'wl-l-oyakodon',
      place: 'lawson',
      title: '親子丼＋たまご＆ブロッコリー',
      items: [p('l-oyakodon'), p('l-egg-broccoli')],
    },
    {
      id: 'wl-l-sand',
      place: 'lawson',
      title: '照焼チキンたまごサンド＋サラダチキン 梅しそ＋宿六の豚汁',
      items: [p('l-teriyaki-egg-sand'), p('l-salad-chicken-umeshiso'), p('l-tonjiru-yadoroku')],
    },
    {
      id: 'wl-l-hiyashichuka',
      place: 'lawson',
      title: '冷し中華＋サラダチキン スティック＋蒸し鶏のサラダ',
      items: [p('l-hiyashi-chuka'), p('l-chicken-stick-yuzu'), p('l-mushidori-salad')],
    },
    {
      id: 'sl-3',
      place: 'seven',
      title: '若鶏の冷たい肉そば＋煮たまご',
      items: [p('7-niku-soba'), p('7-nitamago')],
    },
    {
      id: 'sl-4',
      place: 'seven',
      title: '豆腐ハンバーグ＋おにぎり＋サラダ',
      items: [p('7-tofu-hamburg'), p('7-onigiri-konbu'), p('7-salad')],
    },
    {
      id: 'sl-5',
      place: 'seven',
      title: 'ざるそば＋サラダチキン',
      items: [p('7-zaru-soba'), p('7-salad-chicken')],
    },
    {
      id: 'sl-6',
      place: 'seven',
      title: '豚しゃぶパスタサラダ＋煮たまご＋サラダチキンバー',
      items: [p('7-tonshabu-pasta'), p('7-nitamago'), p('7-chicken-bar')],
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
      id: 'hd-w1',
      place: 'home',
      title: '豚こま肉とブロッコリーのレンジ蒸し＋パックご飯',
      items: [p('home-pork-broccoli-steam'), p('home-rice-150')],
    },
    {
      id: 'hd-w2',
      place: 'home',
      title: 'サラダチキン（ハーブ）＋卵かけご飯＋千切りキャベツ',
      items: [p('belc-salad-chicken-herb'), p('home-tkg'), p('belc-cabbage-sengiri-mini')],
    },
    {
      id: 'hd-w3',
      place: 'home',
      title: '納豆かけご飯＋ゆで卵2個＋もやしのレンジ蒸し',
      items: [p('home-natto-gohan'), p('home-boiled-egg', 2), p('home-moyashi')],
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
      id: 'wd-4',
      place: 'lawson',
      title: 'さばの塩焼き＋おにぎり＋味噌汁＋サラダ',
      items: [p('l-saba-shioyaki'), p('onigiri-konbu'), p('miso-soup'), p('salad-nonoil')],
    },
    {
      id: 'wd-5',
      place: 'lawson',
      title: 'おでん（たまご・厚揚げ・大根）＋サラダチキンバー＋おにぎり',
      items: [p('l-oden-egg'), p('l-oden-atsuage'), p('l-oden-daikon'), p('chicken-bar'), p('onigiri-sake')],
    },
    {
      id: 'wd-6',
      place: 'lawson',
      title: 'Lチキ＋サラダチキン＋サラダ＋おにぎり',
      items: [p('l-lchiki'), p('salad-chicken'), p('salad-nonoil'), p('onigiri-konbu')],
    },
    {
      id: 'wd-l-sumibi',
      place: 'lawson',
      title: '鶏の炭火焼き3種盛り＋塩にぎり＋和風スープ',
      items: [p('l-sumibi-3'), p('l-shio-nigiri'), p('l-wafu-soup')],
    },
    {
      id: 'wd-l-sanma',
      place: 'lawson',
      title: 'さんまの塩焼＋塩にぎり＋たまご＆ブロッコリー＋宿六の豚汁',
      items: [p('l-sanma'), p('l-shio-nigiri'), p('l-egg-broccoli'), p('l-tonjiru-yadoroku')],
    },
    {
      id: 'wd-l-hokke',
      place: 'lawson',
      title: 'ほっけの塩焼＋砂肝の焼鳥＋おにぎり＋蒸し鶏のサラダ',
      items: [p('l-hokke'), p('l-sunagimo'), p('onigiri-konbu'), p('l-mushidori-salad')],
    },
    {
      id: 'wd-l-shogayaki',
      place: 'lawson',
      title: '豚生姜焼弁当＋蒸し鶏のサラダ',
      items: [p('l-shogayaki-bento'), p('l-mushidori-salad')],
    },
    {
      id: 'wd-l-pescatore',
      place: 'lawson',
      title: '海鮮づくしペスカトーレ＋パリパリチキン',
      items: [p('l-pescatore'), p('l-paripari-chicken')],
    },
    {
      id: 'sd-2',
      place: 'seven',
      title: 'サーモンハラミの西京焼＋豚汁＋おにぎり',
      items: [p('7-salmon-saikyo'), p('7-tonjiru'), p('7-onigiri-sake')],
    },
    {
      id: 'sd-3',
      place: 'seven',
      title: '豚肉ときくらげの中華玉子炒め＋おにぎり＋サラダチキンバー',
      items: [p('7-pork-egg-itame'), p('7-onigiri-konbu'), p('7-chicken-bar')],
    },
    {
      id: 'sd-4',
      place: 'seven',
      title: 'おでん（たまご2・厚揚げ・大根）＋炭火焼き鳥2本＋おにぎり',
      items: [p('7-oden-egg', 2), p('7-oden-atsuage'), p('7-oden-daikon'), p('7-yakitori', 2), p('7-onigiri-sake')],
    },
    {
      id: 'sd-5',
      place: 'seven',
      title: '揚げ鶏＋豚汁＋蒸し鶏と玉子のサラダ＋おにぎり',
      items: [p('7-agedori'), p('7-tonjiru'), p('7-mushidori-egg-salad'), p('7-onigiri-konbu')],
    },
    {
      id: 'sd-6',
      place: 'seven',
      title: '肉野菜炒め＋サラダチキン＋おにぎり',
      items: [p('7-nikuyasai'), p('7-salad-chicken'), p('7-onigiri-sake')],
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
  breakfast: [
    {
      id: 'hb-1',
      place: 'belc',
      title: '納豆卵ごはん',
      items: [c('パックご飯 150g', 220, 3, 0.5, 51), c('納豆', 90, 8, 4.5, 6), c('卵', 75, 6, 5, 0.3)],
      recipe: {
        ingredients: [
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
          { name: '納豆', qty: 1, unit: 'パック' },
          { name: '卵', qty: 1, unit: '個' },
        ],
        seasonings: ['醤油（納豆のたれでも可）'],
        steps: ['ご飯を電子レンジで温める。', '納豆をたれと混ぜ、卵と一緒にご飯にのせる。'],
      },
    },
    {
      id: 'hb-2',
      place: 'belc',
      title: 'オートミール＋ミルクプロテイン＋バナナ',
      items: [c('オートミール 30g', 110, 4, 1.7, 20), p('savas-milk'), p('banana')],
      recipe: {
        ingredients: [
          { name: 'オートミール', qty: 30, unit: 'g' },
          { name: 'ザバス ミルクプロテイン', qty: 1, unit: '本' },
          { name: 'バナナ', qty: 1, unit: '本' },
        ],
        seasonings: [],
        steps: [
          '耐熱の器にオートミールとミルクプロテインを半分（100ml）入れ、ラップなしで600W 1分温める。',
          '残りのミルクプロテインを注ぎ、手で割ったバナナをのせる。',
        ],
      },
    },
    {
      id: 'hb-3',
      place: 'belc',
      title: 'ギリシャヨーグルト＋ゆで卵2個',
      items: [p('greek-yogurt'), p('home-boiled-egg', 2)],
      recipe: {
        ingredients: [
          { name: 'ギリシャヨーグルト', qty: 1, unit: '個' },
          { name: '卵', qty: 2, unit: '個' },
        ],
        seasonings: [],
        steps: [
          'フライパンに卵と水を1cmほど入れ、蓋をして中火にかける。沸騰したら弱めの中火で7〜8分蒸しゆでにする。',
          '冷水で冷やして殻をむく。数日分まとめて作って冷蔵庫へ（電子レンジでそのまま温めると破裂するので注意）。',
        ],
      },
    },
    {
      id: 'hb-4',
      place: 'belc',
      title: 'ハムエッグ（卵2個）＋ご飯',
      items: [c('卵', 75, 6, 5, 0.3, 2), c('ロースハム 2枚', 40, 6, 1.2, 1.5), c('油 小さじ1', 37, 0, 4, 0), c('パックご飯 150g', 220, 3, 0.5, 51)],
      recipe: {
        ingredients: [
          { name: '卵', qty: 2, unit: '個' },
          { name: 'ロースハム', qty: 2, unit: '枚' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['サラダ油', '塩こしょう（または醤油）'],
        steps: [
          'フライパンに油小さじ1を中火で熱し、ハムを並べて卵を割り入れる。',
          '水大さじ1を入れて蓋をし、弱火で2〜3分。好みの固さで火を止め、塩こしょうか醤油をかける。',
          '温めたご飯を添える。',
        ],
        note: '包丁を使わず、フライパン1つで作れます。',
      },
    },
    {
      id: 'hb-5',
      place: 'belc',
      title: 'ツナ入りスクランブルエッグ＋ご飯',
      items: [c('卵', 75, 6, 5, 0.3, 2), c('ツナ缶（ノンオイル）1缶', 50, 11, 0.5, 0.2), c('油 小さじ1', 37, 0, 4, 0), c('パックご飯 150g', 220, 3, 0.5, 51)],
      recipe: {
        ingredients: [
          { name: '卵', qty: 2, unit: '個' },
          { name: 'ツナ缶（ノンオイル）', qty: 1, unit: '缶' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['サラダ油', '塩こしょう', 'マヨネーズ（少しだけ・お好みで）'],
        steps: [
          '卵を溶き、汁を切ったツナと塩こしょうを混ぜる。',
          'フライパンに油小さじ1を中火で熱し、卵液を流して大きく混ぜ、半熟で火を止める。',
          '温めたご飯にのせる。',
        ],
        note: '包丁を使わず、フライパン1つで作れます。',
      },
    },
  ],
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
        c('えのき 1/2袋・めんつゆ', 45, 2, 0.1, 10),
        c('パックご飯 200g', 300, 5, 0.7, 68),
      ],
      recipe: {
        ingredients: [
          { name: '鶏むね肉（唐揚げ用など一口大カット済み）', qty: 150, unit: 'g' },
          { name: '卵', qty: 2, unit: '個' },
          { name: 'えのき', qty: 0.5, unit: '袋' },
          { name: 'パックご飯 200g', qty: 1, unit: '個' },
        ],
        seasonings: ['めんつゆ（3倍濃縮）'],
        steps: [
          'えのきは根元を手でちぎって落とし、ほぐす（鶏肉は一口大にカット済みのものを使うので包丁いらず）。',
          'フライパンに水100ml、めんつゆ大さじ2、えのきと鶏肉を入れ、蓋をして中火で5分煮る。',
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
    {
      id: 'hl-4',
      place: 'belc',
      title: '豚こまとざく切りキャベツのみそ炒め＋ご飯',
      items: [c('豚こま切れ肉 150g', 330, 27, 24, 0.3), p('belc-cabbage-zaku'), c('みそ・みりん・油', 70, 1.5, 4.5, 6), c('パックご飯 200g', 300, 5, 0.7, 68)],
      recipe: {
        ingredients: [
          { name: '豚こま切れ肉', qty: 150, unit: 'g' },
          { name: 'ベルク ざく切りキャベツ', qty: 1, unit: '袋' },
          { name: 'パックご飯 200g', qty: 1, unit: '個' },
        ],
        seasonings: ['みそ', 'みりん', 'サラダ油'],
        steps: [
          'みそ・みりん各大さじ1を混ぜておく。',
          'フライパンに油小さじ1を中火で熱し、豚こまを広げて焼く。色が変わったらキャベツを入れ、蓋をして2分蒸し焼きにする。',
          '蓋を取ってみそだれを絡める。温めたご飯を添える。',
        ],
        note: 'キャベツはカット済みの袋を使うので包丁いらず。',
      },
    },
    {
      id: 'hl-5',
      place: 'belc',
      title: '鶏ひき肉ともやしのそぼろ丼（卵のせ）',
      items: [c('鶏ひき肉（むね）150g', 180, 33, 4.5, 0), p('home-moyashi'), c('卵', 75, 6, 5, 0.3), c('醤油・みりん・砂糖', 45, 1, 0, 9), c('パックご飯 200g', 300, 5, 0.7, 68)],
      recipe: {
        ingredients: [
          { name: '鶏ひき肉（むね）', qty: 150, unit: 'g' },
          { name: 'もやし', qty: 1, unit: '袋' },
          { name: '卵', qty: 1, unit: '個' },
          { name: 'パックご飯 200g', qty: 1, unit: '個' },
        ],
        seasonings: ['醤油', 'みりん', '砂糖（なければなし）', 'チューブ生姜'],
        steps: [
          'フライパンにひき肉と醤油・みりん各大さじ1、砂糖小さじ1、チューブ生姜2cmを入れ、中火で箸でほぐしながら炒る（油はいらない）。',
          '肉の色が変わったらもやしを入れ、蓋をして2分蒸し焼きにし、汁気を飛ばす。',
          'フライパンの端で卵を目玉焼きにするか、溶いて回し入れる。温めたご飯にのせる。',
        ],
        note: '包丁を使わず、フライパン1つで作れます。',
      },
    },
    {
      id: 'hl-6',
      place: 'belc',
      title: 'サラダチキンと卵のチャーハン',
      items: [p('belc-salad-chicken-herb'), c('卵', 75, 6, 5, 0.3, 2), c('冷凍ミックス野菜 100g', 35, 2, 0.3, 7), c('油・鶏ガラ・醤油', 50, 0.5, 4, 1.5), c('パックご飯 200g', 300, 5, 0.7, 68)],
      recipe: {
        ingredients: [
          { name: 'ベルク サラダチキン（ハーブ）', qty: 1, unit: '個' },
          { name: '卵', qty: 2, unit: '個' },
          { name: '冷凍ミックス野菜', qty: 100, unit: 'g' },
          { name: 'パックご飯 200g', qty: 1, unit: '個' },
        ],
        seasonings: ['サラダ油', '鶏ガラスープの素', '醤油', 'こしょう'],
        steps: [
          'サラダチキンは手で細かく裂く。ご飯は温めておく。',
          'フライパンに油小さじ1を中火で熱し、溶き卵を入れてすぐご飯を入れ、ヘラで切るように混ぜる。',
          'サラダチキンと冷凍野菜を凍ったまま加えて2〜3分炒め、鶏ガラ小さじ1、こしょう、醤油少々で味を付ける。',
        ],
        note: '包丁を使わず、フライパン1つで作れます。',
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
        c('油 小さじ1', 37, 0, 4, 0),
        c('冷凍ブロッコリー 100g', 30, 4, 0.5, 4),
        c('パックご飯 150g', 220, 3, 0.5, 51),
      ],
      recipe: {
        ingredients: [
          { name: '鶏むね肉', qty: 250, unit: 'g' },
          { name: '冷凍ブロッコリー', qty: 100, unit: 'g' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['塩こしょう', 'サラダ油'],
        steps: [
          '鶏むねの皮を手ではがし、切らずに1枚のまま、フォークで両面を数か所刺して塩こしょうをすり込む。',
          'フライパンに油小さじ1を中火で熱し、鶏むねを入れて3分焼き、裏返す。',
          '空いた所に冷凍ブロッコリーと水大さじ3を入れ、蓋をして弱火で8分蒸し焼きにする。',
          '火を止めて蓋をしたまま5分置く（余熱で火を通すとしっとりする）。手かフォークで裂いて食べる。ご飯を温める。',
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
        c('たれ・油', 75, 0.5, 4, 8),
        c('千切りキャベツ', 20, 1, 0.1, 4.5),
        c('パックご飯 150g', 220, 3, 0.5, 51),
      ],
      recipe: {
        ingredients: [
          { name: '豚もも薄切り肉', qty: 150, unit: 'g' },
          { name: '千切りキャベツ', qty: 0.5, unit: '袋' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['醤油', 'みりん', 'チューブ生姜', 'サラダ油'],
        steps: [
          '醤油・みりん各大さじ1とチューブ生姜3cmを混ぜて、たれを作る。',
          'フライパンに油小さじ1を中火で熱し、豚肉を広げて両面焼く。',
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
          '豆腐はパックの水を捨て、ヘラかスプーンで4つに割る。しめじは根元を手でちぎってほぐす。',
          'フライパンに豆腐・しめじ・鮭を並べ、酒か水を大さじ2入れて蓋をし、中火で7〜8分蒸し焼きにする。',
          'ポン酢をかけ、温めたご飯を添える（電子レンジなら耐熱皿にのせてラップをし、600Wで5分）。',
        ],
      },
    },
    {
      id: 'hd-4',
      place: 'belc',
      title: '鶏ひき肉の麻婆豆腐＋ご飯',
      items: [c('木綿豆腐 300g', 216, 20, 13, 5), c('鶏ひき肉（むね）100g', 120, 22, 3, 0), c('麻婆豆腐の素（1人分）', 70, 2, 4, 7), c('パックご飯 150g', 220, 3, 0.5, 51)],
      recipe: {
        ingredients: [
          { name: '木綿豆腐', qty: 300, unit: 'g' },
          { name: '鶏ひき肉（むね）', qty: 100, unit: 'g' },
          { name: '麻婆豆腐の素', qty: 0.5, unit: '箱（2人前の半分）' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: [],
        steps: [
          'フライパンでひき肉を中火で炒める（油はいらない）。',
          '麻婆豆腐の素を入れ、豆腐をヘラで一口大にくずしながら入れる。',
          '弱めの中火で3分煮て、付属のとろみ粉を入れて混ぜる。温めたご飯を添える。',
        ],
        note: '豆腐は切らずにヘラでくずせばOK。包丁を使わず、フライパン1つで作れます。',
      },
    },
    {
      id: 'hd-5',
      place: 'belc',
      title: 'ささみのチーズ焼き＋千切りキャベツ',
      items: [c('鶏ささみ 4本（200g）', 196, 46, 1.6, 0), c('スライスチーズ 2枚', 120, 7.5, 9.5, 0.5), c('油 小さじ1', 37, 0, 4, 0), p('belc-cabbage-sengiri-mini'), c('パックご飯 150g', 220, 3, 0.5, 51)],
      recipe: {
        ingredients: [
          { name: '鶏ささみ', qty: 4, unit: '本' },
          { name: 'スライスチーズ', qty: 2, unit: '枚' },
          { name: 'ベルク 千切りキャベツ ミニ', qty: 1, unit: '袋' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['塩こしょう', 'サラダ油'],
        steps: [
          'ささみは切らずにそのまま、フォークで数か所刺して塩こしょうをふる（筋は気にならなければそのままで良い）。',
          'フライパンに油小さじ1を中火で熱し、ささみを2分焼いて裏返す。',
          'チーズを手でちぎってのせ、水大さじ2を入れて蓋をし、弱火で4分蒸し焼きにする。千切りキャベツとご飯を添える。',
        ],
        note: '包丁を使わず、フライパン1つで作れます。',
      },
    },
    {
      id: 'hd-6',
      place: 'belc',
      title: '鮭のちゃんちゃん焼き（キャベツ・えのき）',
      items: [c('生鮭 1切れ', 130, 22, 4, 0.1), p('belc-cabbage-zaku'), p('home-enoki'), c('みそ・みりん・バター', 80, 1.5, 4, 8), c('パックご飯 150g', 220, 3, 0.5, 51)],
      recipe: {
        ingredients: [
          { name: '生鮭', qty: 1, unit: '切れ' },
          { name: 'ベルク ざく切りキャベツ', qty: 1, unit: '袋' },
          { name: 'えのき', qty: 1, unit: '袋' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['みそ', 'みりん', 'バター（5g）'],
        steps: [
          'みそ・みりん各大さじ1を混ぜておく。えのきは根元を手でちぎってほぐす。',
          'フライパンにキャベツとえのきを敷き、真ん中に鮭をのせ、みそだれをかけてバターをのせる。',
          '水大さじ3を入れて蓋をし、中火で8〜10分蒸し焼きにする。鮭を箸でほぐして野菜と混ぜる。ご飯を添える。',
        ],
        note: '包丁を使わず、フライパン1つで作れます。',
      },
    },
    {
      id: 'hd-7',
      place: 'belc',
      title: '豚しゃぶともやしの蒸し焼き（ポン酢）',
      items: [c('豚ロース しゃぶしゃぶ用 150g', 300, 28.5, 19.5, 0.3), p('home-moyashi'), c('ポン酢 大さじ2', 15, 0.5, 0, 3), c('パックご飯 150g', 220, 3, 0.5, 51)],
      recipe: {
        ingredients: [
          { name: '豚ロース しゃぶしゃぶ用', qty: 150, unit: 'g' },
          { name: 'もやし', qty: 1, unit: '袋' },
          { name: 'パックご飯 150g', qty: 1, unit: '個' },
        ],
        seasonings: ['ポン酢', '酒（なければ水）'],
        steps: [
          'フライパンにもやしを広げ、その上に豚肉を1枚ずつ広げてのせる。',
          '酒か水を大さじ3入れて蓋をし、中火で5〜6分、肉の色が変わるまで蒸し焼きにする。',
          'ポン酢をかけて食べる。ご飯を添える。',
        ],
        note: '脂が気になるときは豚もも（しゃぶしゃぶ用）にすると脂質が半分くらいになります。包丁を使わず、フライパン1つで作れます。',
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
