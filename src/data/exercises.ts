import type { Exercise, ExerciseCategory } from '../types';

type Def = [id: string, name: string, repMin: number, repMax: number, increment: number, howTo: string, altId?: string];

const main: Def[] = [
  // メニューA（押す日）
  ['leg-press', 'レッグプレス', 10, 12, 5,
    '背もたれに腰をつけ、膝が90度くらい曲がる位置にシートを合わせる。足は肩幅でプレートの中央に置き、かかとで押して膝を伸ばし切らずに戻す。',
    'smith-squat'],
  ['chest-press', 'チェストプレス', 8, 10, 5,
    'グリップが胸の中央（乳首の高さ）に来るようにシートの高さを合わせる。胸を張って肩をすくめずに押し、肘が体の少し後ろに来るまでゆっくり戻す。',
    'cable-chest-press'],
  ['shoulder-press', 'ショルダープレス', 10, 12, 2.5,
    'グリップが肩の高さに来るようにシートを合わせ、背中をパッドにつける。真上に押し上げ、肘が肩より少し下に来るまでゆっくり下ろす。',
    'smith-shoulder-press'],
  ['leg-extension', 'レッグエクステンション', 12, 15, 4,
    '膝の関節を回転軸の赤い印に合わせ、足首のパッドをすねの下側に当てる。膝を伸ばし切って1秒止め、ゆっくり戻す。',
    'leg-press-low'],
  ['pushdown', 'ケーブル プッシュダウン', 12, 15, 2.5,
    'ケーブルを一番上にしてロープかバーを付け、肘を脇腹に固定する。肘から先だけを動かして下まで伸ばし、肘が90度になるまで戻す。',
    'overhead-extension'],
  ['abdominal', 'アブドミナル', 12, 15, 5,
    'パッドが胸の上部に当たる高さにシートを合わせる。おへそをのぞき込むように背中を丸めて縮め、反動を使わずにゆっくり戻す。',
    'cable-crunch'],
  // メニューB（引く日）
  ['leg-curl', 'レッグカール', 10, 12, 5,
    '膝の関節を回転軸の印に合わせ、足首の後ろ（アキレス腱の上）にパッドを当てる。かかとをお尻に近づけるように曲げ、ゆっくり戻す。',
    'back-extension'],
  ['lat-pulldown', 'ラットプルダウン', 10, 12, 5,
    '太ももパッドで膝をしっかり固定し、肩幅より広くバーを握る。胸を張ったまま鎖骨に向けて肘を下に引き、腕が伸びるまでゆっくり戻す。',
    'assisted-pullup'],
  ['seated-row', 'シーテッドロウ', 10, 12, 5,
    'グリップがみぞおちの高さに来るようにシートを合わせ、胸をパッドにつける。肩甲骨を寄せるように肘を後ろへ引き、ゆっくり戻す。',
    'one-arm-row'],
  ['pec-fly', 'ペックフライ', 12, 15, 2.5,
    'グリップが肩の少し下に来るようにシートを合わせ、肘を軽く曲げたまま固定する。胸の前で手を閉じ、胸のストレッチを感じるところまで開く。',
    'cable-crossover'],
  ['cable-lateral', 'ケーブル サイドレイズ', 12, 15, 2.5,
    'ケーブルを一番下にしてハンドルを付け、体の反対側の手で持つ。肘を軽く曲げたまま肩の高さまで横に上げ、ゆっくり下ろす。',
    'machine-lateral'],
  ['cable-curl', 'ケーブル カール', 12, 15, 2.5,
    'ケーブルを一番下にしてバーを付け、肘を脇腹に固定する。肘の位置を動かさずに巻き上げ、腕が伸び切る手前までゆっくり下ろす。',
    'machine-curl'],
];

const alternatives: Def[] = [
  ['smith-squat', 'スミスマシン スクワット', 10, 12, 5,
    'バーを肩の高さにセットし、足をバーより半歩前に出して肩幅に開く。太ももが床と平行になるまでしゃがみ、かかとで押して立つ。'],
  ['smith-chest-press', 'スミスマシン チェストプレス', 8, 10, 2.5,
    'ベンチをバーの真下に置いて仰向けになり、バーが胸の中央（乳首の高さ）に下りる位置に合わせる。肩甲骨を寄せて胸を張り、胸の手前まで下ろして真上に押し上げる。安全ストッパーを胸より少し下にセットする。'],
  ['cable-chest-press', 'ケーブル チェストプレス', 8, 10, 2.5,
    'ケーブルを胸の高さに合わせ、両手にハンドルを持ってマシンに背を向けて一歩前に出る。胸の前に押し出し、肘が体の横に来るまで戻す。'],
  ['smith-shoulder-press', 'スミスマシン ショルダープレス', 10, 12, 2.5,
    'ベンチを垂直にしてバーの真下に座り、バーをあごの高さから始める。真上に押し上げ、あごの高さまでゆっくり下ろす。'],
  ['leg-press-low', 'レッグプレス（足を低めに置く）', 12, 15, 5,
    'レッグプレスでプレートの下の方に足を置き、膝が前に出るようにして太ももの前側を効かせる。深く曲げすぎず、膝の痛みがない範囲で動かす。'],
  ['overhead-extension', 'ケーブル オーバーヘッドエクステンション', 12, 15, 2.5,
    'ケーブルを低めにしてロープを付け、マシンに背を向けて頭の後ろで持つ。肘の位置を固定したまま、前上方へ腕を伸ばす。'],
  ['cable-crunch', 'ケーブル クランチ', 12, 15, 2.5,
    'ケーブルを一番上にしてロープを付け、膝立ちで頭の横に持つ。腰は動かさず、みぞおちを丸めるように上体を曲げる。'],
  ['back-extension', 'バックエクステンション', 10, 12, 2.5,
    'パッドが骨盤の少し下に来るように高さを合わせ、足首を固定する。上体を下ろしてから、体が一直線になるまで起こす（反りすぎない）。'],
  ['assisted-pullup', 'アシスト懸垂マシン', 10, 12, 5,
    '膝（または足）を台に乗せ、肩幅より広くグリップを握る。あごがバーを越えるまで体を引き上げ、ゆっくり下ろす。数字が大きいほど楽になるので、全セットできたら補助を減らす（数字を小さくする）。'],
  ['one-arm-row', 'ケーブル ワンハンドロウ', 10, 12, 2.5,
    'ケーブルをみぞおちの高さにしてハンドルを片手で持つ。肘を脇腹に沿わせて後ろへ引き、肩甲骨を寄せてからゆっくり戻す。'],
  ['cable-crossover', 'ケーブル クロスオーバー', 12, 15, 2.5,
    '左右のケーブルを肩より上にセットし、中央で一歩前に出る。肘を軽く曲げたまま、弧を描くようにへその前で手を合わせる。'],
  ['machine-lateral', 'マシン ラテラルレイズ', 12, 15, 2.5,
    '肩の関節がマシンの回転軸と一直線になるようにシートを合わせる。肘のパッドを外側へ押し上げ、肩の高さで止めてゆっくり戻す。'],
  ['machine-curl', 'マシン アームカール', 12, 15, 2.5,
    '脇の下がパッドの上端に来るようにシートを合わせ、腕をパッドに乗せる。肘を固定したまま巻き上げ、伸び切る手前まで戻す。'],
  // ---- 新しいジム（LifeFit）で使う種目 ----
  ['rack-bench-press', 'パワーラック ベンチプレス', 6, 8, 2.5,
    'ベンチをラックの中に置き、セーフティバーを胸より少し下にセットする。肩甲骨を寄せて胸を張り、バーを胸の中央（乳首の高さ）まで下ろして真上に押し上げる。足は床につけて踏ん張る。'],
  ['plate-leg-press', 'プレートレッグプレス', 8, 10, 5,
    'プレートを付けて使うレッグプレス。足は肩幅でプレートの中央に置き、膝が90度くらいまで下ろして、かかとで押し戻す。膝は伸ばし切らない。'],
  ['dumbbell-shoulder-press', 'ダンベル ショルダープレス', 8, 10, 2,
    'ベンチの背もたれを垂直に近く立てて座り、ダンベルを耳の横に構える。真上に押し上げ、肘が肩の高さになるまでゆっくり下ろす。'],
  ['assisted-dips', 'アシスト ディップス', 12, 15, 5,
    'アシストチンニング×ディップスのマシンで、膝をパッドに乗せる。体をやや前に倒さず起こしたまま、肘を後ろに曲げて下り、肘を伸ばして押し上げる（二の腕に効かせる）。数値が大きいほど楽。'],
  ['dumbbell-lateral', 'ダンベル サイドレイズ', 12, 15, 1,
    'ダンベルを体の横に持ち、肘を軽く曲げたまま肩の高さまで横に上げる。肩をすくめず、ゆっくり下ろす。'],
  ['dumbbell-curl', 'ダンベル カール', 10, 12, 1,
    'ダンベルを体の横に持ち、肘を脇腹に固定したまま小指側から巻き上げる。反動を使わず、伸び切る手前まで下ろす。'],
];

/** 補助の重さを選ぶマシン（数値が大きいほど楽。上達したら数値を小さくする） */
export const ASSIST_EXERCISES = ['assisted-pullup', 'assisted-dips'];

/** 初期の種目の分類 */
export const SEED_CATEGORY: Record<string, ExerciseCategory> = {
  'chest-press': '胸', 'cable-chest-press': '胸', 'smith-chest-press': '胸', 'pec-fly': '胸', 'cable-crossover': '胸',
  'lat-pulldown': '背中', 'seated-row': '背中', 'assisted-pullup': '背中', 'one-arm-row': '背中', 'back-extension': '背中',
  'shoulder-press': '肩', 'smith-shoulder-press': '肩', 'cable-lateral': '肩', 'machine-lateral': '肩',
  'pushdown': '腕', 'overhead-extension': '腕', 'cable-curl': '腕', 'machine-curl': '腕',
  'leg-press': '脚', 'leg-press-low': '脚', 'leg-extension': '脚', 'leg-curl': '脚', 'smith-squat': '脚',
  'abdominal': 'お腹', 'cable-crunch': 'お腹',
  'rack-bench-press': '胸', 'plate-leg-press': '脚', 'dumbbell-shoulder-press': '肩', 'assisted-dips': '腕', 'dumbbell-lateral': '肩', 'dumbbell-curl': '腕',
};

const toExercise = ([id, name, repMin, repMax, increment, howTo, altId]: Def): Exercise => ({
  id, name, repMin, repMax, increment, howTo, sets: 3, category: SEED_CATEGORY[id],
  ...(altId ? { altIds: [altId] } : {}),
  ...(ASSIST_EXERCISES.includes(id) ? { assist: true } : {}),
});

/** ジムを変えても記録を引き継ぐ種目（どこでも同じ器具）。名前からの判定は carryOverByName */
export const CARRY_OVER_IDS = ['smith-squat', 'smith-shoulder-press', 'smith-chest-press', 'rack-bench-press', 'dumbbell-shoulder-press', 'dumbbell-lateral', 'dumbbell-curl'];
export const carryOverByName = (name: string) => /スミス|パワーラック|ダンベル|バーベル|ベンチプレス|懸垂(?!マシン)|ディップス(?!マシン)/.test(name);

/** 枠で選べる種目を2つ以上持つもの（Def の altId は1つだけなので、ここで足す） */
export const EXTRA_OPTIONS: Record<string, string[]> = {
  'chest-press': ['smith-chest-press'],
};

export const SEED_EXERCISES: Exercise[] = [...main, ...alternatives].map(toExercise).map((e) => ({
  ...e,
  ...(EXTRA_OPTIONS[e.id] ? { altIds: [...(e.altIds ?? []), ...EXTRA_OPTIONS[e.id]] } : {}),
  ...(CARRY_OVER_IDS.includes(e.id) ? { carryOver: true } : {}),
}));
export const DEFAULT_MENU_A = main.slice(0, 6).map((d) => d[0]);
export const DEFAULT_MENU_B = main.slice(6, 12).map((d) => d[0]);

/**
 * 新しいジム（LifeFit イオンタウン小郡）のメニュー。ジムを変えた日に切り替える。
 * 各日の1つ目は重く（6〜8回×4）、次に8〜10回、仕上げに12〜15回。重さの停滞を動かすための組み方。
 * options：その枠で選べる種目（ない器具のマシン ラテラルレイズ・マシン アームカール・バックエクステンションは外す）
 */
export const NEW_GYM_PLAN = {
  menuA: ['rack-bench-press', 'leg-press', 'shoulder-press', 'leg-extension', 'pushdown', 'abdominal'],
  menuB: ['lat-pulldown', 'seated-row', 'leg-curl', 'pec-fly', 'cable-lateral', 'cable-curl'],
  options: {
    'rack-bench-press': ['smith-chest-press', 'chest-press'],
    'leg-press': ['smith-squat', 'plate-leg-press'],
    'shoulder-press': ['smith-shoulder-press', 'dumbbell-shoulder-press'],
    'leg-extension': ['leg-press-low'],
    'pushdown': ['overhead-extension', 'assisted-dips'],
    'abdominal': ['cable-crunch'],
    'lat-pulldown': ['assisted-pullup'],
    'seated-row': ['one-arm-row'],
    'leg-curl': [],
    'pec-fly': ['cable-crossover'],
    'cable-lateral': ['dumbbell-lateral'],
    'cable-curl': ['dumbbell-curl'],
  } as Record<string, string[]>,
  /** 回数とセット数（枠で選べる種目にも同じ回数・セット数を使う） */
  reps: {
    'rack-bench-press': [6, 8, 4],
    'lat-pulldown': [6, 8, 4],
    'leg-press': [8, 10, 3],
    'shoulder-press': [8, 10, 3],
    'seated-row': [8, 10, 3],
    'leg-curl': [10, 12, 3],
    'cable-curl': [10, 12, 3],
    'leg-extension': [12, 15, 3],
    'pushdown': [12, 15, 3],
    'abdominal': [12, 15, 3],
    'pec-fly': [12, 15, 3],
    'cable-lateral': [12, 15, 3],
  } as Record<string, [number, number, number]>,
};
