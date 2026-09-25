import { type AppDB, TABLE_NAMES } from '../db';

export const BACKUP_APP_ID = 'my-grown';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export async function exportBackup(db: AppDB): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  await db.transaction('r', TABLE_NAMES.map((n) => db.table(n)), async () => {
    for (const name of TABLE_NAMES) tables[name] = await db.table(name).toArray();
  });
  return { app: BACKUP_APP_ID, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読み込めませんでした');
  }
  const b = data as Partial<BackupFile>;
  if (!b || b.app !== BACKUP_APP_ID || typeof b.tables !== 'object' || b.tables === null) {
    throw new Error('このアプリのバックアップファイルではありません');
  }
  if ((b.version ?? 0) > BACKUP_VERSION) throw new Error('新しいバージョンのバックアップです。アプリを更新してください');
  for (const name of TABLE_NAMES) {
    const rows = (b.tables as Record<string, unknown>)[name];
    if (rows !== undefined && !Array.isArray(rows)) throw new Error(`${name} の形式が正しくありません`);
  }
  if (!Array.isArray(b.tables.settings) || b.tables.settings.length === 0) {
    throw new Error('設定データが入っていません');
  }
  return b as BackupFile;
}

/** バックアップの内容で全データを置き換える（途中で失敗したら何も変えない） */
export async function importBackup(db: AppDB, backup: BackupFile): Promise<void> {
  await db.transaction('rw', TABLE_NAMES.map((n) => db.table(n)), async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name);
      await table.clear();
      const rows = backup.tables[name];
      if (rows?.length) await table.bulkPut(rows);
    }
  });
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `my-grown-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}
