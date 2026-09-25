import { afterEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { AppDB } from '../src/db';
import { SEED_PRODUCTS, SEED_BY_ID } from '../src/data/products';
import { HOLIDAY_MENUS, WEEKDAY_MENUS } from '../src/data/menus';
import { dayStatus, pfcRatio, pfcTargets, placesFor, suggestionFor } from '../src/lib/plan';
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
    expect(await db.products.get('salad-chicken')).toMatchObject({ kcal: 113, protein: 25, fat: 1.5, store: 'lawson', favorite: true, useCount: 3 });
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
