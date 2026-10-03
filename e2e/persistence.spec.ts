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

  // 提案をそのまま「これを食べた」
  const lunch = page.getByTestId('meal-lunch');
  await lunch.getByRole('button', { name: 'これを食べた' }).click();
  await expect(lunch.getByText('✓ 食べた')).toBeVisible();

  // 体重
  await enterWeight(page, '71.6');

  // レッグプレス 1セット目
  const lp = page.getByTestId('exercise-leg-press');
  await lp.getByLabel('レッグプレス 1セット目の重さ').fill('60');
  await lp.getByLabel('レッグプレス 1セット目の回数').fill('12');
  await lp.getByRole('button', { name: '1セット目を完了' }).click();
  await expect(page.getByRole('timer')).toBeVisible(); // 休憩タイマーが自動で動く

  await page.reload();

  await expect(page.getByTestId('meal-lunch').getByText('✓ 食べた')).toBeVisible();
  const lp2 = page.getByTestId('exercise-leg-press');
  await expect(lp2.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('60');
  await expect(lp2.getByLabel('レッグプレス 1セット目の回数')).toHaveValue('12');
  await expect(lp2.getByRole('button', { name: '1セット目を完了' })).toHaveAttribute('aria-pressed', 'true');
  await expect(await weightInput(page)).toHaveValue('71.6');
  await tab(page, '今日');

  // 記録タブにも反映される
  await page.getByRole('navigation').getByRole('button', { name: '記録' }).click();
  // 種目ごとの推移：最初は折りたたまれていて、開くとトレした種目が選ばれた状態で前回の記録が出る
  await expect(page.getByRole('group', { name: 'メニューA（押す日）' })).toBeHidden();
  await expect(page.getByTestId('exercise-history')).toContainText('60×12');
  await page.getByText('メニューA（押す日）').click();
  await page.getByText('メニューB（引く日）').click();
  const chip = page.getByRole('group', { name: 'メニューA（押す日）' }).getByRole('button', { name: /レッグプレス/ });
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

  // 昼：セブンに絞った提案をそのまま食べた
  const lunch = page.getByTestId('meal-lunch');
  await lunch.getByRole('button', { name: 'セブン', exact: true }).click();
  await expect(lunch).toContainText('セブン・提案');
  await lunch.getByRole('button', { name: 'これを食べた' }).click();

  // 夜：外食を手入力
  const dinner = page.getByTestId('meal-dinner');
  await dinner.getByRole('button', { name: '外食', exact: true }).click();
  await expect(dinner).toContainText('外食・提案');
  await dinner.getByRole('button', { name: '食べたものを選ぶ' }).click();
  const dialog = page.getByRole('dialog').first();
  await expect(dialog.getByRole('group', { name: 'お店' }).getByRole('button', { name: '外食・自炊' })).toHaveAttribute('aria-pressed', 'true');
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

  // その日の合計（昼のセブン提案＋夜の外食）
  const progress = page.getByTestId('progress');
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

test('期間（いつからいつまで）を今日の画面から変更でき、リロード後も残る', async ({ page }) => {
  await openApp(page);
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
  const card = page.getByTestId('exercise-leg-press');
  await expect(card).toContainText('今日は+5kg（46kg）'); // まだ覚えていないので目安の幅
  await expect(card.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('46');

  await card.getByRole('button', { name: /マシンの次の重さが違うときは/ }).click();
  await card.getByRole('button', { name: '45kg', exact: true }).click();
  await card.getByRole('button', { name: '保存', exact: true }).click();
  await expect(card).toContainText('今日は+4kg（45kg）');
  await expect(card.getByRole('button', { name: '41kgの次は45kg ✎' })).toBeVisible();
  await expect(card.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('45');
  await expect.poll(() => dbGet(page, 'exercises', 'leg-press')).toMatchObject({ nextWeights: { '41': 45 } });

  await page.reload();
  await expect(page.getByTestId('exercise-leg-press')).toContainText('今日は+4kg（45kg）');
});
