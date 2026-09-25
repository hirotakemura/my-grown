import { afterEach, describe, expect, it } from 'vitest';
import { AppDB } from '../src/db';
import { exportBackup, importBackup, parseBackup } from '../src/lib/backup';

const dbs: AppDB[] = [];
const open = (name: string) => { const d = new AppDB(name); dbs.push(d); return d; };
afterEach(async () => { for (const d of dbs.splice(0)) await d.delete(); });

describe('バックアップ', () => {
  it('書き出したJSONを別の端末（別DB）に復元すると同じ内容になる', async () => {
    const src = open('backup-src');
    await src.days.put({ date: '2026-09-20', weight: 72 });
    await src.mySets.put({ id: 's1', name: '昼の定番', items: [{ productId: 'salad-chicken', qty: 1 }] });
    await src.settings.update('main', { goalDate: '2026-11-30', trainKcal: 2100 });
    const json = JSON.stringify(await exportBackup(src));

    const dst = open('backup-dst');
    await dst.days.put({ date: '2026-01-01', weight: 99 }); // 復元で消えるはずのデータ
    await importBackup(dst, parseBackup(json));

    expect(await dst.days.toArray()).toEqual([{ date: '2026-09-20', weight: 72 }]);
    expect(await dst.mySets.get('s1')).toMatchObject({ name: '昼の定番' });
    expect((await dst.settings.get('main'))?.trainKcal).toBe(2100);
    expect(await dst.products.count()).toBe(await src.products.count());
  });

  it('ほかのJSONは受け付けない', () => {
    expect(() => parseBackup('not json')).toThrow('JSON');
    expect(() => parseBackup('{"foo":1}')).toThrow('バックアップファイルではありません');
    expect(() => parseBackup('{"app":"my-grown","version":1,"tables":{"settings":[]}}')).toThrow('設定データ');
  });

  it('復元が途中で失敗したら、元のデータはそのまま残る', async () => {
    const d = open('backup-rollback');
    await d.days.put({ date: '2026-09-21', weight: 71 });
    const bad = parseBackup(JSON.stringify({
      app: 'my-grown', version: 1, exportedAt: '',
      tables: { settings: [{ id: 'main' }], days: [{ noKey: true }] }, // days の主キーがない
    }));
    await expect(importBackup(d, bad)).rejects.toThrow();
    expect(await d.days.get('2026-09-21')).toMatchObject({ weight: 71 });
    expect(await d.products.count()).toBeGreaterThan(0);
  });
});
