import { expect, test, type Page } from '@playwright/test';

// 2026-09-28（月）朝10時＝トレ日（メニューA）・出社日として固定
const NOW = new Date('2026-09-28T10:00:00+09:00');

async function openApp(page: Page) {
  await page.clock.setFixedTime(NOW);
  // 確認ダイアログは OK、名前の入力（マイセット）は「夜の定番」と答える
  page.on('dialog', (d) => void (d.type() === 'prompt' ? d.accept('夜の定番') : d.accept()));
  await page.goto('./');
  await expect(page.getByTestId('current-date')).toContainText('9/28(月)');
}

/** IndexedDB から直接読む（保存が終わったことを確かめてからリロードするため） */
function dbGet(page: Page, store: string, key: string) {
  return page.evaluate(
    ([store, key]) =>
      new Promise<unknown>((resolve, reject) => {
        const req = indexedDB.open('my-grown');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const get = req.result.transaction(store).objectStore(store).get(key);
          get.onsuccess = () => { resolve(get.result); req.result.close(); };
        };
      }),
    [store, key],
  );
}

const tab = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
/** 今日の画面の「食事／筋トレ」の切り替え */
const mode = (page: Page, name: '食事' | '筋トレ') => page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();

/** 食事の枠の「食べたものを選ぶ」から商品名で探して1つ記録する */
async function eat(page: Page, slot: string, name: string, store?: string) {
  await page.getByTestId(`meal-${slot}`).getByRole('button', { name: '食べたものを選ぶ' }).click();
  const dialog = page.getByRole('dialog');
  if (store) await dialog.getByRole('group', { name: 'お店' }).getByRole('button', { name: store, exact: true }).click();
  await dialog.getByLabel('商品名で検索').fill(name);
  await dialog.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
  await dialog.getByRole('button', { name: '食べた', exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** 体重は「記録」タブで入れる（入れたら「今日」タブに戻る） */
async function enterWeight(page: Page, value: string) {
  await tab(page, '記録');
  await page.locator('#weight').fill(value);
  await page.getByTestId('weight-card').getByRole('button', { name: '記録' }).click();
  await expect.poll(() => dbGet(page, 'days', '2026-09-28')).toMatchObject({ weight: Number(value) });
  await tab(page, '今日');
}

/** 記録タブの体重欄 */
async function weightInput(page: Page) {
  await tab(page, '記録');
  return page.locator('#weight');
}

test('記録した食事・体重・セットがリロード後も残る', async ({ page }) => {
  await openApp(page);

  // 昼は「食べたものを選ぶ」から（提案はない）
  const lunch = page.getByTestId('meal-lunch');
  await expect(lunch.getByRole('button', { name: 'これを食べた' })).toHaveCount(0);
  await eat(page, 'lunch', 'サラダチキン プレーン');
  await expect(lunch.getByText('✓ 食べた')).toBeVisible();

  // 体重
  await enterWeight(page, '71.6');

  // レッグプレス 1セット目（筋トレに切り替える）
  await tab(page, '今日');
  await mode(page, '筋トレ');
  const lp = page.getByTestId('exercise-leg-press');
  await lp.getByLabel('レッグプレス 1セット目の重さ').fill('60');
  await lp.getByLabel('レッグプレス 1セット目の回数').fill('12');
  await lp.getByRole('button', { name: '1セット目を完了' }).click();
  await expect(page.getByRole('timer')).toBeVisible(); // 休憩タイマーが自動で動く

  await page.reload();

  // トレの途中で開き直すと筋トレから表示される
  const lp2 = page.getByTestId('exercise-leg-press');
  await expect(page.getByRole('tab', { name: /^筋トレ/ })).toHaveAttribute('aria-selected', 'true');
  await expect(lp2.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('60');
  await expect(lp2.getByLabel('レッグプレス 1セット目の回数')).toHaveValue('12');
  await expect(lp2.getByRole('button', { name: '1セット目を完了' })).toHaveAttribute('aria-pressed', 'true');
  await mode(page, '食事');
  await expect(page.getByTestId('meal-lunch').getByText('✓ 食べた')).toBeVisible();
  await expect(await weightInput(page)).toHaveValue('71.6');
  await tab(page, '今日');

  // 記録タブにも反映される
  await page.getByRole('navigation').getByRole('button', { name: '記録' }).click();
  // 種目ごとの推移：最初は折りたたまれていて、開くとトレした種目が選ばれた状態で前回の記録が出る
  await expect(page.getByRole('group', { name: 'メニューA（押す日）' })).toBeHidden();
  await expect(page.getByTestId('exercise-history')).toContainText('60×12');
  await page.getByText('メニューA（押す日）').click();
  await page.getByText('メニューB（引く日）').click();
  const chip = page.getByRole('group', { name: 'メニューA（押す日）' }).getByRole('button', { name: /^レッグプレス(?!（)/ });
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(chip).toContainText('前回 60kg×12');
  await expect(page.getByRole('group', { name: 'メニューB（引く日）' }).getByRole('button', { name: /ラットプルダウン/ })).toBeDisabled();
  await expect(page.getByTestId('exercise-history')).toContainText('60×12');
});

test('コンビニの商品から複数選んで記録し、マイセット・商品の編集もリロード後に残る', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('meal-dinner').getByRole('button', { name: '食べたものを選ぶ' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'チキン・肉' }).click();
  await dialog.getByRole('button', { name: /^サラダチキン プレーン（たんぱく質30.3g）/ }).first().click();
  await dialog.getByRole('button', { name: 'おにぎり' }).click();
  await dialog.getByRole('button', { name: /^手巻おにぎり 炙り熟成紅鮭/ }).first().click();
  await dialog.getByRole('button', { name: '1つ増やす' }).click(); // 鮭×2
  await expect(dialog.getByTestId('picker-total')).toContainText('3品　489kcal・P39.9 F5.9 C70.4');

  await dialog.getByRole('button', { name: 'マイセット保存' }).click();
  await dialog.getByRole('button', { name: '食べた', exact: true }).click();
  await expect(dialog).toBeHidden();

  // パッケージの数値で上書き
  await page.getByRole('button', { name: '設定' }).click();
  await page.getByRole('button', { name: '商品の追加・編集・削除' }).click();
  await page.getByRole('button', { name: 'ゆで卵を編集', exact: true }).click();
  await page.getByLabel('たんぱく質（g）').fill('6.5');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect.poll(() => dbGet(page, 'products', 'boiled-egg')).toMatchObject({ protein: 6.5, estimate: false });

  await page.reload();

  await expect(page.getByTestId('meal-dinner')).toContainText('手巻おにぎり 炙り熟成紅鮭 ×2');
  await expect(page.getByTestId('meal-dinner')).toContainText('合計 489kcal・P39.9 F5.9 C70.4');
  await expect(page.getByTestId('meal-lunch').getByRole('button', { name: '⚡ 夜の定番' })).toBeVisible();
  await page.getByRole('button', { name: '設定' }).click();
  await page.getByRole('button', { name: '商品の追加・編集・削除' }).click();
  const egg = page.getByRole('dialog').getByRole('button', { name: /^ゆで卵/ }).first();
  await expect(egg).toContainText('P6.5');
  await expect(egg).not.toContainText('目安');
});

test('セブンの商品と外食（手入力）で記録し、その日のPFCがわかる', async ({ page }) => {
  await openApp(page);

  // 昼：セブンのタブから選んで食べた
  await eat(page, 'lunch', 'セブン サラダチキン プレーン', 'セブン');

  // 夜：外食を手入力
  const dinner = page.getByTestId('meal-dinner');
  await dinner.getByRole('button', { name: '食べたものを選ぶ' }).click();
  const dialog = page.getByRole('dialog').first();
  await dialog.getByRole('group', { name: 'お店' }).getByRole('button', { name: '外食・自炊' }).click();
  await dialog.getByRole('button', { name: /手入力で追加/ }).click();
  const form = page.getByRole('dialog', { name: '手入力で追加（外食など）' });
  await form.getByLabel('食べたもの').fill('定食屋 唐揚げ定食');
  await form.getByLabel('エネルギー（kcal）').fill('900');
  await form.getByLabel('たんぱく質（g）').fill('40');
  await form.getByLabel('脂質（g）').fill('35');
  await form.getByLabel('炭水化物（g）').fill('100');
  await form.getByRole('button', { name: '選択に追加' }).click();
  await expect(page.getByTestId('picker-total')).toContainText('1品　900kcal・P40 F35 C100');
  await page.getByRole('button', { name: '食べた', exact: true }).click();
  await expect(dinner).toContainText('定食屋 唐揚げ定食');

  await page.reload();

  // その日の合計（昼のセブン＋夜の外食）
  const progress = page.getByTestId('progress');
  await progress.getByText('脂質・炭水化物・PFCバランス').click();
  await expect(progress.getByRole('progressbar', { name: 'F 脂質' })).toBeVisible();
  const lunchText = await page.getByTestId('meal-lunch').innerText();
  expect(lunchText).toContain('セブン');
  await expect(page.getByTestId('pfc-ratio')).toContainText('PFCバランス　P');
  await page.getByRole('navigation').getByRole('button', { name: '記録' }).click();
  const row = page.getByTestId('daily-pfc').getByRole('row', { name: /9\/28\(月\)/ });
  await expect(row).toBeVisible();
  const cells = await row.getByRole('cell').allInnerTexts();
  expect(Number(cells[1])).toBeGreaterThan(900);
  expect(Number(cells[3])).toBeGreaterThan(35);
});

test('期間（いつからいつまで）を記録の画面から変更でき、リロード後も残る。今日の画面には要約が出る', async ({ page }) => {
  await openApp(page);
  // 今日の画面の要約から記録の画面のカレンダーへ
  await page.getByTestId('goal-brief').click();
  const goal = page.getByTestId('goal');
  await goal.getByRole('button', { name: '期間を変更' }).click();
  const editor = page.getByTestId('period-editor');

  // ゴール日を開始日より前にすると保存できない
  await editor.getByLabel('開始日').fill('2026-10-01');
  await editor.getByLabel('ゴール日（期限）').fill('2026-09-30');
  await expect(editor.getByRole('alert')).toContainText('ゴール日は開始日より後');
  await expect(editor.getByRole('button', { name: 'この期間で保存' })).toBeDisabled();

  // 「今日から始める」＋「12週間」
  await editor.getByRole('button', { name: '今日から始める' }).click();
  await editor.getByRole('button', { name: '12週間' }).click();
  await expect(editor).toContainText('全84日間');
  await editor.getByRole('button', { name: 'この期間で保存' }).click();
  await expect(goal.getByTestId('period')).toHaveText('9/28(月)〜12/20(日)（84日間）');
  await expect(goal.getByTestId('days-left')).toHaveText('83');

  await page.reload();
  await expect(page.getByTestId('goal-brief')).toContainText('ゴールまで83日');
  await tab(page, '記録');
  await expect(page.getByTestId('period')).toHaveText('9/28(月)〜12/20(日)（84日間）');
  await page.getByRole('button', { name: '設定' }).click();
  await expect(page.getByTestId('period-editor').getByLabel('ゴール日（期限）')).toHaveValue('2026-12-20');
});

test('バックアップを書き出して、別の端末に復元できる', async ({ page, browser }) => {
  await openApp(page);
  await enterWeight(page, '70.9');
  await page.getByRole('button', { name: '設定' }).click();

  // 共有シートは使わずダウンロードで確認する
  await page.evaluate(() => { (navigator as { canShare?: unknown }).canShare = undefined; });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'JSONでバックアップを書き出す' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^my-grown-backup-\d{8}-\d{4}\.json$/);
  const path = await download.path();

  // まっさらな別コンテキスト＝別の端末
  const other = await browser.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo', baseURL: 'http://localhost:4173/my-grown/' });
  const p2 = await other.newPage();
  await openApp(p2);
  await expect(await weightInput(p2)).toHaveValue('');
  await p2.getByRole('button', { name: '設定' }).click();
  await p2.getByTestId('restore-input').setInputFiles(path);
  await p2.getByRole('alertdialog', { name: 'バックアップから復元しますか？' }).getByRole('button', { name: '置き換える' }).click();
  await expect(await weightInput(p2)).toHaveValue('70.9');
  await p2.reload();
  await expect(await weightInput(p2)).toHaveValue('70.9');
  await other.close();
});

test('オフラインでも起動でき、データも読める', async ({ page, context }) => {
  await openApp(page);
  await enterWeight(page, '71.2');
  // Service Worker がキャッシュを作り終えるのを待つ
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('current-date')).toContainText('9/28(月)');
  await expect(await weightInput(page)).toHaveValue('71.2');
  // 数字のフォント（Inter）はアプリに同梱していて、オフラインでも読み込める
  await tab(page, '今日');
  expect(await page.evaluate(async () => { await document.fonts.load('700 28px Inter'); return document.fonts.check('700 28px Inter'); })).toBe(true);
  await context.setOffline(false);
});

test('manifest がホーム画面追加に必要な内容を持っている', async ({ request }) => {
  const res = await request.get('manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({ display: 'standalone', lang: 'ja' });
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

/** IndexedDB に直接書く（前回の記録を用意するため） */
function dbPut(page: Page, store: string, rows: unknown[]) {
  return page.evaluate(
    ([store, rows]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('my-grown');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(store as string, 'readwrite');
          for (const r of rows as unknown[]) tx.objectStore(store as string).put(r);
          tx.oncomplete = () => { req.result.close(); resolve(); };
        };
      }),
    [store, rows] as const,
  );
}

test('筋トレ：マシンの「次の重さ」を重さごとに覚えて提案し、今日のセットの重さも変わる', async ({ page }) => {
  await openApp(page);
  // 前回（9/25）レッグプレス 41kg で全セット上限回数
  await dbPut(page, 'workoutSets', [0, 1, 2].map((i) => ({
    id: `2026-09-25|leg-press|${i}`, date: '2026-09-25', exerciseId: 'leg-press', index: i, weight: 41, reps: 12, done: true,
  })));
  await page.reload();
  await mode(page, '筋トレ');
  const card = page.getByTestId('exercise-leg-press');
  const next = card.getByLabel('レッグプレスの41kgの次の重さ');
  await expect(card).toContainText('前回 41kg →');
  await expect(next).toHaveValue('46'); // まだ覚えていないので目安の幅
  await expect(card.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('46');

  // −で1kg下げると、マシンの次の重さとして覚え、今日のセットの重さも変わる
  await card.getByRole('button', { name: 'レッグプレスの今日の重さを1kg下げる' }).click();
  await expect(next).toHaveValue('45');
  await expect(card).toContainText('✓ このマシンは 41kg の次が 45kg');
  await expect(card.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('45');
  await expect.poll(() => dbGet(page, 'exercises', 'leg-press')).toMatchObject({ nextWeights: { '41': 45 } });

  // 直接入力でも直せる
  await next.fill('50');
  await next.blur();
  await expect.poll(() => dbGet(page, 'exercises', 'leg-press')).toMatchObject({ nextWeights: { '41': 50 } });

  await page.reload();
  await mode(page, '筋トレ');
  await expect(page.getByTestId('exercise-leg-press').getByLabel('レッグプレスの41kgの次の重さ')).toHaveValue('50');
});

test('筋トレ：アシスト懸垂マシンは数値が大きいほど楽なので、全セットできたら補助を減らす提案になる', async ({ page }) => {
  await openApp(page);
  // 今日はメニューB・ラットプルダウンの代わりにアシスト懸垂。前回（9/25）補助40kgで全セット上限回数
  await dbPut(page, 'days', [{ date: '2026-09-28', menu: 'B', swaps: { 'lat-pulldown': 'assisted-pullup' } }]);
  await dbPut(page, 'workoutSets', [0, 1, 2].map((i) => ({
    id: `2026-09-25|assisted-pullup|${i}`, date: '2026-09-25', exerciseId: 'assisted-pullup', index: i, weight: 40, reps: 12, done: true,
  })));
  await page.reload();
  await mode(page, '筋トレ');
  const card = page.getByTestId('exercise-assisted-pullup');
  const next = card.getByLabel('アシスト懸垂マシンの40kgの次の重さ');
  await expect(card).toContainText('補助を減らす');
  await expect(card).toContainText('前回 補助 40kg →');
  await expect(next).toHaveValue('35');
  await expect(card.getByLabel('アシスト懸垂マシン 1セット目の重さ')).toHaveValue('35');
  // 補助を前回より増やす方向には直せない
  await card.getByRole('button', { name: 'アシスト懸垂マシンの今日の重さを1kg上げる' }).click();
  await expect(next).toHaveValue('36');
  await expect(card).toContainText('✓ このマシンは補助 40kg の次が 36kg');
  await next.fill('45');
  await next.blur();
  await expect(next).toHaveValue('36');
  await expect.poll(() => dbGet(page, 'exercises', 'assisted-pullup')).toMatchObject({ nextWeights: { '40': 36 } });
  await card.screenshot({ path: 'test-results/assist-pullup.png' });
});

test('食事：数量は半分（0.5）や0.4のような小数でも記録できる', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('meal-dinner').getByRole('button', { name: '食べたものを選ぶ' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'チキン・肉' }).click();
  await dialog.getByRole('button', { name: /^サラダチキン プレーン（たんぱく質30.3g）/ }).first().click();
  const qty = dialog.getByLabel('サラダチキン プレーン（たんぱく質30.3g）の数量');
  await expect(qty).toHaveValue('1');
  // −で1から半分に
  await dialog.getByRole('button', { name: '1つ減らす' }).click();
  await expect(qty).toHaveValue('0.5');
  await expect(dialog.getByTestId('picker-total')).toContainText('0.5品');
  // 数字を直接入れる
  await qty.fill('0.4');
  await qty.blur();
  await expect(qty).toHaveValue('0.4');
  await expect(dialog.getByTestId('picker-total')).toContainText('P12.1');
  await dialog.getByRole('button', { name: '食べた', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('meal-dinner')).toContainText('サラダチキン プレーン（たんぱく質30.3g） ×0.4');
  await page.reload();
  await expect(page.getByTestId('meal-dinner')).toContainText('×0.4');
});

test('今日：食事と筋トレを切り替えて表示し、切り替えても入力中の内容や記録は消えない', async ({ page }) => {
  await openApp(page);
  const summary = page.getByTestId('progress');
  await expect(summary).toContainText('カロリー');
  await expect(summary).toContainText('/ 2000kcal');
  await expect(summary).toContainText('/ 135g');
  await expect(page.getByTestId('today-achieved')).toHaveText('まだ途中');

  // 初めは食事だけが出ている
  await expect(page.getByTestId('meal-lunch')).toBeVisible();
  await expect(page.getByTestId('workout')).toBeHidden();
  // 「次にやること」の「記録する」で、その食事の枠が目立つ
  await page.getByTestId('next-action').getByRole('button', { name: '記録する' }).click();
  await expect(page.locator('.card.meal.focused')).toHaveCount(1);

  // 食事を記録すると、サマリーの数字が増え、記録済みの枠は1行にまとまる（内容の変更・取り消しはそのまま）
  const lunch = page.getByTestId('meal-lunch');
  await eat(page, 'lunch', 'サラダチキン プレーン');
  await expect(lunch.getByText('✓ 食べた')).toBeVisible();
  await expect(lunch.getByRole('button', { name: '内容を変更' })).toBeVisible();
  await expect(lunch.getByRole('button', { name: '取り消す' })).toBeVisible();
  await expect(summary).not.toContainText('あと 135g');
  // 食べない食事は「食べない」で閉じられ、取り消せる
  const breakfast = page.getByTestId('meal-breakfast');
  await breakfast.getByRole('button', { name: '食べない' }).click();
  await expect(breakfast.getByText('食べない', { exact: true })).toBeVisible();
  await breakfast.getByRole('button', { name: '取り消す' }).click();
  await expect(breakfast.getByRole('button', { name: '食べたものを選ぶ' })).toBeVisible();

  // 筋トレに切り替えて、重さだけ入れた（まだ保存していない）状態で食事に戻り、また筋トレへ
  await mode(page, '筋トレ');
  await expect(page.getByTestId('meal-lunch')).toBeHidden();
  const weight = page.getByLabel('レッグプレス 1セット目の重さ');
  await weight.fill('55');
  await mode(page, '食事');
  await expect(page.getByTestId('meal-lunch').getByText('✓ 食べた')).toBeVisible();
  await mode(page, '筋トレ');
  await expect(weight).toHaveValue('55');
  // 回数を入れないと完了にならない
  await page.getByTestId('exercise-leg-press').getByRole('button', { name: '1セット目を完了' }).click();
  await expect(page.getByTestId('exercise-leg-press').getByRole('button', { name: '1セット目を完了' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByLabel('レッグプレス 1セット目の回数').fill('12');
  await page.getByTestId('exercise-leg-press').getByRole('button', { name: '1セット目を完了' }).click();
  await expect(page.getByTestId('exercise-leg-press')).toContainText('1/3');
  await expect(page.getByRole('tab', { name: /^筋トレ/ })).toContainText('1/18');
  // iPhoneの幅で横にはみ出さない（筋トレ・食事とも）
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await mode(page, '食事');
  expect(await overflow()).toBeLessThanOrEqual(0);
  await mode(page, '筋トレ');

  // トレ中は「次にやること」から筋トレを開ける
  await mode(page, '食事');
  await expect(page.getByTestId('next-action')).toContainText('トレ中：1 / 18 セット完了');
  await page.getByTestId('next-action').getByRole('button', { name: '筋トレを開く' }).click();
  await expect(page.getByRole('tab', { name: /^筋トレ/ })).toHaveAttribute('aria-selected', 'true');
  await expect(weight).toHaveValue('55');
});

test('筋トレ：各セットの横に前回の重さ・回数が出て、休憩タイマーが次のセットの入力欄を隠さない', async ({ page }) => {
  await openApp(page);
  // 前回（9/25）レッグプレス 40kg × 10・10・9回（上限に届いていないので同じ重さの提案）
  await dbPut(page, 'workoutSets', [10, 10, 9].map((reps, i) => ({
    id: `2026-09-25|leg-press|${i}`, date: '2026-09-25', exerciseId: 'leg-press', index: i, weight: 40, reps, done: true,
  })));
  await page.reload();
  await mode(page, '筋トレ');
  const card = page.getByTestId('exercise-leg-press');
  await expect(card).toContainText('前回 9/25');
  await expect(card.getByLabel('前回 40kg 9回')).toBeVisible();
  // 前回の値が初期値として入っていても、完了を押すまでは完了扱いにしない
  await expect(card.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('40');
  await expect(card).toContainText('0/3');

  // 1セット目を画面の一番下（タブのすぐ上）に置いてから完了する
  await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-testid="exercise-leg-press"] .set-row')!;
    window.scrollBy(0, row.getBoundingClientRect().bottom - (window.innerHeight - 70));
  });
  await card.getByLabel('レッグプレス 1セット目の回数').fill('11');
  await card.getByRole('button', { name: '1セット目を完了' }).click();
  const timer = page.getByRole('timer');
  await expect(timer).toBeVisible();
  await expect(card).toContainText('1/3');
  // 次のセットの行が、タイマーより上に見えている
  await expect.poll(async () => {
    const t = await timer.boundingBox();
    const r = await card.getByLabel('レッグプレス 2セット目の回数').boundingBox();
    return t && r ? t.y - (r.y + r.height) : -1;
  }).toBeGreaterThanOrEqual(0);
  await expect(timer).toContainText('休憩');
  await timer.getByRole('button', { name: '+30秒' }).click();
  await timer.getByRole('button', { name: 'スキップ' }).click();
  await expect(timer).toBeHidden();
});

test('設定：メニューから種目を外す前にアプリ内で確認し、キャンセルなら残る', async ({ page }) => {
  await openApp(page);
  await tab(page, '設定');
  const removeFirst = () => page.getByRole('button', { name: 'メニューから外す' }).nth(6); // メニューBの1つ目（レッグカール）
  await removeFirst().click();
  const ask = page.getByRole('alertdialog', { name: /「レッグカール」を.*から外しますか？/ });
  await expect(ask).toContainText('これまでの記録は残ります');
  await ask.getByRole('button', { name: 'キャンセル' }).click();
  await expect(ask).toBeHidden();
  await expect.poll(async () => ((await dbGet(page, 'settings', 'main')) as { menuB: string[] }).menuB[0]).toBe('leg-curl');

  await removeFirst().click();
  await ask.getByRole('button', { name: '外す' }).click();
  await expect.poll(async () => ((await dbGet(page, 'settings', 'main')) as { menuB: string[] }).menuB).not.toContain('leg-curl');
  // 「＋ 種目を追加」から戻せる
  await page.getByLabel(/メニューB.*に種目を追加/).selectOption('leg-curl');
  await expect.poll(async () => ((await dbGet(page, 'settings', 'main')) as { menuB: string[] }).menuB).toContain('leg-curl');
});

test('種目：新しく作ると名前から分類が付き（パワーラック→胸）、変えられる。編集しても覚えた次の重さは消えない', async ({ page }) => {
  await openApp(page);
  await dbPut(page, 'exercises', [{ ...(await dbGet(page, 'exercises', 'chest-press') as object), nextWeights: { '35': 40 } }]);
  await tab(page, '設定');
  await page.getByLabel('メニューA（押す日）に種目を追加').selectOption('__new');
  const sheet = page.getByRole('dialog', { name: '新しい種目' });
  await sheet.getByLabel('種目名').fill('パワーラック ベンチプレス');
  const cat = sheet.getByRole('group', { name: '分類' });
  await expect(cat.getByRole('button', { name: '胸' })).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('.list-row', { hasText: 'パワーラック ベンチプレス' })).toContainText('胸・');

  // 「＋ 種目を追加」の一覧は分類ごとに分かれている
  const groups = await page.getByLabel('メニューB（引く日）に種目を追加').locator('optgroup').evaluateAll((els) => els.map((e) => e.getAttribute('label')));
  expect(groups).toEqual(expect.arrayContaining(['胸', '肩', '脚']));

  // 既存の種目を編集して分類を変えても、次の重さは残る
  await page.locator('.list-row', { hasText: /^チェストプレス/ }).getByRole('button').first().click();
  const edit = page.getByRole('dialog', { name: '種目を編集' });
  await edit.getByRole('group', { name: '分類' }).getByRole('button', { name: 'その他' }).click();
  await edit.getByRole('button', { name: '保存' }).click();
  await expect.poll(() => dbGet(page, 'exercises', 'chest-press')).toMatchObject({ category: 'その他', nextWeights: { '35': 40 } });
});

test('筋トレ：1つの枠（胸）で、選べる種目からその日にやる種目を選べる。設定で枠に種目を足せる', async ({ page }) => {
  await openApp(page);
  // 設定：チェストプレスの枠に「新しい種目」でパワーラックを足す（メニューの枠の数は増えない）
  await tab(page, '設定');
  const slot = page.getByTestId('slot-chest-press');
  await expect(slot.locator('.slot-chip')).toHaveText(['ケーブル チェストプレス✕']); // 初めから選べる種目
  await slot.getByLabel('チェストプレスの枠に種目を追加').selectOption('__new');
  const sheet = page.getByRole('dialog', { name: '新しい種目' });
  await sheet.getByLabel('種目名').fill('パワーラック');
  await sheet.getByRole('button', { name: '保存' }).click();
  await expect(slot.locator('.slot-chip', { hasText: 'パワーラック' })).toHaveCount(1);
  await expect.poll(async () => ((await dbGet(page, 'settings', 'main')) as { menuA: string[] }).menuA.length).toBe(6);

  // 今日：胸の枠でパワーラックを選ぶと、その種目の入力になる
  await tab(page, '今日');
  await mode(page, '筋トレ');
  const choices = page.getByRole('group', { name: '胸：今日やる種目' });
  await expect(choices.getByRole('button')).toHaveText(['チェストプレス', 'ケーブル チェストプレス', 'パワーラック']);
  await choices.getByRole('button', { name: 'パワーラック' }).click();
  await expect(choices.getByRole('button', { name: 'パワーラック' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('パワーラック 1セット目の重さ')).toBeVisible();
  await expect.poll(async () => ((await dbGet(page, 'days', '2026-09-28')) as { swaps?: Record<string, string> })?.swaps).toMatchObject({ 'chest-press': expect.any(String) });
  // チェストプレスに戻せる
  await choices.getByRole('button', { name: 'チェストプレス', exact: true }).click();
  await expect(page.getByLabel('チェストプレス 1セット目の重さ')).toBeVisible();

  // 枠から外すときも確認が出る
  await tab(page, '設定');
  await slot.getByRole('button', { name: 'パワーラックをチェストプレスの枠から外す' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '外す' }).click();
  await expect(slot.locator('.slot-chip', { hasText: 'パワーラック' })).toHaveCount(0);
});

test('筋トレ：前に別の枠として足した種目を、ほかの枠の選べる種目にしても二重に出ない', async ({ page }) => {
  await openApp(page);
  const settings = (await dbGet(page, 'settings', 'main')) as Record<string, unknown>;
  await dbPut(page, 'settings', [{ ...settings, menuA: [...(settings.menuA as string[]), 'cable-chest-press'] }]);
  await page.reload();
  await mode(page, '筋トレ');
  await expect(page.locator('[data-testid="workout"] .ex-card')).toHaveCount(6);
  await expect(page.getByRole('group', { name: '胸：今日やる種目' })).toHaveCount(1);
  await expect(page.getByRole('tab', { name: /^筋トレ/ })).toContainText('0/18');
  // 設定の「＋ 種目を追加」にも、もう出ない
  await tab(page, '設定');
  const add = page.getByLabel('メニューA（押す日）に種目を追加');
  await expect(add.locator('option', { hasText: 'ケーブル チェストプレス' })).toHaveCount(0);
});
