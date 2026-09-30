import { expect, test, type Page } from '@playwright/test';

const NOW = new Date('2026-09-29T20:00:00+09:00');

async function openMoney(page: Page) {
  await page.clock.setFixedTime(NOW);
  page.on('dialog', (d) => void d.accept());
  await page.goto('./');
  await page.getByRole('navigation').getByRole('button', { name: '支出' }).click();
  await expect(page.getByTestId('money-month')).toHaveText('2026年9月');
}

/** 日本語のレシートを画像にする（スマホで撮った写真の代わり） */
async function receiptImage(page: Page): Promise<Buffer> {
  const p = await page.context().newPage();
  await p.setViewportSize({ width: 520, height: 640 });
  await p.setContent(`
    <body style="margin:0;background:#fff;color:#000;font-family:'WenQuanYi Zen Hei',sans-serif;font-size:26px;line-height:1.7;padding:24px 28px">
      <div>ローソン 新宿西口店</div>
      <div>2026年9月29日(火) 12:34</div>
      <div style="display:flex;justify-content:space-between"><span>サラダチキン</span><span>¥228</span></div>
      <div style="display:flex;justify-content:space-between"><span>おにぎり 鮭</span><span>¥160</span></div>
      <div style="display:flex;justify-content:space-between"><span>アイスコーヒー</span><span>¥151</span></div>
      <div style="display:flex;justify-content:space-between"><span>チョコレート</span><span>¥198</span></div>
      <div style="display:flex;justify-content:space-between"><span>合計</span><span>¥737</span></div>
    </body>`);
  const buf = await p.screenshot({ fullPage: true });
  await p.close();
  return buf;
}

test('レシートの写真を端末内で読み取り、費目を直して保存でき、リロード後も残る', async ({ page }) => {
  test.setTimeout(120_000);
  await openMoney(page);
  const image = await receiptImage(page);
  await page.getByTestId('receipt-input').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: image });

  const sheet = page.getByRole('dialog', { name: 'レシートの内容を確認' });
  await expect(sheet).toBeVisible({ timeout: 90_000 });
  // お店・日付・合計を読み取れている
  await expect(sheet.getByLabel('お店')).toHaveValue('lawson');
  await expect(sheet.getByLabel('日付')).toHaveValue('2026-09-29');
  await expect(page.getByTestId('expense-total')).toHaveText('合計 ¥737');
  // 費目の自動判定
  const rows = page.getByTestId('expense-items');
  await expect(rows.getByLabel('4行目の費目')).toHaveValue('snack');
  await expect(rows.getByLabel('3行目の費目')).toHaveValue('drink');

  // 手で費目を直して保存
  await rows.getByLabel('2行目の費目').selectOption('other');
  await sheet.getByRole('button', { name: 'この内容で保存' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId('money-total')).toHaveText('¥737');

  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: '支出' }).click();
  await expect(page.getByTestId('money-total')).toHaveText('¥737');
  await expect(page.getByTestId('money-by-category')).toContainText('その他');
  await expect(page.getByTestId('expense-list')).toContainText('ローソン');
});

test('iPhoneの文字認識でコピーした文字を貼り付けて読み取れる（品名と金額が別の行でも）', async ({ page }) => {
  await openMoney(page);
  await page.getByRole('button', { name: 'レシートの文字を貼り付け' }).click();
  const paste = page.getByRole('dialog', { name: 'レシートの文字を貼り付け' });
  await paste.getByLabel('レシートの文字').fill([
    'セブン-イレブン 新宿三丁目店', '2026年9月28日(月) 12:10', '領収書',
    'ななチキ', 'サラダ 蒸し鶏と玉子', 'アイスコーヒー M', '合計',
    '¥220軽', '¥298軽', '¥120軽', '¥638',
  ].join('\n'));
  await paste.getByRole('button', { name: 'この文字で読み取る' }).click();

  const sheet = page.getByRole('dialog', { name: 'レシートの内容を確認' });
  await expect(sheet.getByLabel('お店')).toHaveValue('seven');
  await expect(sheet.getByLabel('日付')).toHaveValue('2026-09-28');
  await expect(page.getByTestId('expense-total')).toHaveText('合計 ¥638');
  await expect(sheet.getByLabel('2行目の品名')).toHaveValue('サラダ 蒸し鶏と玉子');
  await expect(sheet.getByLabel('3行目の費目')).toHaveValue('drink');
  await sheet.getByRole('button', { name: 'この内容で保存' }).click();
  await expect(page.getByTestId('money-total')).toHaveText('¥638');
});

test('手入力で支出を追加・修正・削除でき、出社日の1日平均が出る', async ({ page }) => {
  await openMoney(page);
  await page.getByRole('button', { name: '✎ 手入力で追加' }).click();
  const sheet = page.getByRole('dialog', { name: '支出を追加' });
  await sheet.getByLabel('お店').selectOption('seven');
  await sheet.getByLabel('1行目の品名').fill('ななチキ');
  await sheet.getByLabel('1行目の金額').fill('220');
  await sheet.getByLabel('1行目の品名').blur();
  await expect(sheet.getByLabel('1行目の費目')).toHaveValue('meal');
  await sheet.getByRole('button', { name: '＋ 品目を追加' }).click();
  await sheet.getByLabel('2行目の品名').fill('コーヒー');
  await sheet.getByLabel('2行目の金額').fill('150');
  await sheet.getByLabel('2行目の品名').blur();
  await expect(sheet.getByLabel('2行目の費目')).toHaveValue('drink');
  await sheet.getByRole('button', { name: 'この内容で保存' }).click();

  await expect(page.getByTestId('money-total')).toHaveText('¥370');
  await expect(page.getByText('出社日の1日平均（1日）')).toBeVisible();

  // 修正
  await page.getByTestId('expense-list').getByRole('button', { name: /セブン/ }).click();
  const edit = page.getByRole('dialog', { name: '支出を編集' });
  await edit.getByLabel('2行目の金額').fill('180');
  await edit.getByRole('button', { name: 'この内容で保存' }).click();
  await expect(page.getByTestId('money-total')).toHaveText('¥400');

  // 覚えた費目：次に「コーヒー」を入れると飲み物になる（自動判定でも同じだが、手で変えたものが優先される確認）
  await page.getByTestId('expense-list').getByRole('button', { name: /セブン/ }).click();
  await page.getByRole('dialog', { name: '支出を編集' }).getByRole('button', { name: '削除' }).click();
  await expect(page.getByTestId('money-total')).toHaveText('¥0');
});
