import db from './client.js';
import type { NewRelease, BackInStockItem, NewsItem } from '../types/funko.js';

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getNewReleases(): NewRelease[] {
  return db.prepare('SELECT * FROM new_releases ORDER BY first_seen_at DESC').all() as NewRelease[];
}

export function getBackInStock(): BackInStockItem[] {
  return db.prepare('SELECT * FROM back_in_stock ORDER BY first_seen_at DESC').all() as BackInStockItem[];
}

export function getNews(): NewsItem[] {
  return db.prepare('SELECT * FROM news_updates ORDER BY first_seen_at DESC').all() as NewsItem[];
}

export function getLastFetched(): { last_fetched_at: string | null; status: string | null } {
  const row = db.prepare(
    "SELECT ran_at as last_fetched_at, status FROM fetch_log WHERE status = 'success' ORDER BY ran_at DESC LIMIT 1"
  ).get() as { last_fetched_at: string; status: string } | undefined;
  return { last_fetched_at: row?.last_fetched_at ?? null, status: row?.status ?? null };
}

// ─── Dedup Checks (used by Agent 2 tools) ─────────────────────────────────────

export function getExistingRecord(table: string, external_id: string): Record<string, unknown> | null {
  const allowedTables = ['new_releases', 'back_in_stock', 'news_updates'];
  if (!allowedTables.includes(table)) throw new Error(`Invalid table: ${table}`);
  const row = db.prepare(`SELECT * FROM "${table}" WHERE external_id = ?`).get(external_id);
  return (row as Record<string, unknown>) ?? null;
}

// ─── Inserts / Updates ───────────────────────────────────────────────────────

export function saveNewRecord(table: string, record: Record<string, unknown>): void {
  const allowedTables = ['new_releases', 'back_in_stock', 'news_updates'];
  if (!allowedTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  const cols = Object.keys(record);
  const placeholders = cols.map(() => '?').join(', ');
  const values = Object.values(record);

  db.prepare(
    `INSERT OR IGNORE INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders})`
  ).run(...values);
}

export function updateRecord(
  table: string,
  external_id: string,
  fields: Record<string, unknown>
): void {
  const allowedTables = ['new_releases', 'back_in_stock', 'news_updates'];
  if (!allowedTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  // Exclude external_id and first_seen_at from updates
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([k]) => k !== 'external_id' && k !== 'first_seen_at')
  );
  const cols = Object.keys(safeFields);
  if (cols.length === 0) return;

  const setClause = cols.map((c) => `${c} = ?`).join(', ');
  db.prepare(
    `UPDATE "${table}" SET ${setClause} WHERE external_id = ?`
  ).run(...Object.values(safeFields), external_id);
}

export function logFetchRun(
  status: 'success' | 'error',
  error_msg?: string
): void {
  db.prepare(
    'INSERT INTO fetch_log (ran_at, status, error_msg) VALUES (?, ?, ?)'
  ).run(new Date().toISOString(), status, error_msg ?? null);
}
