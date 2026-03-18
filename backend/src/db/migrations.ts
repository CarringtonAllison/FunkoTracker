import db from './client.js';

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fetch_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ran_at    TEXT NOT NULL,
      status    TEXT NOT NULL,
      error_msg TEXT
    );

    CREATE TABLE IF NOT EXISTS new_releases (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id    TEXT UNIQUE NOT NULL,
      title          TEXT NOT NULL,
      product_line   TEXT,
      price          TEXT,
      image_url      TEXT,
      product_url    TEXT,
      available_date TEXT,
      first_seen_at  TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS back_in_stock (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id   TEXT UNIQUE NOT NULL,
      title         TEXT NOT NULL,
      product_line  TEXT,
      price         TEXT,
      image_url     TEXT,
      product_url   TEXT,
      restocked_at  TEXT,
      first_seen_at TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS news_updates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id   TEXT UNIQUE NOT NULL,
      headline      TEXT NOT NULL,
      summary       TEXT,
      article_url   TEXT,
      published_at  TEXT,
      category      TEXT,
      first_seen_at TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );
  `);

  console.log('[DB] Migrations complete.');
}
