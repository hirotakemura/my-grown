import type { Nutrition } from './plan';

/** 小数1桁まで（整数なら整数のまま） */
export const g1 = (n: number) => String(Math.round(n * 10) / 10);

/** 「485kcal・P34 F4.5 C76.5」 */
export function fmtNut(n: Pick<Nutrition, 'kcal' | 'protein'> & Partial<Nutrition>): string {
  const base = `${Math.round(n.kcal)}kcal・P${g1(n.protein)}`;
  return n.fat == null || n.carbs == null ? base : `${base} F${g1(n.fat)} C${g1(n.carbs)}`;
}
