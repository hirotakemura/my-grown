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
