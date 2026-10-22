import { describe, expect, it } from 'vitest';
import { pastItems } from '../src/components/ExpenseEditor';
import type { Expense } from '../src/types';

const ex = (id: string, date: string, store: Expense['store'], items: [string, number][]): Expense => ({
  id, date, store, source: 'manual', createdAt: 0,
  items: items.map(([name, price]) => ({ name, price, category: 'meal' })),
});

describe('過去の品目', () => {
  it('品名ごとにまとめ、金額とお店は一番新しい記録、よく買う順に並べる（値引きは出さない）', () => {
    const list = pastItems([
      ex('a', '2026-10-01', 'lawson', [['サラダチキン', 228], ['おにぎり 鮭', 160]]),
      ex('b', '2026-10-05', 'seven', [['サラダチキン', 248], ['値引', -30]]),
      ex('c', '2026-10-03', 'belc', [['もやし', 18]]),
    ]);
    expect(list.map((i) => [i.name, i.price, i.store, i.count])).toEqual([
      ['サラダチキン', 248, 'seven', 2],
      ['もやし', 18, 'belc', 1],
      ['おにぎり 鮭', 160, 'lawson', 1],
    ]);
  });
});
