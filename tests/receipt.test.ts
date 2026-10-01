import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { AppDB, defaultSettings } from '../src/db';
import { categorize, cleanOcrText, detectDate, detectStore, parseReceipt, ruleKey, rulesMap, sumItems } from '../src/lib/receipt';
import { exportBackup, importBackup, parseBackup } from '../src/lib/backup';
import { SEED_PRODUCTS } from '../src/data/products';

const LAWSON = `
LAWSON
ローソン 新宿西口店
TEL 03-1234-5678
2026年9月29日(火) 12:34 レジ2
領収書
サラダチキン プレーン      ¥228軽
おにぎり 鮭                ¥160軽
からあげクン レギュラー    ¥248軽
お~いお茶 525ml            ¥151軽
値引                        -30
レジ袋 M                    ¥5
小計                     ¥762
(8%対象 ¥757)
(内消費税等 ¥56)
合 計                    ¥762
お預り                   ¥1,000
お釣                      ¥238
`;

const SEVEN = `
セブン-イレブン
2026/10/02 19:05
ﾅﾅﾁｷ           ¥220
ｷﾞﾘｼｬﾖｰｸﾞﾙﾄ    ¥178
ポテトチップス うすしお ¥148
合計 ¥546
nanaco支払 ¥546
`;

describe('レシートの読み取り', () => {
  it('ローソンのレシートから日付・品目・金額・合計・値引きを取り出す', () => {
    const r = parseReceipt(LAWSON);
    expect(r.store).toBe('lawson');
    expect(r.date).toBe('2026-09-29');
    expect(r.total).toBe(762);
    expect(r.items.map((i) => [i.name, i.price, i.category])).toEqual([
      ['サラダチキン プレーン', 228, 'meal'],
      ['おにぎり 鮭', 160, 'meal'],
      ['からあげクン レギュラー', 248, 'meal'],
      ['お~いお茶 525ml', 151, 'drink'],
      ['値引', -30, 'drink'],
      ['レジ袋 M', 5, 'daily'],
    ]);
    expect(sumItems(r.items)).toBe(762);
  });

  it('セブンのレシート（半角カナ）も読める', () => {
    const r = parseReceipt(SEVEN);
    expect(r.store).toBe('seven');
    expect(r.date).toBe('2026-10-02');
    expect(r.total).toBe(546);
    expect(r.items.map((i) => i.name)).toEqual(['ナナチキ', 'ギリシャヨーグルト', 'ポテトチップス うすしお']);
    expect(r.items.find((i) => i.name.startsWith('ポテト'))?.category).toBe('snack');
    expect(r.items.find((i) => i.name.startsWith('ギリシャ'))?.category).toBe('meal');
  });

  it('文字認識で日本語の間に入った空白を詰めて読める', () => {
    const ocr = 'ロー ソン 新宿 西口 店\n2026 年 9 月 29 日 ( 火 ) 12:34\nサラ ダチ キン \\228\nお に ぎり 鮭 \\160\n合計 \\388';
    const r = parseReceipt(cleanOcrText(ocr));
    expect(r.store).toBe('lawson');
    expect(r.date).toBe('2026-09-29');
    expect(r.total).toBe(388);
    expect(r.items.map((i) => [i.name, i.price])).toEqual([['サラダチキン', 228], ['おにぎり鮭', 160]]);
  });

  it('文字認識の化け（¥→y、0→C、軽→別の字、区切りの空白）があっても金額を読める', () => {
    const ocr = [
      'ローソン 西新宿六丁目店',
      '2626年9月36日(水) 8:12', // 年や日が化けても品目にしない
      'サラダチキンプレーン       \\ 228還',
      'ななチキ y226 軽',
      'ゆでたまご y\\85 軽',
      'カフェラテ M ¥ギ190軽',
      'おにぎり 鮭 ¥16O軽',
      '小                   \\1.C07',
      '合                   \\ 1, 007',
      'PayPay               \\1, 007',
    ].join('\n');
    const r = parseReceipt(ocr);
    expect(r.items.map((i) => [i.name, i.price])).toEqual([
      ['サラダチキンプレーン', 228],
      ['ななチキ', 226],
      ['ゆでたまご', 85],
      ['カフェラテ M', 190],
      ['おにぎり 鮭', 160],
    ]);
    expect(r.total).toBe(1007);
  });

  it('合計より後（お預り・お釣・支払い）と、小計より後の税の行は品目にしない', () => {
    const r = parseReceipt('おにぎり ¥160\n小計 ¥160\n(8%対多 ¥160)\n値引 -20\n合計 ¥140\nお融り ¥1,000\nお包 ¥860\nレシート番号 ¥123');
    expect(r.items.map((i) => [i.name, i.price])).toEqual([['おにぎり', 160], ['値引', -20]]);
    expect(r.total).toBe(140);
  });

  it('合計が読めないときは小計を合計として使う', () => {
    expect(parseReceipt('おにぎり ¥160\nお茶 ¥151\n小計 ¥311').total).toBe(311);
  });

  it('品名と金額が別々の行に分かれていても（iPhoneの文字認識のコピーなど）対応させる', () => {
    const live = [
      'LAWSON', 'ローソン 新宿西口店', '2026年9月29日(火) 12:34',
      '領収書', 'サラダチキン プレーン', 'おにぎり 鮭', 'お~いお茶 525ml', '小計', '合計',
      '¥228軽', '¥160軽', '¥151軽', '¥539', '¥539',
      'お預り', 'お釣', '¥1,000', '¥461',
    ].join('\n');
    const r = parseReceipt(live);
    expect(r.store).toBe('lawson');
    expect(r.date).toBe('2026-09-29');
    expect(r.items.map((i) => [i.name, i.price])).toEqual([
      ['サラダチキン プレーン', 228], ['おにぎり 鮭', 160], ['お~いお茶 525ml', 151],
    ]);
    expect(r.total).toBe(539);
  });

  it('品名がまとめて並び、そのあと¥なしの金額が並んでも対応させる（品名の末尾の数字やバーコードに惑わされない）', () => {
    expect(parseReceipt('商品１\n商品２\n商品３\n500\n200\n100').items.map((i) => [i.name, i.price]))
      .toEqual([['商品1', 500], ['商品2', 200], ['商品3', 100]]);
    const withJan = parseReceipt('サラダチキン\n4901234567890\nおにぎり 鮭\n4909876543210\nお茶\n¥500\n¥200\n¥100\n合計\n¥800');
    expect(withJan.items.map((i) => [i.name, i.price])).toEqual([['サラダチキン', 500], ['おにぎり 鮭', 200], ['お茶', 100]]);
    expect(withJan.total).toBe(800);
  });

  it('住所・電話番号・品名の中の数字（525ml）を金額と間違えない', () => {
    const r = parseReceipt('東京都新宿区新宿3-2-1\n電話:03-1234-5678\nお~いお茶 525ml\n合計 ¥151');
    expect(r.items).toEqual([]);
    expect(r.total).toBe(151);
  });

  it('お店・日付がわからないときは「その他」・未設定', () => {
    expect(detectStore('どこかのお店')).toBe('other');
    expect(detectStore('ベルク 越谷店')).toBe('belc');
    expect(detectDate('日付なし')).toBeUndefined();
    expect(detectDate('2026.9.5 8:00')).toBe('2026-09-05');
  });

  it('費目：手で直した分類を覚えて優先する', () => {
    expect(categorize('アイスコーヒー M')).toBe('drink');
    expect(categorize('ミルクチョコレート')).toBe('snack');
    expect(categorize('単3電池')).toBe('daily');
    expect(categorize('謎の商品')).toBe('other');
    const rules = rulesMap([{ name: ruleKey('謎の 商品'), category: 'meal' }]);
    expect(categorize('謎の商品', rules)).toBe('meal');
    expect(parseReceipt('謎の商品 ¥300', rules).items[0].category).toBe('meal');
  });
});

describe('支出の保存', () => {
  const names: string[] = [];
  afterEach(async () => { for (const n of names.splice(0)) await Dexie.delete(n); });

  it('v13 のDBを開くと記録を残したまま支出の表が増え、バックアップにも入る', async () => {
    const name = 'money-v13';
    names.push(name);
    const v13 = new Dexie(name);
    v13.version(13).stores({ settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId' });
    await v13.table('products').bulkAdd(SEED_PRODUCTS);
    await v13.table('settings').put(defaultSettings('2026-09-25'));
    await v13.table('days').put({ date: '2026-09-29', weight: 71 });
    v13.close();

    const db = new AppDB(name);
    expect(await db.days.get('2026-09-29')).toMatchObject({ weight: 71 });
    await db.expenses.put({ id: 'e1', date: '2026-09-29', store: 'lawson', items: [{ name: 'おにぎり', price: 160, category: 'meal' }], source: 'manual', createdAt: 1 });
    await db.categoryRules.put({ name: 'おにぎり', category: 'meal' });
    const backup = JSON.stringify(await exportBackup(db));
    db.close();

    const other = 'money-restore';
    names.push(other);
    const db2 = new AppDB(other);
    await importBackup(db2, parseBackup(backup));
    expect(await db2.expenses.get('e1')).toMatchObject({ store: 'lawson' });
    expect(await db2.categoryRules.get('おにぎり')).toMatchObject({ category: 'meal' });
    db2.close();
  });
});
