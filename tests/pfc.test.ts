import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { AppDB } from '../src/db';
import { ADDED_IN, SEED_PRODUCTS, SEED_BY_ID } from '../src/data/products';
import { HOLIDAY_MENUS, WEEKDAY_MENUS } from '../src/data/menus';
import { dayStatus, pfcRatio, pfcTargets, placesFor, suggestionChoices, suggestionFor } from '../src/lib/plan';
import { importBackup, parseBackup } from '../src/lib/backup';
import { matchStore } from '../src/components/ProductPicker';
import { meal, snap } from './helpers';

const names: string[] = [];
afterEach(async () => { for (const n of names.splice(0)) await Dexie.delete(n); });

describe('PFC', () => {
  it('その日に食べた P・F・C を合計する', () => {
    const date = '2026-09-29';
    const m = meal(date, 0);
    m.items = [
      { name: 'サラダチキン', kcal: 115, protein: 24, fat: 1.5, carbs: 0.5, qty: 2 },
      { name: 'おにぎり', kcal: 185, protein: 5, fat: 1.5, carbs: 38, qty: 1 },
    ];
    const st = dayStatus(date, snap({ meals: [m] }));
    expect(st.eaten).toEqual({ kcal: 415, protein: 53, fat: 4.5, carbs: 39 });
  });

  it('PFC の目安：脂質はカロリーの25%、残りが炭水化物', () => {
    const t = pfcTargets({ kcal: 2000, protein: 135 });
    expect(t.fat).toBeCloseTo(55.6, 1);
    expect(t.carbs).toBeCloseTo(240, 0);
    expect(pfcRatio({ kcal: 0, protein: 25, fat: 0, carbs: 75 })).toEqual({ protein: 25, fat: 0, carbs: 75 });
    expect(pfcRatio({ kcal: 0, protein: 0, fat: 0, carbs: 0 })).toBeNull();
  });
});

describe('お店と提案', () => {
  it('提案に出てくる商品はすべて初期データにある', () => {
    for (const menus of [WEEKDAY_MENUS, HOLIDAY_MENUS]) {
      for (const list of Object.values(menus)) {
        for (const s of list) {
          for (const it of s.items) if ('productId' in it) expect(SEED_BY_ID.has(it.productId), `${s.id}: ${it.productId}`).toBe(true);
        }
      }
    }
    expect(new Set(SEED_PRODUCTS.map((p) => p.id)).size).toBe(SEED_PRODUCTS.length);
  });

  it('出社日の夜はローソン・セブン・外食・家から選べ、場所を選ぶとその案だけ出る', () => {
    expect(placesFor('dinner', 'work')).toEqual(expect.arrayContaining(['lawson', 'seven', 'eatout', 'home']));
    expect(placesFor('lunch', 'work')).toEqual(expect.arrayContaining(['lawson', 'seven']));
    for (let r = 0; r < 5; r++) {
      const day = { date: '2026-09-28', place: { dinner: 'eatout' as const }, rotation: { dinner: r } };
      expect(suggestionFor('2026-09-28', 'dinner', 'work', day).place).toBe('eatout');
    }
    const seven = suggestionFor('2026-09-28', 'lunch', 'work', { date: '2026-09-28', place: { lunch: 'seven' } });
    expect(seven.place).toBe('seven');
  });

  it('どの場所を選んでも「別の案」で2案以上から選べ、押すと案が変わる', () => {
    for (const kind of ['work', 'off'] as const) {
      for (const slot of ['breakfast', 'lunch', 'dinner', 'post'] as const) {
        for (const place of placesFor(slot, kind)) {
          const day = { date: '2026-09-28', place: { [slot]: place } };
          expect(suggestionChoices(slot, kind, day).length, `${kind} ${slot} ${place}`).toBeGreaterThanOrEqual(2);
          const a = suggestionFor('2026-09-28', slot, kind, day);
          const b = suggestionFor('2026-09-28', slot, kind, { ...day, rotation: { [slot]: 1 } });
          expect(a.id, `${kind} ${slot} ${place}`).not.toBe(b.id);
        }
      }
    }
  });

  it('ローソン／セブンのタブには共通商品（ザバスなど）も出る', () => {
    expect(matchStore('common', 'seven')).toBe(true);
    expect(matchStore('lawson', 'seven')).toBe(false);
    expect(matchStore('other', 'lawson')).toBe(false);
    expect(matchStore('other', 'other')).toBe(true);
  });
});

describe('以前のデータの引き継ぎ', () => {
  it('v1 のDB（PFC・お店なし）を開くと、記録を残したままセブンと PFC が追加される', async () => {
    const name = 'migrate-v1';
    names.push(name);
    const v1 = new Dexie(name);
    v1.version(1).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
    });
    await v1.table('products').bulkAdd([
      { id: 'salad-chicken', name: 'サラダチキン プレーン', category: 'チキン・肉', kcal: 113, protein: 25, estimate: false, favorite: true, useCount: 3 },
      { id: 'my-item', name: '自分で足した商品', category: 'その他', kcal: 100, protein: 5, estimate: false, favorite: false, useCount: 0 },
    ]);
    await v1.table('meals').add({
      id: '2026-09-25|lunch', date: '2026-09-25', slot: 'lunch', status: 'eaten', updatedAt: 0,
      items: [{ name: 'ゆで卵', kcal: 75, protein: 6, qty: 2, productId: 'boiled-egg' }],
    });
    v1.close();

    const db = new AppDB(name);
    expect(await db.products.get('salad-chicken')).toMatchObject({ kcal: 113, protein: 25, fat: 2.1, store: 'lawson', favorite: true, useCount: 3 });
    expect(await db.products.get('my-item')).toMatchObject({ fat: 0, carbs: 0, store: 'lawson' });
    expect(await db.products.get('7-salad-chicken')).toMatchObject({ store: 'seven' });
    expect(await db.products.get('eo-grilled-fish')).toMatchObject({ store: 'other' });
    expect((await db.meals.get('2026-09-25|lunch'))?.items[0]).toMatchObject({ fat: 5, carbs: 0.3, qty: 2 });
    db.close();
  });

  it('PFC対応前のバックアップも復元できる', async () => {
    const name = 'restore-old';
    names.push(name);
    const db = new AppDB(name);
    await importBackup(db, parseBackup(JSON.stringify({
      app: 'my-grown', version: 1, exportedAt: '',
      tables: {
        settings: [await db.settings.get('main')],
        products: [{ id: 'natto', name: '納豆', category: '卵・乳製品', kcal: 90, protein: 8, estimate: true, favorite: false, useCount: 1 }],
      },
    })));
    expect(await db.products.get('natto')).toMatchObject({ store: 'common', fat: 4.5, carbs: 6 });
    db.close();
  });
});

describe('v3：セブンの商品追加', () => {
  it('既存のDBに新しい2品だけが足され、消した商品は復活しない', async () => {
    const name = 'migrate-v2';
    names.push(name);
    // v2 の時点のDBを作る（新しい2品はまだなく、ななチキは自分で消した状態）
    const v2 = new Dexie(name);
    v2.version(2).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
    });
    await v2.table('products').bulkAdd(
      SEED_PRODUCTS.filter((p) => !['7-broccoli-chicken-egg', '7-onigiri-saba', '7-nanachiki'].includes(p.id))
        .map((p) => (p.id === '7-salad-chicken' ? { ...p, protein: 23.5, estimate: false } : p)),
    );
    v2.close();

    const db = new AppDB(name);
    expect(await db.products.get('7-broccoli-chicken-egg')).toMatchObject({ store: 'seven', category: 'チキン・肉', estimate: true });
    expect(await db.products.get('7-onigiri-saba')).toMatchObject({ store: 'seven', category: 'おにぎり' });
    expect(await db.products.get('7-nanachiki')).toBeUndefined();
    expect(await db.products.get('7-salad-chicken')).toMatchObject({ protein: 23.5, estimate: false });
    db.close();
  });
});

describe('v4：自炊の商品追加', () => {
  it('v3 のDBに自炊の7品が足される', async () => {
    const name = 'migrate-v3';
    names.push(name);
    const v3 = new Dexie(name);
    v3.version(3).stores({
      settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
    });
    await v3.table('products').bulkAdd(SEED_PRODUCTS.filter((p) => !p.id.startsWith('belc-') && !p.id.startsWith('home-savas') && p.id !== 'home-boiled-egg'));
    v3.close();

    const db = new AppDB(name);
    const added = await db.products.bulkGet(ADDED_IN[4]);
    expect(added.every((p) => p?.category === '自炊' && p.store === 'other' && p.estimate)).toBe(true);
    expect(added.map((p) => p?.name)).toContain('ベルク サラダチキン ハーブ');
    db.close();
  });
});

it.each([4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25])('v%i のDBに、それ以降に追加した商品が足される', async (from) => {
  const name = `migrate-v${from}`;
  names.push(name);
  const v4 = new Dexie(name);
  v4.version(from).stores({
    settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
  });
  const later = Object.entries(ADDED_IN).filter(([v]) => Number(v) > from).flatMap(([, ids]) => ids);
  await v4.table('products').bulkAdd(SEED_PRODUCTS.filter((p) => !later.includes(p.id)));
  v4.close();
  const db = new AppDB(name);
  expect(await db.products.get('home-enoki')).toMatchObject({ category: '自炊', store: 'other', estimate: true });
  expect(await db.products.get('home-tkg')).toMatchObject({ category: '自炊', kcal: 300 });
  expect(await db.products.get('savas-milk-cocoa-430')).toMatchObject({ category: 'プロテイン', store: 'common', protein: 20 });
  expect(await db.products.get('7-mushidori-egg-salad')).toMatchObject({ store: 'seven', kcal: 66, protein: 8.7, estimate: false });
  expect(await db.products.get('7-dressing-koku-onion')).toMatchObject({ store: 'seven', kcal: 105, fat: 10.5, estimate: false });
  expect(await db.products.get('home-natto-gohan')).toMatchObject({ category: '自炊', kcal: 320 });
  expect(await db.products.get('home-pork-broccoli-steam')).toMatchObject({ category: '自炊', store: 'other', protein: 31.5, estimate: true });
  expect(await db.products.get('7-tofu-hamburg')).toMatchObject({ store: 'seven', kcal: 347, protein: 26.1, estimate: false });
  expect(await db.products.get('l-oden-egg')).toMatchObject({ store: 'lawson', estimate: true });
  expect(await db.products.get('7-smoked-nitamago')).toMatchObject({ store: 'seven', kcal: 73, protein: 6.3, estimate: false });
  expect(await db.products.get('l-chicken-stick-yuzu')).toMatchObject({ store: 'lawson', kcal: 83, protein: 10.1, estimate: false });
  expect(await db.products.get('l-tororo-soba')).toMatchObject({ store: 'lawson', category: '麺', kcal: 323, protein: 18.9, estimate: false });
  expect(await db.products.get('l-munenikusalad')).toMatchObject({ store: 'lawson', protein: 23.2, estimate: false });
  expect(await db.products.get('l-tofu-stick-konbu')).toMatchObject({ store: 'lawson', kcal: 102, protein: 11.8, estimate: false });
  expect(await db.products.get('7-goma-mushidori-soba')).toMatchObject({ store: 'seven', category: '麺', kcal: 630, protein: 27.7, estimate: false });
  expect(await db.products.get('savas-milk-fruit-430')).toMatchObject({ store: 'common', kcal: 135, protein: 20, carbs: 15.8, estimate: false });
  expect(await db.products.get('7-tonshabu-salad')).toMatchObject({ store: 'seven', kcal: 131, protein: 18.2, estimate: false });
  expect(await db.products.get('eo-matsuya-negitama-gyumeshi')).toMatchObject({ store: 'other', category: '外食・定食', kcal: 821, protein: 24.7, estimate: false });
  expect(await db.products.get('l-tori-liver')).toMatchObject({ store: 'lawson', kcal: 99, protein: 14.6, estimate: false });
  expect(await db.products.get('7-chicken-bar-smoke-pepper')).toMatchObject({ store: 'seven', kcal: 63, protein: 13.6, estimate: false });
  expect(await db.products.get('7-ebi-doria')).toMatchObject({ store: 'seven', category: '外食・定食', kcal: 412, protein: 13.7, estimate: false });
  expect(await db.products.get('l-rosu-katsudon')).toMatchObject({ store: 'lawson', category: '外食・定食', kcal: 647, protein: 21.8, estimate: false });
  expect(await db.products.get('l-oyakodon')).toMatchObject({ store: 'lawson', category: '外食・定食', kcal: 497, estimate: false });
  expect(await db.products.count()).toBe(SEED_PRODUCTS.length);
  db.close();
});

it('v12：焼き鳥・ざるそば・豚汁・ななチキを公式値に更新（自分で書き換えた値は残す）', async () => {
  const name = 'v11-official';
  names.push(name);
  const v11 = new Dexie(name);
  v11.version(11).stores({ settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId' });
  await v11.table('products').bulkAdd(SEED_PRODUCTS.filter((p) => !ADDED_IN[12].includes(p.id)).map((p) => {
    if (p.id === '7-yakitori') return { ...p, name: 'セブン 焼き鳥 もも塩（2本）', kcal: 160, protein: 15, estimate: true };
    if (p.id === '7-tonjiru') return { ...p, kcal: 170, estimate: false }; // 自分で書き換えた
    return p;
  }));
  v11.close();
  const db = new AppDB(name);
  expect(await db.products.get('7-yakitori')).toMatchObject({ name: 'セブン 炭火焼き鳥（塩）1本', kcal: 66, protein: 9.6, estimate: false });
  expect(await db.products.get('7-tonjiru')).toMatchObject({ kcal: 170, estimate: false });
  expect(await db.products.count()).toBe(SEED_PRODUCTS.length);
  db.close();
});

it('v16：ローソンの商品を公式値に見直す（自分で書き換えた値は残す）', async () => {
  const name = 'v15-lawson';
  names.push(name);
  const v15 = new Dexie(name);
  v15.version(15).stores({
    settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId',
    expenses: 'id, date', categoryRules: 'name',
  });
  await v15.table('products').bulkAdd(SEED_PRODUCTS.filter((p) => !ADDED_IN[16].includes(p.id)).map((p) => {
    if (p.id === 'salad-chicken') return { ...p, name: 'サラダチキン プレーン', kcal: 115, protein: 24, estimate: true };
    if (p.id === 'karaage-kun') return { ...p, name: 'からあげクン', kcal: 220, protein: 14, estimate: true };
    if (p.id === 'zaru-soba') return { ...p, kcal: 300, estimate: false }; // 自分で書き換えた
    return p;
  }));
  v15.close();
  const db = new AppDB(name);
  expect(await db.products.get('salad-chicken')).toMatchObject({ name: 'サラダチキン プレーン（たんぱく質30.3g）', kcal: 141, protein: 30.3, estimate: false });
  expect(await db.products.get('karaage-kun')).toMatchObject({ kcal: 226, protein: 14.4, fat: 15.4, carbs: 7.8, estimate: false });
  expect(await db.products.get('zaru-soba')).toMatchObject({ kcal: 300, estimate: false });
  expect(await db.products.get('l-salad-chicken-herb')).toMatchObject({ store: 'lawson', protein: 23.1 });
  expect(await db.products.count()).toBe(SEED_PRODUCTS.length);
  db.close();
});

describe('v10：ドレッシングを公式の値に更新', () => {
  const schema = { settings: 'id', products: 'id, category', mySets: 'id', days: 'date', meals: 'id, date', exercises: 'id', workoutSets: 'id, date, exerciseId' };
  it('目安のままなら公式値に置き換え、自分で書き換えた値は残す', async () => {
    for (const [name, edited] of [['v9-untouched', false], ['v9-edited', true]] as const) {
      names.push(name);
      const v9 = new Dexie(name);
      v9.version(9).stores(schema);
      await v9.table('products').bulkAdd(SEED_PRODUCTS.map((p) => {
        if (p.id === '7-dressing-koku-onion') return { ...p, kcal: edited ? 100 : 95, fat: 9, estimate: !edited };
        if (p.id === '7-mushidori-egg-salad') return { ...p, kcal: 173, protein: 21.5, estimate: true };
        return p;
      }));
      v9.close();
      const db = new AppDB(name);
      const p = await db.products.get('7-dressing-koku-onion');
      if (edited) expect(p).toMatchObject({ kcal: 100, estimate: false });
      else expect(p).toMatchObject({ kcal: 105, protein: 0.5, fat: 10.5, carbs: 2, estimate: false });
      expect(await db.products.get('7-mushidori-egg-salad')).toMatchObject({ kcal: 66, protein: 8.7, fat: 2.3, carbs: 3.4, estimate: false });
      db.close();
    }
  });
});
