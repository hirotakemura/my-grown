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

async function enterWeight(page: Page, value: string) {
  await page.locator('#weight').fill(value);
  await page.locator('#weight').press('Enter');
  await expect.poll(() => dbGet(page, 'days', '2026-09-28')).toMatchObject({ weight: Number(value) });
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
  await expect(page.locator('#weight')).toHaveValue('71.6');
  const lp2 = page.getByTestId('exercise-leg-press');
  await expect(lp2.getByLabel('レッグプレス 1セット目の重さ')).toHaveValue('60');
  await expect(lp2.getByLabel('レッグプレス 1セット目の回数')).toHaveValue('12');
  await expect(lp2.getByRole('button', { name: '1セット目を完了' })).toHaveAttribute('aria-pressed', 'true');

  // 記録タブにも反映される
  await page.getByRole('button', { name: '記録' }).click();
  await expect(page.getByTestId('total-volume')).toHaveText('720 kg');
});

test('コンビニの商品から複数選んで記録し、マイセット・商品の編集もリロード後に残る', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('meal-dinner').getByRole('button', { name: '食べたものを選ぶ' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'チキン・肉' }).click();
  await dialog.getByRole('button', { name: /^サラダチキン プレーン 目安/ }).click();
  await dialog.getByRole('button', { name: 'おにぎり' }).click();
  await dialog.getByRole('button', { name: /^おにぎり 鮭 目安/ }).click();
  await dialog.getByRole('button', { name: '1つ増やす' }).click(); // 鮭×2
  await expect(dialog.getByTestId('picker-total')).toContainText('3品　485kcal・P34 F4.5 C76.5');

  await dialog.getByRole('button', { name: 'マイセット保存' }).click();
  await dialog.getByRole('button', { name: '食べた', exact: true }).click();
  await expect(dialog).toBeHidden();

  // パッケージの数値で上書き
  await page.getByRole('button', { name: '設定' }).click();
  await page.getByRole('button', { name: '商品の追加・編集・削除' }).click();
  await page.getByRole('button', { name: 'ゆで卵を編集', exact: true }).click();
  await page.getByLabel('たんぱく質（g）').fill('6.5');
  await page.getByRole('button', { name: '保存' }).click();
  await expect.poll(() => dbGet(page, 'products', 'boiled-egg')).toMatchObject({ protein: 6.5, estimate: false });

  await page.reload();

  await expect(page.getByTestId('meal-dinner')).toContainText('おにぎり 鮭 ×2');
  await expect(page.getByTestId('meal-dinner')).toContainText('合計 485kcal・P34 F4.5 C76.5');
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
  await page.getByRole('button', { name: '記録' }).click();
  const row = page.getByTestId('daily-pfc').getByRole('row', { name: /9\/28\(月\)/ });
  await expect(row).toBeVisible();
  const cells = await row.getByRole('cell').allInnerTexts();
  expect(Number(cells[1])).toBeGreaterThan(900);
  expect(Number(cells[3])).toBeGreaterThan(35);
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
  await expect(p2.locator('#weight')).toHaveValue('');
  await p2.getByRole('button', { name: '設定' }).click();
  await p2.getByTestId('restore-input').setInputFiles(path);
  await p2.getByRole('button', { name: '今日' }).click();
  await expect(p2.locator('#weight')).toHaveValue('70.9');
  await p2.reload();
  await expect(p2.locator('#weight')).toHaveValue('70.9');
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
  await expect(page.locator('#weight')).toHaveValue('71.2');
  await context.setOffline(false);
});

test('manifest がホーム画面追加に必要な内容を持っている', async ({ request }) => {
  const res = await request.get('manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({ display: 'standalone', lang: 'ja' });
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});
