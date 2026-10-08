import type { Category, Product, Store } from '../types';

/** 公式の栄養成分で確かめた初期データ（「目安」を付けない） */
export const VERIFIED = new Set([
  '7-dressing-koku-onion', '7-mushidori-egg-salad',
  '7-yakitori', '7-zaru-soba', '7-tonjiru', '7-nanachiki',
  '7-tofu-hamburg', '7-nikuyasai', '7-salmon-saikyo', '7-pork-egg-itame', '7-agedori', '7-niku-soba',
  '7-tonshabu-pasta', '7-mushi-mame', '7-oden-egg', '7-oden-atsuage', '7-oden-daikon',
  '7-smoked-nitamago',
  'l-chicken-stick-yuzu', 'l-tororo-soba', 'l-tofu-stick-konbu', '7-goma-mushidori-soba', 'savas-milk-fruit-430', '7-tonshabu-salad',
  'eo-matsuya-negitama-gyumeshi', 'l-tori-liver', '7-chicken-bar-smoke-pepper', '7-ebi-doria', 'l-rosu-katsudon',
]);

/** v16 でローソン公式サイトの値に見直した商品 */
export const UPDATED_TO_OFFICIAL_V16 = [
  'salad-chicken', 'onigiri-sake', 'onigiri-ume', 'onigiri-konbu', 'onigiri-tunamayo', 'bran-bread',
  'zaru-soba', 'tonjiru', 'karaage-kun', 'l-lchiki', 'l-saba-shioyaki',
];

/** v16 で追加したローソンの商品（すべて公式サイトの値） */
const ADDED_LAWSON_V16 = [
  'l-salad-chicken-herb', 'l-salad-chicken-smoke', 'l-salad-chicken-umeshiso', 'l-sunagimo', 'l-nankotsu-tsukune',
  'l-sumibi-3', 'l-ginzake', 'l-hokke', 'l-sanma', 'l-takobutsu', 'l-yakiika', 'l-mamaru-dori', 'l-paripari-chicken',
  'l-grill-chicken-kushi', 'l-karaage-kun-red', 'l-nitamago', 'l-uzura', 'l-umakara-tamago', 'l-natto', 'l-edamame',
  'l-nomu-yogurt', 'l-egg-broccoli', 'l-munenikusalad', 'l-mushidori-salad', 'l-yodaredori', 'l-tonshabu-pasta',
  'l-tonjiru-yadoroku', 'l-wafu-soup', 'l-kake-soba', 'l-nebaneba-soba', 'l-niku-soba', 'l-hiyashi-chuka',
  'l-pescatore', 'l-sakurajima-pasta', 'l-oyakodon', 'l-shogayaki-bento', 'l-yakibuta-don', 'l-onigiri-big-sake',
  'l-onigiri-edamame', 'l-shio-nigiri', 'l-teriyaki-egg-sand', 'l-ham-cheese-egg-sand', 'l-chicken-katsu-sand',
  'l-bran-shokupan',
];
for (const id of [...UPDATED_TO_OFFICIAL_V16, ...ADDED_LAWSON_V16]) VERIFIED.add(id);

// 数値は一般的な商品の目安（kcal, たんぱく質g, 脂質g, 炭水化物g）。
// パッケージの栄養成分表示やお店の公表値で上書きできる。
type Row = [id: string, name: string, category: Category, kcal: number, p: number, f: number, c: number];

const lawson: Row[] = [
  // ローソン公式サイトの栄養成分（1包装・1個あたり）
  ['salad-chicken', 'サラダチキン プレーン（たんぱく質30.3g）', 'チキン・肉', 141, 30.3, 2.1, 0.2],
  // チキンバー・ゆで卵・焼き鳥・ギリシャヨーグルト・プロテインバー・味噌汁・サラダは公式サイトに同じ商品がないため目安
  ['chicken-bar', 'サラダチキンバー', 'チキン・肉', 75, 11, 2.5, 1.5],
  ['boiled-egg', 'ゆで卵', '卵・乳製品', 75, 6, 5, 0.3],
  ['yakitori-shio', '焼き鳥 塩（2本）', 'チキン・肉', 150, 16, 8, 2],
  ['onigiri-sake', '手巻おにぎり 炙り熟成紅鮭', 'おにぎり', 174, 4.8, 1.9, 35.1],
  ['onigiri-ume', '手巻おにぎり 熟成紀州南高梅', 'おにぎり', 167, 3, 1.1, 36.8],
  ['onigiri-konbu', '手巻おにぎり 北海道産日高昆布', 'おにぎり', 173, 3.5, 0.9, 38.6],
  ['onigiri-tunamayo', '手巻おにぎり シーチキンマヨネーズ', 'おにぎり', 226, 4.2, 7.7, 35.7],
  ['bran-bread', 'NL たんぱく質が摂れるブランパン（2個）', 'パン', 132, 12.2, 5.6, 12.2],
  ['greek-yogurt', 'ギリシャヨーグルト', '卵・乳製品', 95, 10, 0.3, 13],
  ['protein-bar', 'プロテインバー', 'プロテイン', 200, 15, 9, 16],
  ['zaru-soba', '香りとのど越し ざるそば', '麺', 352, 21.2, 3.4, 62.3],
  ['miso-soup', '味噌汁', '汁物・サラダ', 35, 2, 1.2, 4],
  ['tonjiru', '豚汁（230g）', '汁物・サラダ', 113, 4.8, 5.8, 11.7],
  ['salad-nonoil', 'サラダ（ノンオイル）', '汁物・サラダ', 50, 2, 0.5, 9],
  ['karaage-kun', 'からあげクン レギュラー（5個）', 'ホットスナック', 226, 14.4, 15.4, 7.8],
  ['l-lchiki', 'Lチキ レギュラー', 'ホットスナック', 255, 13.7, 16.6, 12.8],
  ['l-saba-shioyaki', 'さばの塩焼（1切）', 'チキン・肉', 245, 16.4, 22, 0.5],
  // おでんは公式サイトが100gあたりの表示で1個の重さがわからないため目安
  ['l-oden-egg', 'おでん たまご', '卵・乳製品', 80, 6.5, 5.5, 1],
  ['l-oden-atsuage', 'おでん 厚揚げ', '卵・乳製品', 80, 6, 5.5, 1.5],
  ['l-oden-daikon', 'おでん 大根', '汁物・サラダ', 10, 0.4, 0.1, 2.2],
  // ローソン公式サイトの栄養成分（炭水化物は幅のある表示の中間値）
  ['l-chicken-stick-yuzu', 'サラダチキンスティック 柚子こしょう（65g）', 'チキン・肉', 83, 10.1, 3.3, 3.4],
  ['l-tororo-soba', '香りとのど越し 冷しとろろそば', '麺', 323, 18.9, 2.8, 58.2],
  // ここから下もローソン公式サイトの栄養成分（1包装・1個あたり）
  ['l-salad-chicken-herb', 'サラダチキン ハーブ', 'チキン・肉', 119, 23.1, 1.8, 2.7],
  ['l-salad-chicken-smoke', 'サラダチキン スモーク', 'チキン・肉', 120, 23.8, 1.4, 3],
  ['l-salad-chicken-umeshiso', 'サラダチキン 梅しそ', 'チキン・肉', 130, 24.9, 1.7, 3.9],
  ['l-sunagimo', '炭火香る！砂肝の焼鳥', 'チキン・肉', 70, 11.9, 1.4, 2.4],
  ['l-tori-liver', '炭火香る！鶏レバー焼', 'チキン・肉', 99, 14.6, 3.4, 2.3],
  ['l-nankotsu-tsukune', '炭火香る！なんこつ塩つくね', 'チキン・肉', 102, 12.4, 5, 2],
  ['l-sumibi-3', '鶏の炭火焼き3種盛り', 'チキン・肉', 303, 27.2, 15.3, 15.1],
  ['l-ginzake', '銀鮭の塩焼（1切）', 'チキン・肉', 135, 12, 9.7, 0],
  ['l-hokke', '縞ほっけの塩焼（1切）', 'チキン・肉', 106, 12.5, 6.2, 0],
  ['l-sanma', '国産さんまの塩焼（1尾）', 'チキン・肉', 121, 17.6, 5.6, 0],
  ['l-takobutsu', 'たこぶつ', 'チキン・肉', 67, 13.4, 0.5, 1.3],
  ['l-yakiika', 'おつまみ焼きいか', 'チキン・肉', 79, 14.8, 1.7, 1.1],
  ['l-mamaru-dori', 'まんまる鶏', 'ホットスナック', 207, 17.4, 12.3, 6.9],
  ['l-paripari-chicken', 'パリパリチキン', 'ホットスナック', 171, 16, 10.3, 3.8],
  ['l-grill-chicken-kushi', 'グリルチキン串', 'ホットスナック', 113, 9.9, 5.7, 5.8],
  ['l-karaage-kun-red', 'からあげクン レッド（5個）', 'ホットスナック', 225, 14.3, 15.1, 8.1],
  ['l-nitamago', '煮たまご（1個）', '卵・乳製品', 78, 6.5, 5.5, 0.6],
  ['l-uzura', 'うずらのたまご', '卵・乳製品', 145, 10, 11.5, 0.7],
  ['l-umakara-tamago', 'ねぎだれで食べる 旨辛たまご', '卵・乳製品', 164, 13.7, 10.5, 4.3],
  ['l-natto', '極小粒納豆（1パック）', '卵・乳製品', 101, 8.3, 5, 7.6],
  ['l-edamame', '塩ゆで枝豆', '汁物・サラダ', 111, 9, 5.3, 7.4],
  ['l-nomu-yogurt', 'のむヨーグルト プレーン（240g）', '卵・乳製品', 142, 7.4, 0.2, 27.7],
  ['l-egg-broccoli', 'たんぱく質が摂れる たまご＆ブロッコリー', '汁物・サラダ', 116, 15.5, 5.6, 1.8],
  ['l-munenikusalad', 'たんぱく質が摂れる 国産鶏むね肉のサラダ', '汁物・サラダ', 199, 23.2, 10.1, 5.1],
  ['l-mushidori-salad', '蒸し鶏のサラダ', '汁物・サラダ', 52, 7.6, 0.5, 5.5],
  ['l-yodaredori', '魏さんの本格よだれ鶏', 'チキン・肉', 94, 8.7, 4.3, 5.8],
  ['l-tonshabu-pasta', '0秒パスタサラダ 豚しゃぶ', '麺', 404, 16, 20.5, 41.3],
  ['l-tonjiru-yadoroku', 'おにぎり浅草宿六監修 こだわり味噌の豚汁', '汁物・サラダ', 111, 10, 6.4, 4.8],
  ['l-wafu-soup', '食物繊維が摂れる 地鶏出汁きかせた和風スープ', '汁物・サラダ', 77, 6.7, 1.4, 11.2],
  ['l-kake-soba', 'つゆが主役！かけそば', '麺', 272, 20.7, 1.7, 45.7],
  ['l-nebaneba-soba', '香りとのど越し ミニネバネバそば', '麺', 238, 13.3, 4.2, 39.1],
  ['l-niku-soba', '特盛！冷し肉そば', '麺', 614, 35.2, 14, 90.7],
  ['l-hiyashi-chuka', '冷し中華', '麺', 432, 21, 10.5, 65.6],
  ['l-pescatore', '贅沢すぎ！海鮮づくしペスカトーレ', '麺', 465, 30, 10.1, 66.4],
  ['l-sakurajima-pasta', 'こだわりおだしの生パスタ 桜島どりと九条ねぎ', '麺', 447, 24.4, 6.3, 75.5],
  ['l-oyakodon', 'ヨード卵・光の親子丼', '外食・定食', 497, 24.8, 10, 77.7],
  ['l-rosu-katsudon', 'とろーりたまごの三元豚厚切りロースカツ丼', '外食・定食', 647, 21.8, 19, 97.8],
  ['l-shogayaki-bento', '国産生姜の豚生姜焼弁当', '外食・定食', 632, 28.9, 20.9, 84.4],
  ['l-yakibuta-don', '直火で炙った焼豚丼', '外食・定食', 551, 24.9, 16.2, 78.1],
  ['l-onigiri-big-sake', '大きなおにぎり 鮭', 'おにぎり', 283, 7.7, 2.5, 58.6],
  ['l-onigiri-edamame', '枝豆と塩昆布おにぎり（もち麦入り）', 'おにぎり', 172, 5.1, 2.2, 36.9],
  ['l-shio-nigiri', '塩にぎり', 'おにぎり', 173, 2.9, 0.9, 38.7],
  ['l-teriyaki-egg-sand', '照焼チキンたまごサンド', 'パン', 235, 12, 9.4, 26.1],
  ['l-ham-cheese-egg-sand', 'ハムチーズたまごサンド', 'パン', 255, 11.9, 12.8, 23.7],
  ['l-chicken-katsu-sand', 'チキンカツサンド', 'パン', 455, 23, 21.4, 43.4],
  ['l-bran-shokupan', 'NL たんぱく質が摂れるブラン入り食パン（1枚）', 'パン', 104, 7.2, 2.1, 16],
  ['l-tofu-stick-konbu', '豆腐スティック 旨み昆布（68g）', '卵・乳製品', 102, 11.8, 5.9, 0.6],
];

const seven: Row[] = [
  ['7-salad-chicken', 'セブン サラダチキン プレーン', 'チキン・肉', 115, 24, 1.5, 1],
  ['7-chicken-bar', 'セブン サラダチキンバー', 'チキン・肉', 70, 11, 2, 1.5],
  // kcalは表示のPFCから計算（4×P＋9×F＋4×C）
  ['7-chicken-bar-smoke-pepper', 'セブン 糖質0gサラダチキンバー スモークペッパー', 'チキン・肉', 63, 13.6, 0.9, 0.1],
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
  // 公式の値（item/104613）。表示に「何個当たり」がないが、卵1個分の値なので1個として登録
  ['7-smoked-nitamago', 'セブン 7P 燻製風 半熟煮たまご（1個）', '卵・乳製品', 73, 6.3, 4.6, 1.3],
  // 商品の表示の値（ユーザーが確認）
  ['7-goma-mushidori-soba', 'セブン ピリ辛濃厚ごまだれ 冷し蒸し鶏そば', '麺', 630, 27.7, 33.1, 58.3],
  // セブン‐イレブン公式サイトの栄養成分（item/104228）
  ['7-tonshabu-salad', 'セブン たんぱく質が摂れる豚しゃぶサラダ', '汁物・サラダ', 131, 18.2, 5.3, 3.6],
  ['7-ebi-doria', 'セブン クリーミーソースの海老ドリア', '外食・定食', 412, 13.7, 11.5, 65.1],
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
  13: ['7-smoked-nitamago'],
  15: ['l-chicken-stick-yuzu', 'l-tororo-soba'],
  16: ADDED_LAWSON_V16,
  17: ['l-tofu-stick-konbu'],
  18: ['7-goma-mushidori-soba'],
  19: ['savas-milk-fruit-430'],
  20: ['7-tonshabu-salad'],
  22: ['eo-matsuya-negitama-gyumeshi'],
  23: ['l-tori-liver'],
  24: ['7-chicken-bar-smoke-pepper'],
  25: ['7-ebi-doria'],
  26: ['l-rosu-katsudon'],
};

// どちらのコンビニでも買えるもの
const common: Row[] = [
  ['savas-milk', 'ザバス ミルクプロテイン 脂肪0 200ml', 'プロテイン', 102, 15, 0, 10.5],
  ['savas-milk-cocoa-430', 'ザバス MILK PROTEIN 脂肪0 ココア味 430ml', 'プロテイン', 160, 20, 0, 20],
  ['savas-milk-fruit-430', 'ザバス MILK PROTEIN 脂肪0 フルーツミックス風味 430ml', 'プロテイン', 135, 20, 0, 15.8],
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
  ['eo-matsuya-negitama-gyumeshi', '松屋 ネギたっぷり旨辛ネギたま牛めし', '外食・定食', 821, 24.7, 36.2, 94.5],
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
