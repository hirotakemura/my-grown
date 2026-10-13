import { describe, expect, it } from 'vitest';
import { isPersonalBest, lastSession, suggestWeight, totalVolume } from '../src/lib/progression';
import { SEED_EXERCISES } from '../src/data/exercises';
import type { WorkoutSet } from '../src/types';

const ex = (id: string) => SEED_EXERCISES.find((e) => e.id === id)!;
const set = (date: string, index: number, weight: number, reps: number, exerciseId = 'leg-press', done = true): WorkoutSet => ({
  id: `${date}|${exerciseId}|${index}`, date, exerciseId, index, weight, reps, done,
});

describe('重さの提案', () => {
  it('前回全セットで上限回数に届いたら +5kg', () => {
    const sets = [set('2026-09-21', 0, 60, 12), set('2026-09-21', 1, 60, 12), set('2026-09-21', 2, 60, 12)];
    const s = suggestWeight(ex('leg-press'), lastSession('leg-press', '2026-09-23', sets));
    expect(s).toMatchObject({ weight: 65, increase: true, text: '今日は+5kg（65kg）' });
  });

  it('小さい種目は +2.5kg', () => {
    const id = 'cable-lateral';
    const sets = [0, 1, 2].map((i) => set('2026-09-21', i, 5, 15, id));
    expect(suggestWeight(ex(id), lastSession(id, '2026-09-23', sets))).toMatchObject({ weight: 7.5, increase: true });
  });

  it('1セットでも届かなければ同じ重さ。未完了のセットは数えない', () => {
    const sets = [set('2026-09-21', 0, 60, 12), set('2026-09-21', 1, 60, 12), set('2026-09-21', 2, 60, 10)];
    expect(suggestWeight(ex('leg-press'), lastSession('leg-press', '2026-09-23', sets))).toMatchObject({ weight: 60, increase: false });
    const partial = [set('2026-09-21', 0, 60, 12), set('2026-09-21', 1, 60, 12), set('2026-09-21', 2, 60, 12, 'leg-press', false)];
    expect(suggestWeight(ex('leg-press'), lastSession('leg-press', '2026-09-23', partial)).increase).toBe(false);
  });

  it('前回は今日より前の日から探す', () => {
    const sets = [set('2026-09-21', 0, 60, 12), set('2026-09-23', 0, 65, 8)];
    expect(lastSession('leg-press', '2026-09-23', sets)?.date).toBe('2026-09-21');
  });
});

describe('自己ベスト', () => {
  const history = [set('2026-09-21', 0, 60, 12), set('2026-09-21', 1, 60, 10)];
  it('重さか、同じ重さでの回数を上回ったら更新', () => {
    expect(isPersonalBest(set('2026-09-23', 0, 65, 8), history)).toBe(true);
    expect(isPersonalBest(set('2026-09-23', 0, 60, 13), history)).toBe(true);
    expect(isPersonalBest(set('2026-09-23', 0, 60, 12), history)).toBe(false);
  });
  it('はじめての種目ではお知らせしない', () => {
    expect(isPersonalBest(set('2026-09-21', 1, 70, 10), [set('2026-09-21', 0, 60, 12)])).toBe(false);
  });
});

it('総重量は完了セットの重さ×回数の合計', () => {
  expect(totalVolume([set('d', 0, 60, 10), set('d', 1, 50, 10), set('d', 2, 100, 10, 'leg-press', false)])).toBe(1100);
});

describe('アシスト懸垂マシン（数値が大きいほど楽）', () => {
  const id = 'assisted-pullup';
  const a = ex(id);

  it('全セットで上限回数に届いたら、補助を減らす（数値を小さくする）', () => {
    expect(a.assist).toBe(true);
    const sets = [0, 1, 2].map((i) => set('2026-09-21', i, 40, 12, id));
    expect(suggestWeight(a, lastSession(id, '2026-09-23', sets))).toMatchObject({ weight: 35, increase: true, from: 40, text: '今日は補助を-5kg（35kg）' });
  });

  it('マシンの目盛りで覚えた「次」も、補助が少ない方だけ使う', () => {
    const sets = [0, 1, 2].map((i) => set('2026-09-21', i, 40, 12, id));
    const last = lastSession(id, '2026-09-23', sets);
    expect(suggestWeight({ ...a, nextWeights: { '40': 36 } }, last)).toMatchObject({ weight: 36, known: true, text: '今日は補助を-4kg（36kg）' });
    // 補助が増える値は覚えていても使わない
    expect(suggestWeight({ ...a, nextWeights: { '40': 45 } }, last)).toMatchObject({ weight: 35, known: false });
  });

  it('届かなければ同じ補助で。補助が一番少なかったセットを基準にする', () => {
    const sets = [set('2026-09-21', 0, 40, 12, id), set('2026-09-21', 1, 35, 10, id), set('2026-09-21', 2, 35, 9, id)];
    expect(suggestWeight(a, lastSession(id, '2026-09-23', sets))).toMatchObject({ weight: 35, increase: false, text: '前回と同じ補助35kgで、全セット12回を目指す' });
  });

  it('補助0kg（自力）でできたらそれ以上は減らさない', () => {
    const sets = [0, 1, 2].map((i) => set('2026-09-21', i, 0, 12, id));
    expect(suggestWeight(a, lastSession(id, '2026-09-23', sets))).toMatchObject({ weight: 0, increase: false });
  });

  it('自己ベストは補助が少ない方', () => {
    const history = [set('2026-09-21', 0, 40, 10, id)];
    expect(isPersonalBest(set('2026-09-23', 0, 35, 8, id), history, a)).toBe(true);
    expect(isPersonalBest(set('2026-09-23', 0, 45, 12, id), history, a)).toBe(false);
    expect(isPersonalBest(set('2026-09-23', 0, 40, 11, id), history, a)).toBe(true);
  });
});
