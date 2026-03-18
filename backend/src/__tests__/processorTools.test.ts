import { describe, it, expect, beforeEach } from 'vitest';
import { runMigrations } from '../db/migrations.js';
import { getExistingRecord } from '../db/queries.js';
import {
  upsertNewRelease,
  upsertBackInStock,
  upsertNewsItem,
} from '../agents/tools/processorTools.js';

// Migrations run once before each test block; DB_PATH=':memory:' is set in vitest.config.ts
beforeEach(() => {
  runMigrations();
});

// ─── upsertNewRelease ─────────────────────────────────────────────────────────

describe('upsertNewRelease', () => {
  it('inserts a new item and returns action=inserted', () => {
    const result = upsertNewRelease({
      title: 'Pop! Spider-Man',
      product_line: 'Marvel',
      price: '$12.99',
      product_url: 'https://funko.com/products/spider-man',
    });

    expect(result.action).toBe('inserted');
    expect(result.title).toBe('Pop! Spider-Man');
    expect(result.external_id).toBeTruthy();
  });

  it('skips an identical item on second insert', () => {
    const item = {
      title: 'Pop! Spider-Man',
      price: '$12.99',
      product_url: 'https://funko.com/products/spider-man',
    };

    upsertNewRelease(item);
    const result = upsertNewRelease(item);

    expect(result.action).toBe('skipped');
  });

  it('returns action=updated when price changes', () => {
    const item = {
      title: 'Pop! Spider-Man',
      price: '$12.99',
      product_url: 'https://funko.com/products/spider-man',
    };

    upsertNewRelease(item);
    const result = upsertNewRelease({ ...item, price: '$14.99' });

    expect(result.action).toBe('updated');
  });

  it('returns action=updated when available_date changes', () => {
    const item = {
      title: 'Pop! Thor',
      product_url: 'https://funko.com/products/thor',
      available_date: '2026-04-01',
    };

    upsertNewRelease(item);
    const result = upsertNewRelease({ ...item, available_date: '2026-05-01' });

    expect(result.action).toBe('updated');
  });

  it('uses title hash as external_id when no product_url is provided', () => {
    const result = upsertNewRelease({ title: 'Pop! No URL Item' });

    expect(result.action).toBe('inserted');
    expect(result.external_id).toHaveLength(12);
  });

  it('treats two different URLs as separate records', () => {
    const r1 = upsertNewRelease({ title: 'Pop! A', product_url: 'https://funko.com/a' });
    const r2 = upsertNewRelease({ title: 'Pop! B', product_url: 'https://funko.com/b' });

    expect(r1.action).toBe('inserted');
    expect(r2.action).toBe('inserted');
    expect(r1.external_id).not.toBe(r2.external_id);
  });

  it('persists the record so getExistingRecord finds it', () => {
    const result = upsertNewRelease({
      title: 'Pop! Iron Man',
      product_url: 'https://funko.com/products/iron-man',
    });

    const record = getExistingRecord('new_releases', result.external_id);
    expect(record).not.toBeNull();
    expect(record!['title']).toBe('Pop! Iron Man');
  });
});

// ─── upsertBackInStock ────────────────────────────────────────────────────────

describe('upsertBackInStock', () => {
  it('inserts a new back-in-stock item', () => {
    const result = upsertBackInStock({
      title: 'Pop! Batman',
      price: '$11.99',
      product_url: 'https://funko.com/products/batman',
      restocked_at: '2026-03-18T00:00:00.000Z',
    });

    expect(result.action).toBe('inserted');
  });

  it('skips an unchanged item on second call', () => {
    const item = {
      title: 'Pop! Batman',
      price: '$11.99',
      product_url: 'https://funko.com/products/batman',
    };

    upsertBackInStock(item);
    const result = upsertBackInStock(item);

    expect(result.action).toBe('skipped');
  });

  it('updates when price changes', () => {
    const item = {
      title: 'Pop! Batman',
      price: '$11.99',
      product_url: 'https://funko.com/products/batman',
    };

    upsertBackInStock(item);
    const result = upsertBackInStock({ ...item, price: '$9.99' });

    expect(result.action).toBe('updated');
  });
});

// ─── upsertNewsItem ───────────────────────────────────────────────────────────

describe('upsertNewsItem', () => {
  it('inserts a new news item', () => {
    const result = upsertNewsItem({
      headline: 'New Funko Exclusive Revealed!',
      summary: 'Check out the latest exclusive drop.',
      article_url: 'https://funko.com/blogs/news/new-exclusive',
      category: 'Exclusives',
    });

    expect(result.action).toBe('inserted');
    expect(result.title).toBe('New Funko Exclusive Revealed!');
  });

  it('skips unchanged news on second call', () => {
    const item = {
      headline: 'New Funko Exclusive Revealed!',
      article_url: 'https://funko.com/blogs/news/new-exclusive',
    };

    upsertNewsItem(item);
    const result = upsertNewsItem(item);

    expect(result.action).toBe('skipped');
  });

  it('updates when headline changes', () => {
    const item = {
      headline: 'Funko News: Spring Drop',
      article_url: 'https://funko.com/blogs/news/spring-drop',
    };

    upsertNewsItem(item);
    const result = upsertNewsItem({ ...item, headline: 'Funko News: Spring Drop (Updated)' });

    expect(result.action).toBe('updated');
  });

  it('updates when summary changes', () => {
    const item = {
      headline: 'Funko News: Fall Drop',
      summary: 'Original summary.',
      article_url: 'https://funko.com/blogs/news/fall-drop',
    };

    upsertNewsItem(item);
    const result = upsertNewsItem({ ...item, summary: 'Updated summary with more detail.' });

    expect(result.action).toBe('updated');
  });

  it('falls back to title hash when no article_url is provided', () => {
    const result = upsertNewsItem({ headline: 'Breaking Funko News' });

    expect(result.action).toBe('inserted');
    expect(result.external_id).toHaveLength(12);
  });
});
